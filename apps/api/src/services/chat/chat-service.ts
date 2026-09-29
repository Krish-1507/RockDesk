import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AIProvider,
  AssignableUser,
  ChatMessageRecord,
  ChatRole,
  PendingTicket,
  TicketAnalysis,
  TicketPriority,
  TicketRecord,
} from "@chat-to-ticket/shared";
import { CHAT_HISTORY_LIMIT } from "@chat-to-ticket/shared";
import {
  clearPendingState,
  findMessageByClientId,
  getSession,
  insertMessage,
  latestAssistantAfter,
  latestTicketForSession,
  listMessages,
  savePendingState,
} from "../../repositories/chat-repository.js";
import { createTicketAtomic, getTicketById } from "../../repositories/ticket-repository.js";
import { listAssignableUsers } from "../../repositories/user-repository.js";
import { resolveAnswerToUser, resolveAssignee } from "./assignee-resolver.js";
import { isValidTimezone, resolveDueDate, todayInTimezone } from "./date-resolver.js";
import { buildClarification, buildConfirmation, CANCELLED_MESSAGE, GREETING_FALLBACK, type Lang } from "./responder.js";
import { AppError } from "../../utils/errors.js";

export interface ProcessMessageInput {
  sessionId: string;
  message: string;
  timezone: string;
  clientMessageId?: string | undefined;
}

export interface ChatOutcome {
  sessionId: string;
  assistantMessage: ChatMessageRecord;
  state: "idle" | "awaiting_clarification";
  draft: PendingTicket | null;
  ticket: TicketRecord | null;
  disambiguationOptions?: AssignableUser[] | undefined;
}

const AFFIRMATIVE = /^(yes|yeah|yep|yup|sure|ok|okay|correct|right|confirm|confirmed|haan|han|ha|ji|s[ií]|sí|claro|vale|oui|是的|对|好|نعم|أجل|हां)\b[.!]*$/i;

function isAffirmative(text: string): boolean {
  return AFFIRMATIVE.test(text.trim().toLowerCase());
}

function langFamily(language: string): Lang {
  const l = language.toLowerCase();
  if (l.startsWith("hi")) return l.includes("latn") ? "hinglish" : "hi";
  if (l.startsWith("es")) return "es";
  if (l.startsWith("ar")) return "ar";
  if (l.startsWith("zh")) return "zh";
  return "en";
}

