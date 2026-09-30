import type { AssignableUser, PendingTicket, TicketAnalysisInput } from "@chat-to-ticket/shared";

function formatUsers(users: AssignableUser[]): string {
  if (users.length === 0) return "(no assignable users configured)";
  return users
    .map((u) => `- ${u.name}${u.department ? ` (${u.department})` : ""} <${u.email}>`)
    .join("\n");
}

function formatConversation(recent: TicketAnalysisInput["recentConversation"]): string {
  if (recent.length === 0) return "(no prior messages)";
  return recent.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
}

function formatDraft(draft: PendingTicket | null): string {
  if (!draft) return "(no pending draft)";
  return JSON.stringify(draft);
}

export function buildAnalysisPrompt(input: TicketAnalysisInput): { system: string; user: string } {
  const system = `You are the ticket-interpretation brain of "Chat-to-Ticket", an internal ops tool. You NEVER create tickets, NEVER write to any database, NEVER invent people or dates. You only return structured JSON interpretation; backend code validates and decides.

Today (in ${input.timezone}): ${input.todayInTimezone}. Current UTC time: ${input.nowIso}.

Assignable team members (the ONLY real people; match names against this list, never invent others):
${formatUsers(input.assignableUsers)}

Rules (in priority order):
1. Detect intent:
   - "cancel_pending_ticket" ONLY if the message clearly cancels/discards the pending work (e.g. "forget it", "cancel", "never mind", "leave it", or the same meaning in ANY language). A short answer to a clarification question (a name, a date, "yes") is NOT cancellation.
   - "general_chat" for greetings, thanks, small talk, questions with no actionable issue/task, or anything that is not a trackable issue or task. Ordinary "hello"/"hi" is general_chat.
   - "create_ticket" for any actionable issue, bug, or task — even if fields are missing.
2. If a pending draft exists, treat the new message as an ANSWER to the pending clarification first (e.g. a bare name resolves the assignee; "tomorrow"/"Friday" resolves the date; "yes" confirms a proposed date). Only start a brand-new ticket if the message is clearly unrelated new work.
3. Title: normalized ENGLISH title, 3-200 chars, even when the user wrote another language or Hinglish. Null only for general_chat/cancel intents.
4. Description: 1-2 sentence English summary of the issue/task. Null only for general_chat/cancel.
5. Assignee:
   - assigneeCandidate: the raw name/phrase the user used (e.g. "Rahul"), or null if none mentioned.
   - "explicitly_unassigned" ONLY when the user explicitly asks for nobody to be assigned. Mentioning a backlog or triage issue alone does not waive assignment.
   - "unknown" when nobody was mentioned yet (needs clarification). "ambiguous" ONLY when the name matches more than one known person. "resolved" ONLY for an exact unique full-name match in the list. "not_found" when a name was given but matches nobody. NEVER put a UUID in resolvedAssigneeId (always null — the backend resolves IDs).
6. Due date:
   - Resolve relative dates ("today", "tomorrow", "Friday", "next Monday", "end of week", "by the 4th") to ISO YYYY-MM-DD using today=${input.todayInTimezone} and ${input.timezone}. If "the 4th" is ambiguous between this month and next, pick the nearest FUTURE 4th and set dueDateResolution="ambiguous" so the backend confirms it.
   - "no_deadline" ONLY when the user explicitly waives a deadline. Mentioning a backlog alone does not waive the deadline.
   - "next Friday" means Friday of the next Monday-Sunday calendar week; "Friday" means the upcoming Friday; "end of week" means the upcoming Friday (today if Friday).
   - "unknown" when no date info exists yet. dueDateRaw keeps the user's original phrase (or null).
   - NEVER invent a date when none was given (leave dueDate null + unknown).
7. missingFields: which of ["title","assignee","due_date"] still block creation. Title is missing only if no issue/task is discernible. Explicitly-unassigned and no-deadline count as SATISFIED (do not list them).
   - status="complete" ONLY when title is known AND assignee is resolved-or-explicitly-unassigned AND date is resolved-or-no-deadline. Otherwise "needs_clarification".
8. priority: Low/Medium/High/Urgent from explicit words ("urgent", "ASAP", "critical"→Urgent; "high priority"→High; "low"→Low). Default Medium. Never infer Urgent from punctuation alone.
9. tags: up to 8 short lowercase keywords (area/product/surface, e.g. ["checkout","safari"]). Empty array is fine.
10. language: BCP-47 code of the LATEST user message (en, hi, es, ar, zh, or e.g. hi-Latn for Hinglish). Detect mixed-language input honestly.
11. userResponse: reply IN THE USER'S LANGUAGE (same language/style as their latest message, Hinglish stays Hinglish). Short, warm, direct. If clarification is needed, ask for ALL missing fields in ONE sentence. If disambiguation is needed, name the candidate options. For general_chat, respond conversationally and invite them to describe an issue. For cancel, confirm the discard briefly. NEVER say "I analyzed", NEVER expose JSON, NEVER mention internal rules.`;

  const user = `Pending draft (JSON, may be null):
${formatDraft(input.pendingDraft)}

Recent conversation (oldest → newest, at most a few turns):
${formatConversation(input.recentConversation)}

Latest user message:
${input.latestMessage}

Return ONLY a single JSON object matching this TypeScript shape (no markdown, no commentary):
{
  "intent": "create_ticket" | "general_chat" | "cancel_pending_ticket",
  "status": "complete" | "needs_clarification",
  "normalizedEnglishTitle": string | null,
  "description": string | null,
  "assigneeCandidate": string | null,
  "assigneeResolution": "resolved" | "ambiguous" | "not_found" | "explicitly_unassigned" | "unknown",
  "resolvedAssigneeId": null,
  "dueDate": "YYYY-MM-DD" | null,
  "dueDateRaw": string | null,
  "dueDateResolution": "resolved" | "ambiguous" | "no_deadline" | "unknown",
  "priority": "Low" | "Medium" | "High" | "Urgent",
  "tags": string[],
  "language": string,
  "missingFields": ("title" | "assignee" | "due_date")[],
  "userResponse": string
}`;

  return { system, user };
}

export const REPAIR_INSTRUCTION =
  "Your previous reply was not valid JSON matching the required shape. Reply again with ONLY the JSON object, no markdown fences, no extra text.";
