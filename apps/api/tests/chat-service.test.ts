import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "../src/config/supabase.js";
import { createSession, insertMessage, listMessages } from "../src/repositories/chat-repository.js";
import { hashSessionToken } from "../src/utils/tokens.js";
import { processMessage } from "../src/services/chat/chat-service.js";
import { baseAnalysis, MockAIProvider } from "./mock-ai.js";

const createdSessionIds: string[] = [];
const createdTicketIds: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-30T10:00:00Z"));
});

async function newSession(): Promise<string> {
  const db = getSupabaseAdmin();
  const session = await createSession(db, hashSessionToken(`test_${Math.random().toString(36).slice(2)}_${Date.now()}`));
  createdSessionIds.push(session.id);
  return session.id;
}

afterEach(async () => {
  vi.useRealTimers();
  const db = getSupabaseAdmin();
  if (createdTicketIds.length > 0) {
    await db.from("ticket_events").delete().in("ticket_id", createdTicketIds);
    await db.from("tickets").delete().in("id", createdTicketIds);
    createdTicketIds.length = 0;
  }
  if (createdSessionIds.length > 0) {
    await db.from("chat_messages").delete().in("session_id", createdSessionIds);
    await db.from("chat_sessions").delete().in("id", createdSessionIds);
    createdSessionIds.length = 0;
  }
});

