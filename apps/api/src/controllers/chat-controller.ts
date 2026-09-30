import type { Request, Response } from "express";
import type { AIProvider } from "@chat-to-ticket/shared";
import { SendMessageSchema } from "../schemas/http.js";
import { getSupabaseAdmin } from "../config/supabase.js";
import { getEnv } from "../config/env.js";
import { createSession, getSession, listMessages } from "../repositories/chat-repository.js";
import { generateSessionToken, hashSessionToken } from "../utils/tokens.js";
import { getUserById } from "../repositories/user-repository.js";
import { errorBody, ok, AppError } from "../utils/errors.js";
import { logRequest } from "../middleware/request-id.js";
import { processMessage, type ChatOutcome } from "../services/chat/chat-service.js";
import { GroqAIProvider } from "../services/ai/groq-provider.js";

let aiProvider: AIProvider | null = null;

function getAI(): AIProvider {
  if (!aiProvider) aiProvider = new GroqAIProvider();
  return aiProvider;
}

/** Test seam: inject a mock AI provider. */
export function setAIProviderForTests(provider: AIProvider | null): void {
  aiProvider = provider;
}

export async function createChatSession(_req: Request, res: Response): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    const token = generateSessionToken();
    const session = await createSession(db, hashSessionToken(token));
    logRequest(_req, 201, { operation: "chat-session-create" });
    res.status(201).json(ok({ sessionId: session.id, sessionToken: token }));
  } catch {
    logRequest(_req, 500, { operation: "chat-session-create", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not create a chat session."));
  }
}

export async function sendChatMessage(req: Request, res: Response): Promise<void> {
  const parsed = SendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    logRequest(req, 400, { operation: "chat-message" });
    res.status(400).json(errorBody("VALIDATION_ERROR", "The request could not be processed.", parsed.error.issues));
    return;
  }
  if (req.chatSessionId && req.chatSessionId !== parsed.data.sessionId) {
    logRequest(req, 401, { operation: "chat-message" });
    res.status(401).json(errorBody("UNAUTHORIZED", "Session token does not match this chat session."));
    return;
  }
  try {
    const db = getSupabaseAdmin();
    const outcome = await processMessage(db, getAI(), {
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
      timezone: parsed.data.timezone ?? getEnv().APP_TIMEZONE_DEFAULT,
      clientMessageId: parsed.data.clientMessageId,
    });
    // Resolve the pending assignee's display name so the UI never shows an opaque id.
    let assigneeName: string | null = null;
    if (outcome.draft?.assigneeId) {
      const user = await getUserById(db, outcome.draft.assigneeId);
      assigneeName = user?.name ?? null;
    }
    logRequest(req, 200, { operation: "chat-message" });
    res.status(200).json(ok(toMessageResponse(outcome, assigneeName)));
  } catch (err) {
    if (err instanceof AppError) {
      logRequest(req, err.status, { operation: "chat-message", errorCode: err.code });
      const body: Record<string, unknown> = { error: { code: err.code, message: err.message, details: err.details } };
      // Surface the stored safe assistant message so the UI can render it.
      const details = err.details as { assistantMessage?: { id: string; content: string } } | unknown;
      if (details && typeof details === "object" && "assistantMessage" in details) {
        body.data = {
          sessionId: parsed.data.sessionId,
          assistantMessage: (details as { assistantMessage: unknown }).assistantMessage,
          state: "idle",
          draft: null,
          ticket: null,
          duplicate: null,
        };
      }
      res.status(err.status).json(body);
      return;
    }
    logRequest(req, 500, { operation: "chat-message", errorCode: "INTERNAL_ERROR" });
    res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong. Please try again."));
  }
}

/** Shared response shape for the JSON and streaming chat endpoints. */
export function toMessageResponse(outcome: ChatOutcome, assigneeName: string | null): {
  sessionId: string;
  assistantMessage: { id: string; content: string; detectedLanguage: string | null };
  state: "idle" | "awaiting_clarification";
  draft: {
    title: string | null;
    description: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
    dueDate: string | null;
    priority: string;
    missingFields: string[];
    disambiguationOptions: Array<{ id: string; name: string; department: string | null }>;
    duplicateCandidate: { ticketNumber: number; title: string } | null;
  } | null;
  ticket: {
    id: string;
    ticketNumber: number;
    title: string;
    assignee: { id: string; name: string } | null;
    dueDate: string | null;
    priority: string;
    status: string;
  } | null;
  duplicate: { ticketNumber: number; title: string } | null;
} {
  return {
    sessionId: outcome.sessionId,
    assistantMessage: {
      id: outcome.assistantMessage.id,
      content: outcome.assistantMessage.content,
      detectedLanguage: outcome.assistantMessage.detectedLanguage,
    },
    state: outcome.state,
    draft: outcome.draft
      ? {
          title: outcome.draft.title,
          description: outcome.draft.description,
          assigneeId: outcome.draft.assigneeId,
          assigneeName,
          dueDate: outcome.draft.dueDate,
          priority: outcome.draft.priority,
          missingFields: outcome.draft.missingFields,
          disambiguationOptions: outcome.draft.disambiguationOptions,
          duplicateCandidate: outcome.draft.duplicateCandidate
            ? { ticketNumber: outcome.draft.duplicateCandidate.ticketNumber, title: outcome.draft.duplicateCandidate.title }
            : null,
        }
      : null,
    ticket: outcome.ticket
      ? {
          id: outcome.ticket.id,
          ticketNumber: outcome.ticket.ticketNumber,
          title: outcome.ticket.title,
          assignee: outcome.ticket.assignee,
          dueDate: outcome.ticket.dueDate,
          priority: outcome.ticket.priority,
          status: outcome.ticket.status,
        }
      : null,
    duplicate: outcome.duplicateCandidate
      ? { ticketNumber: outcome.duplicateCandidate.ticketNumber, title: outcome.duplicateCandidate.title }
      : null,
  };
}