export async function processMessage(
  db: SupabaseClient,
  ai: AIProvider,
  input: ProcessMessageInput,
): Promise<ChatOutcome> {
  const timezone = isValidTimezone(input.timezone) ? input.timezone : "Asia/Kolkata";
  const text = input.message.trim();
  if (!text) throw new AppError("VALIDATION_ERROR", 400, "Message must not be empty.");

  // Idempotency: a retried submission with the same clientMessageId returns the stored outcome.
  if (input.clientMessageId) {
    const existing = await findMessageByClientId(db, input.sessionId, input.clientMessageId);
    if (existing) {
      return rebuildOutcome(db, input.sessionId, existing);
    }
  }

  const userMsg = await insertMessage(db, {
    sessionId: input.sessionId,
    role: "user",
    content: text,
    clientMessageId: input.clientMessageId,
  });

  const session = await getSession(db, input.sessionId);
  if (!session) throw new AppError("NOT_FOUND", 404, "Chat session not found.");
  const draft = session.pendingTicket;
  const users = await listAssignableUsers(db);
  const history = await listMessages(db, input.sessionId, CHAT_HISTORY_LIMIT + 1);
  const recentConversation: Array<{ role: ChatRole; content: string }> = history
    .filter((m) => m.id !== userMsg.id)
    .slice(-CHAT_HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content }));

  const today = todayInTimezone(timezone);
  const nowIso = new Date().toISOString();

  let analysis: TicketAnalysis;
  try {
    analysis = await ai.analyzeTicket({
      nowIso,
      todayInTimezone: today,
      timezone,
      assignableUsers: users,
      recentConversation,
      pendingDraft: draft,
      latestMessage: text,
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const assistant = await insertMessage(db, {
      sessionId: input.sessionId,
      role: "assistant",
      content: "I couldn't process that right now. Your message is safe. Please try again.",
      detectedLanguage: draft?.language ?? "en",
    });
    if (code === "AI_TIMEOUT") throw new AppError("AI_TIMEOUT", 504, "The AI request timed out.", { assistantMessage: assistant });
    if (code === "AI_INVALID_OUTPUT") throw new AppError("AI_INVALID_OUTPUT", 502, "The AI response was unusable. Please try again.", { assistantMessage: assistant });
    throw new AppError("AI_UNAVAILABLE", 502, "The AI service is unavailable. Please try again.", { assistantMessage: assistant });
  }

  await persistDetectedLanguage(db, userMsg.id, analysis.language);

  if (analysis.intent === "cancel_pending_ticket") {
    await clearPendingState(db, input.sessionId);
    const assistant = await insertMessage(db, {
      sessionId: input.sessionId,
      role: "assistant",
      content: CANCELLED_MESSAGE[langFamily(analysis.language)] ?? CANCELLED_MESSAGE.en,
      detectedLanguage: analysis.language,
    });
    return { sessionId: input.sessionId, assistantMessage: assistant, state: "idle", draft: null, ticket: null };
  }

  if (analysis.intent === "general_chat") {
    // Keep any pending draft untouched; just chat. If none pending, reply conversationally.
    const reply = analysis.userResponse?.trim() || GREETING_FALLBACK[langFamily(analysis.language)] || GREETING_FALLBACK.en;
    const assistant = await insertMessage(db, {
      sessionId: input.sessionId,
      role: "assistant",
      content: reply,
      detectedLanguage: analysis.language,
    });
    const refreshed = await getSession(db, input.sessionId);
    const stillPending = refreshed?.pendingTicket ?? null;
    return {
      sessionId: input.sessionId,
      assistantMessage: assistant,
      state: stillPending ? "awaiting_clarification" : "idle",
      draft: stillPending,
      ticket: null,
    };
  }

  // intent === create_ticket → backend-owned merge + resolution.
  return handleTicketIntent(db, {
    sessionId: input.sessionId,
    text,
    userMsgId: userMsg.id,
    analysis,
    draft,
    users,
    today,
    timezone,
  });
}

interface TicketIntentContext {
  sessionId: string;
  text: string;
  userMsgId: string;
  analysis: TicketAnalysis;
  draft: PendingTicket | null;
  users: AssignableUser[];
  today: string;
  timezone: string;
}

async function handleTicketIntent(db: SupabaseClient, ctx: TicketIntentContext): Promise<ChatOutcome> {
  const { analysis, draft } = ctx;
  const lang = langFamily(analysis.language);

  const title = analysis.normalizedEnglishTitle ?? draft?.title ?? null;
  const description = analysis.description ?? draft?.description ?? null;
  const originalTitle = draft?.originalTitle ?? ctx.text.slice(0, 400);
  const sourceMessageId = draft?.sourceMessageId ?? ctx.userMsgId;
  const priority: TicketPriority = analysis.priority ?? draft?.priority ?? "Medium";
  const tags = analysis.tags.length > 0 ? analysis.tags : (draft?.tags ?? []);

  // --- Assignee resolution (backend decides, never the model) ---
  let assigneeId: string | null = draft?.assigneeId ?? null;
  let explicitlyUnassigned = draft?.explicitlyUnassigned ?? false;
  let disambiguationOptions: AssignableUser[] = draft?.disambiguationOptions ?? [];
  let assigneeMissing = false;
  let assigneeProblem: { kind: "ambiguous" | "not_found"; options?: AssignableUser[]; candidate?: string } | null = null;

  if (explicitlyUnassigned) {
    // stays unassigned unless the user names someone now
  } else if (draft?.disambiguationOptions?.length && !assigneeId) {
    const picked = await resolveAnswerToUser(db, ctx.text, draft.disambiguationOptions);
    if (picked) {
      assigneeId = picked.id;
      disambiguationOptions = [];
    } else {
      const outcome = await resolveAssignee(db, analysis.assigneeCandidate, analysis.assigneeResolution, ctx.text);
      if (outcome.kind === "resolved") {
        assigneeId = outcome.user.id;
        disambiguationOptions = [];
      } else if (outcome.kind === "explicitly_unassigned") {
        explicitlyUnassigned = true;
        disambiguationOptions = [];
      } else if (outcome.kind === "ambiguous") {
        disambiguationOptions = outcome.options;
        assigneeProblem = { kind: "ambiguous", options: outcome.options };
      } else if (outcome.kind === "not_found") {
        assigneeProblem = { kind: "not_found", candidate: outcome.candidate };
        disambiguationOptions = [];
      } else {
        assigneeProblem = { kind: "ambiguous", options: draft.disambiguationOptions };
        disambiguationOptions = draft.disambiguationOptions;
      }
    }
  } else {
    const outcome = await resolveAssignee(db, analysis.assigneeCandidate, analysis.assigneeResolution, ctx.text);
    if (outcome.kind === "resolved") {
      assigneeId = outcome.user.id;
    } else if (outcome.kind === "explicitly_unassigned") {
      explicitlyUnassigned = true;
    } else if (outcome.kind === "ambiguous") {
      disambiguationOptions = outcome.options;
      assigneeProblem = { kind: "ambiguous", options: outcome.options };
    } else if (outcome.kind === "not_found") {
      assigneeProblem = { kind: "not_found", candidate: outcome.candidate };
    } else if (outcome.kind === "unknown" && draft?.assigneeId) {
      assigneeId = draft.assigneeId;
    }
  }
  if (!assigneeId && !explicitlyUnassigned) assigneeMissing = true;

  // --- Due-date resolution (backend decides) ---
  let dueDate: string | null = draft?.dueDate ?? null;
  let explicitlyNoDeadline = draft?.explicitlyNoDeadline ?? false;
  let ambiguousDateQuestion: string | null = null;
  let dateMissing = false;

  if (draft?.ambiguousDateQuestion && draft.dueDate && isAffirmative(ctx.text)) {
    dueDate = draft.dueDate; // user confirmed the proposed date
  } else {
    const outcome = resolveDueDate(analysis.dueDate, analysis.dueDateRaw, analysis.dueDateResolution, ctx.text, ctx.today);
    if (outcome.kind === "resolved") {
      dueDate = outcome.iso;
      explicitlyNoDeadline = false;
    } else if (outcome.kind === "ambiguous") {
      dueDate = outcome.iso; // provisional; must be confirmed
      ambiguousDateQuestion = outcome.question;
    } else if (outcome.kind === "no_deadline") {
      explicitlyNoDeadline = true;
      dueDate = null;
    } else if (outcome.kind === "unknown" && draft?.dueDate) {
      dueDate = draft.dueDate;
      ambiguousDateQuestion = draft.ambiguousDateQuestion ?? null;
    }
  }
  if (!dueDate && !explicitlyNoDeadline) dateMissing = true;
  if (ambiguousDateQuestion && dueDate) dateMissing = true; // confirmation still required

  const missingFields: Array<"title" | "assignee" | "due_date"> = [];
  if (!title) missingFields.push("title");
  if (assigneeMissing) missingFields.push("assignee");
  if (dateMissing) missingFields.push("due_date");

  if (missingFields.length === 0 && title) {
    const ticket = await createTicketAtomic(db, {
      title,
      description: description ?? title,
      originalTitle,
      assigneeId,
      dueDate,
      priority,
      tags,
      language: analysis.language,
      sourceMessageId,
      sourceSessionId: ctx.sessionId,
    });
    const full = await getTicketById(db, ticket.id);
    const content = buildConfirmation(lang, full ?? ticket);
    const assistant = await insertMessage(db, {
      sessionId: ctx.sessionId,
      role: "assistant",
      content,
      detectedLanguage: analysis.language,
    });
    return { sessionId: ctx.sessionId, assistantMessage: assistant, state: "idle", draft: null, ticket: full ?? ticket };
  }

  const nextDraft: PendingTicket = {
    title,
    originalTitle,
    description,
    assigneeCandidate: analysis.assigneeCandidate ?? draft?.assigneeCandidate ?? null,
    assigneeId,
    explicitlyUnassigned,
    dueDate,
    explicitlyNoDeadline,
    ambiguousDateQuestion,
    priority,
    tags,
    language: analysis.language,
    missingFields,
    sourceMessageId,
    disambiguationOptions,
    updatedTurn: (draft?.updatedTurn ?? 0) + 1,
  };
  await savePendingState(db, ctx.sessionId, nextDraft, "awaiting_clarification");
  const content = buildClarification(lang, {
    missingFields,
    assigneeProblem,
    ambiguousDateQuestion,
    candidateName: analysis.assigneeCandidate,
    teamNames: ctx.users.map((u) => u.name),
    title,
  });
  const assistant = await insertMessage(db, {
    sessionId: ctx.sessionId,
    role: "assistant",
    content,
    detectedLanguage: analysis.language,
  });
  return {
    sessionId: ctx.sessionId,
    assistantMessage: assistant,
    state: "awaiting_clarification",
    draft: nextDraft,
    ticket: null,
    disambiguationOptions: disambiguationOptions.length > 0 ? disambiguationOptions : undefined,
  };
}

async function persistDetectedLanguage(db: SupabaseClient, messageId: string, language: string): Promise<void> {
  await db.from("chat_messages").update({ detected_language: language }).eq("id", messageId);
}

/** Rebuild the outcome for a retried (idempotent) submission. */
async function rebuildOutcome(db: SupabaseClient, sessionId: string, userMsg: ChatMessageRecord): Promise<ChatOutcome> {
  const session = await getSession(db, sessionId);
  const assistant = await latestAssistantAfter(db, sessionId, userMsg.createdAt);
  const recent = assistant ?? (await listMessages(db, sessionId, 50)).filter((m) => m.role === "assistant").pop();
  if (!recent) throw new AppError("CONFLICT", 409, "The message was already received; the reply is still being prepared.");
  let ticket: TicketRecord | null = null;
  if (!session?.pendingTicket) {
    const latest = await latestTicketForSession(db, sessionId);
    if (latest) ticket = await getTicketById(db, latest.id);
  }
  return {
    sessionId,
    assistantMessage: recent,
    state: session?.pendingTicket ? "awaiting_clarification" : "idle",
    draft: session?.pendingTicket ?? null,
    ticket,
  };
}