describe("chat state machine", () => {
  it("honours a correction from an assigned person to unassigned", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    const sessionId = await newSession();
    ai.enqueue(baseAnalysis({ normalizedEnglishTitle: "Login broken", assigneeCandidate: "Priya", assigneeResolution: "resolved" }));
    await processMessage(db, ai, { sessionId, message: "Login broken, assign Priya", timezone: "Asia/Kolkata" });
    ai.enqueue(baseAnalysis({ normalizedEnglishTitle: "Login broken", assigneeResolution: "explicitly_unassigned", dueDateResolution: "no_deadline" }));
    const result = await processMessage(db, ai, { sessionId, message: "Actually leave it unassigned, no deadline", timezone: "Asia/Kolkata" });
    if (result.ticket) createdTicketIds.push(result.ticket.id);
    expect(result.ticket).not.toBeNull();
    expect(result.ticket?.assigneeId).toBeNull();
  });

  it("does not keep the old assignee when a correction is ambiguous", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    const sessionId = await newSession();
    ai.enqueue(baseAnalysis({ normalizedEnglishTitle: "Login broken", assigneeCandidate: "Priya", assigneeResolution: "resolved" }));
    await processMessage(db, ai, { sessionId, message: "Login broken, assign Priya", timezone: "Asia/Kolkata" });
    ai.enqueue(baseAnalysis({ normalizedEnglishTitle: "Login broken", assigneeCandidate: "Rahul", assigneeResolution: "ambiguous", dueDateResolution: "no_deadline" }));
    const result = await processMessage(db, ai, { sessionId, message: "Actually Rahul, no deadline", timezone: "Asia/Kolkata" });
    if (result.ticket) createdTicketIds.push(result.ticket.id);
    expect(result.ticket).toBeNull();
    expect(result.draft?.assigneeId).toBeNull();
    expect(result.draft?.missingFields).toContain("assignee");
  });

  it("loads recent context rather than the beginning of a long conversation", async () => {
    const db = getSupabaseAdmin();
    const sessionId = await newSession();
    for (let i = 0; i < 5; i++) await insertMessage(db, { sessionId, role: "user", content: `message ${i}` });
    const recent = await listMessages(db, sessionId, 2);
    expect(recent.map((m) => m.content)).toEqual(["message 3", "message 4"]);
  });

  it("replays the original result even after a later conversation turn", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    const sessionId = await newSession();
    const input = { sessionId, message: "Hello", timezone: "Asia/Kolkata", clientMessageId: "77777777-2222-4333-8444-555555555555" };
    ai.enqueue(baseAnalysis({ intent: "general_chat", userResponse: "Hello there." }));
    const first = await processMessage(db, ai, input);
    ai.enqueue(baseAnalysis({ normalizedEnglishTitle: "New issue" }));
    await processMessage(db, ai, { sessionId, message: "New issue", timezone: "Asia/Kolkata" });
    const replay = await processMessage(db, ai, input);
    expect(replay).toEqual(first);
    await expect(processMessage(db, ai, { ...input, message: "Changed text" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  beforeAll(() => {
    if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL missing for tests");
  });

  it("creates a ticket immediately for a complete message", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.enqueue(
      baseAnalysis({
        status: "complete",
        normalizedEnglishTitle: "Checkout page throwing 500 errors",
        description: "Some users see 500 errors on checkout.",
        assigneeCandidate: "Priya",
        assigneeResolution: "resolved",
        dueDate: "2026-10-02",
        dueDateRaw: "Friday",
        dueDateResolution: "resolved",
        priority: "High",
        language: "en",
      }),
    );
    const sessionId = await newSession();
    const outcome = await processMessage(db, ai, {
      sessionId,
      message: "Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.",
      timezone: "Asia/Kolkata",
    });
    expect(outcome.state).toBe("idle");
    expect(outcome.ticket).not.toBeNull();
    expect(outcome.ticket?.assignee?.name).toBe("Priya Menon");
    expect(outcome.ticket?.dueDate).toBe("2026-10-02");
    expect(outcome.ticket?.priority).toBe("High");
    expect(outcome.ticket?.title).toBe("Checkout page throwing 500 errors");
    expect(outcome.assistantMessage.content).toContain(`#${outcome.ticket?.ticketNumber}`);
    if (outcome.ticket) createdTicketIds.push(outcome.ticket.id);
    // Original message preserved verbatim
    const { data: msgs } = await db.from("chat_messages").select("content, role").eq("session_id", sessionId).order("created_at");
    expect((msgs as Array<{ content: string; role: string }>)[0]?.content).toContain("Checkout page is throwing 500");
  });

  it("asks for the assignee when it is missing and completes on the follow-up", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.enqueue(
      baseAnalysis({
        normalizedEnglishTitle: "Login page crashes on Safari",
        description: "Safari users crash on login.",
        dueDate: "2026-10-02",
        dueDateRaw: "Friday",
        dueDateResolution: "resolved",
        language: "en",
      }),
    );
    const sessionId = await newSession();
    const first = await processMessage(db, ai, {
      sessionId,
      message: "Login page crashes on Safari, this will be resolved by Friday.",
      timezone: "Asia/Kolkata",
    });
    expect(first.state).toBe("awaiting_clarification");
    expect(first.ticket).toBeNull();
    expect(first.draft?.missingFields).toContain("assignee");
    expect(first.assistantMessage.content).toMatch(/assign/i);

    ai.enqueue(
      baseAnalysis({
        status: "complete",
        normalizedEnglishTitle: "Login page crashes on Safari",
        description: "Safari users crash on login.",
        assigneeCandidate: "Rahul Sharma",
        assigneeResolution: "resolved",
        dueDate: "2026-10-02",
        dueDateRaw: "Friday",
        dueDateResolution: "resolved",
        language: "en",
      }),
    );
    const second = await processMessage(db, ai, {
      sessionId,
      message: "Rahul Sharma.",
      timezone: "Asia/Kolkata",
    });
    expect(second.state).toBe("idle");
    expect(second.ticket?.assignee?.name).toBe("Rahul Sharma");
    if (second.ticket) createdTicketIds.push(second.ticket.id);
  });

  it("presents disambiguation options for an ambiguous first name and never auto-picks", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.enqueue(
      baseAnalysis({
        normalizedEnglishTitle: "Search results are wrong",
        description: "Search returns wrong results.",
        assigneeCandidate: "Rahul",
        assigneeResolution: "ambiguous",
        dueDate: "2026-09-30",
        dueDateRaw: "tomorrow",
        dueDateResolution: "resolved",
        language: "en",
      }),
    );
    const sessionId = await newSession();
    const first = await processMessage(db, ai, {
      sessionId,
      message: "Search results are wrong, Rahul to fix by tomorrow.",
      timezone: "Asia/Kolkata",
    });
    expect(first.state).toBe("awaiting_clarification");
    expect(first.ticket).toBeNull();
    expect(first.assistantMessage.content).toContain("Rahul Sharma");
    expect(first.assistantMessage.content).toContain("Rahul Verma");

    ai.enqueue(
      baseAnalysis({
        status: "complete",
        normalizedEnglishTitle: "Search results are wrong",
        description: "Search returns wrong results.",
        assigneeCandidate: "Rahul Sharma",
        assigneeResolution: "resolved",
        dueDate: "2026-09-30",
        dueDateRaw: "tomorrow",
        dueDateResolution: "resolved",
        language: "en",
      }),
    );
    const second = await processMessage(db, ai, {
      sessionId,
      message: "Rahul Sharma",
      timezone: "Asia/Kolkata",
    });
    expect(second.ticket?.assignee?.name).toBe("Rahul Sharma");
    if (second.ticket) createdTicketIds.push(second.ticket.id);
  });

  it("discards the pending draft on cancellation without creating a ticket", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.enqueue(baseAnalysis({ normalizedEnglishTitle: "Login issue on Safari", description: "Login broken.", language: "en" }));
    const sessionId = await newSession();
    await processMessage(db, ai, { sessionId, message: "Login issue on Safari.", timezone: "Asia/Kolkata" });

    ai.enqueue(baseAnalysis({ intent: "cancel_pending_ticket", status: "needs_clarification", language: "en", userResponse: "cancelled" }));
    const cancelled = await processMessage(db, ai, { sessionId, message: "Forget it.", timezone: "Asia/Kolkata" });
    expect(cancelled.state).toBe("idle");
    expect(cancelled.draft).toBeNull();
    expect(cancelled.ticket).toBeNull();
    expect(cancelled.assistantMessage.content).toMatch(/discard/i);
  });

  it("does not create tickets for ordinary greetings", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.enqueue(
      baseAnalysis({ intent: "general_chat", status: "needs_clarification", language: "en", userResponse: "Hi. Tell me about an issue or task and I can turn it into a ticket." }),
    );
    const sessionId = await newSession();
    const outcome = await processMessage(db, ai, { sessionId, message: "Hello", timezone: "Asia/Kolkata" });
    expect(outcome.ticket).toBeNull();
    expect(outcome.draft).toBeNull();
    expect(outcome.state).toBe("idle");
  });

  it("supports explicit unassigned plus explicit no-deadline in Hinglish", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.enqueue(
      baseAnalysis({
        status: "complete",
        normalizedEnglishTitle: "Payment page is very slow",
        description: "Payment page loads very slowly.",
        assigneeCandidate: null,
        assigneeResolution: "explicitly_unassigned",
        dueDate: null,
        dueDateResolution: "no_deadline",
        priority: "Medium",
        language: "hi-Latn",
      }),
    );
    const sessionId = await newSession();
    const outcome = await processMessage(db, ai, {
      sessionId,
      message: "Payment page bahut slow chal raha hai, kisi ko assign mat karo, no deadline.",
      timezone: "Asia/Kolkata",
    });
    expect(outcome.ticket).not.toBeNull();
    expect(outcome.ticket?.assignee).toBeNull();
    expect(outcome.ticket?.dueDate).toBeNull();
    expect(outcome.ticket?.title).toBe("Payment page is very slow");
    if (outcome.ticket) createdTicketIds.push(outcome.ticket.id);
  });

  it("asks to confirm an ambiguous ordinal date and completes on yes", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.enqueue(
      baseAnalysis({
        normalizedEnglishTitle: "Login page crashes on Safari",
        description: "Crash on Safari login.",
        assigneeCandidate: "Priya",
        assigneeResolution: "resolved",
        dueDate: "2026-10-04",
        dueDateRaw: "the 4th",
        dueDateResolution: "ambiguous",
        language: "en",
      }),
    );
    const sessionId = await newSession();
    const first = await processMessage(db, ai, {
      sessionId,
      message: "Login page crashes on Safari, Priya will fix it by the 4th.",
      timezone: "Asia/Kolkata",
    });
    expect(first.state).toBe("awaiting_clarification");
    expect(first.assistantMessage.content).toMatch(/4 October 2026/);

    ai.enqueue(
      baseAnalysis({
        status: "complete",
        normalizedEnglishTitle: "Login page crashes on Safari",
        description: "Crash on Safari login.",
        assigneeCandidate: "Priya",
        assigneeResolution: "resolved",
        dueDate: "2026-10-04",
        dueDateRaw: "the 4th",
        dueDateResolution: "resolved",
        language: "en",
      }),
    );
    const second = await processMessage(db, ai, { sessionId, message: "Yes.", timezone: "Asia/Kolkata" });
    expect(second.ticket?.dueDate).toBe("2026-10-04");
    if (second.ticket) createdTicketIds.push(second.ticket.id);
  });

  it("returns the stored outcome for a retried clientMessageId instead of duplicating", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.enqueue(
      baseAnalysis({
        status: "complete",
        normalizedEnglishTitle: "Checkout 500 errors",
        description: "Checkout fails.",
        assigneeCandidate: "Amit Kumar",
        assigneeResolution: "resolved",
        dueDate: "2026-10-02",
        dueDateRaw: "Friday",
        dueDateResolution: "resolved",
        language: "en",
      }),
    );
    const sessionId = await newSession();
    const clientMessageId = "11111111-2222-4333-8444-555555555555";
    const first = await processMessage(db, ai, {
      sessionId,
      message: "Checkout 500s. Amit Kumar by Friday.",
      timezone: "Asia/Kolkata",
      clientMessageId,
    });
    if (first.ticket) createdTicketIds.push(first.ticket.id);
    const callsBefore = ai.calls.length;
    const retry = await processMessage(db, ai, {
      sessionId,
      message: "Checkout 500s. Amit Kumar by Friday.",
      timezone: "Asia/Kolkata",
      clientMessageId,
    });
    expect(ai.calls.length).toBe(callsBefore); // AI not called again
    expect(retry.ticket?.id).toBe(first.ticket?.id);
  });

  it("fails gracefully when the AI times out, keeping the message and draft", async () => {
    const db = getSupabaseAdmin();
    const ai = new MockAIProvider();
    ai.failWith = new Error("AI_TIMEOUT");
    const sessionId = await newSession();
    await expect(
      processMessage(db, ai, { sessionId, message: "Something is broken.", timezone: "Asia/Kolkata" }),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
    const { data: msgs } = await db.from("chat_messages").select("role").eq("session_id", sessionId);
    expect((msgs as Array<{ role: string }>).map((m) => m.role)).toEqual(["user", "assistant"]);
  });
});