/**
 * Streaming variant of sendChatMessage. Runs the exact same validated pipeline,
 * then delivers the already-validated reply as SSE word frames followed by a
 * `done` frame carrying the full payload. Nothing unvalidated ever streams.
 */
export async function streamChatMessage(req: Request, res: Response): Promise<void> {
  const parsed = SendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    logRequest(req, 400, { operation: "chat-stream" });
    res.status(400).json(errorBody("VALIDATION_ERROR", "The request could not be processed.", parsed.error.issues));
    return;
  }
  if (req.chatSessionId && req.chatSessionId !== parsed.data.sessionId) {
    logRequest(req, 401, { operation: "chat-stream" });
    res.status(401).json(errorBody("UNAUTHORIZED", "Session token does not match this chat session."));
    return;
  }
  const write = (event: string, data: unknown): boolean => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch {
      return false;
    }
  };
  let closed = false;
  req.on("close", () => {
    closed = true;
  });
  try {
    const db = getSupabaseAdmin();
    const outcome = await processMessage(db, getAI(), {
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
      timezone: parsed.data.timezone ?? getEnv().APP_TIMEZONE_DEFAULT,
      clientMessageId: parsed.data.clientMessageId,
    });
    let assigneeName: string | null = null;
    if (outcome.draft?.assigneeId) {
      const user = await getUserById(db, outcome.draft.assigneeId);
      assigneeName = user?.name ?? null;
    }
    const payload = toMessageResponse(outcome, assigneeName);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const words = payload.assistantMessage.content.match(/\S+\s*/g) ?? [];
    let chunk = "";
    for (const word of words) {
      if (closed) return;
      chunk += word;
      if (chunk.split(/\s+/).length >= 3) {
        if (!write("token", { text: chunk })) return;
        chunk = "";
        await new Promise((resolve) => setTimeout(resolve, 24));
      }
    }
    if (chunk) {
      if (!write("token", { text: chunk })) return;
    }
    write("done", payload);
    logRequest(req, 200, { operation: "chat-stream" });
    res.end();
  } catch (err) {
    if (err instanceof AppError) {
      logRequest(req, err.status, { operation: "chat-stream", errorCode: err.code });
      const body: Record<string, unknown> = { error: { code: err.code, message: err.message, details: err.details } };
      const details = err.details as { assistantMessage?: { id: string; content: string } } | unknown;
      if (details && typeof details === "object" && "assistantMessage" in details) {
        body.data = {
          sessionId: parsed.data.sessionId,
          assistantMessage: (details as { assistantMessage: unknown }).assistantMessage,
          state: "idle",
          draft: null,
          ticket: null,
          duplicate: null,
        };
      }
      if (!res.headersSent) {
        res.status(err.status).json(body);
        return;
      }
      write("error", body);
      res.end();
      return;
    }
    logRequest(req, 500, { operation: "chat-stream", errorCode: "INTERNAL_ERROR" });
    if (!res.headersSent) {
      res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong. Please try again."));
      return;
    }
    write("error", errorBody("INTERNAL_ERROR", "Something went wrong. Please try again."));
    res.end();
  }
}

export async function getChatSession(req: Request, res: Response): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    const paramId = req.params.id;
    const sessionId = req.chatSessionId ?? (typeof paramId === "string" ? paramId : "");
    if (!sessionId) {
      logRequest(req, 401, { operation: "chat-session-get" });
      res.status(401).json(errorBody("UNAUTHORIZED", "Valid chat session credentials required."));
      return;
    }
    const session = await getSession(db, sessionId);
    if (!session) {
      logRequest(req, 404, { operation: "chat-session-get" });
      res.status(404).json(errorBody("NOT_FOUND", "Chat session not found."));
      return;
    }
    const messages = await listMessages(db, sessionId, 100);
    const assignee = session.pendingTicket?.assigneeId ? await getUserById(db, session.pendingTicket.assigneeId) : null;
    const { data: outcomes, error: outcomeError } = await db.from("chat_messages").select("outcome").eq("session_id", sessionId).not("outcome", "is", null);
    if (outcomeError) throw outcomeError;
    const results = (outcomes ?? []).map((row) => row.outcome as { result?: { assistantMessage: { id: string }; ticket: unknown } });
    logRequest(req, 200, { operation: "chat-session-get" });
    res.status(200).json(ok({
      session: { ...session, pendingTicket: session.pendingTicket ? { ...session.pendingTicket, assigneeName: assignee?.name ?? null } : null },
      messages: messages.map((message) => ({ ...message, ticket: results.find((r) => r.result?.assistantMessage.id === message.id)?.result?.ticket ?? null })),
    }));
  } catch {
    logRequest(req, 500, { operation: "chat-session-get", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not load the chat session."));
  }
}
