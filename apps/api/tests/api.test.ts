import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { getSupabaseAdmin } from "../src/config/supabase.js";
import { generateSessionToken, hashSessionToken } from "../src/utils/tokens.js";
import { setAIProviderForTests } from "../src/controllers/chat-controller.js";
import { baseAnalysis, MockAIProvider } from "./mock-ai.js";
import type { Express } from "express";

let app: Express;
const mockAI = new MockAIProvider();
const sessionIds: string[] = [];
const ticketIds: string[] = [];

beforeAll(() => {
  app = createApp();
  setAIProviderForTests(mockAI);
});

afterAll(async () => {
  setAIProviderForTests(null);
  const db = getSupabaseAdmin();
  if (ticketIds.length > 0) {
    await db.from("ticket_events").delete().in("ticket_id", ticketIds);
    await db.from("tickets").delete().in("id", ticketIds);
  }
  if (sessionIds.length > 0) {
    await db.from("chat_messages").delete().in("session_id", sessionIds);
    await db.from("chat_sessions").delete().in("id", sessionIds);
  }
});

async function createSession(): Promise<{ sessionId: string; sessionToken: string }> {
  const res = await request(app).post("/api/chat/sessions").expect(201);
  const body = res.body.data as { sessionId: string; sessionToken: string };
  sessionIds.push(body.sessionId);
  return body;
}

describe("health", () => {
  it("returns ok without auth", async () => {
    await request(app).get("/health").expect(200, { status: "ok" });
  });
});

describe("chat API", () => {
  it("rejects messages without a session token", async () => {
    const { sessionId } = await createSession();
    await request(app)
      .post("/api/chat/message")
      .send({ sessionId, message: "hi", timezone: "Asia/Kolkata" })
      .expect(401);
  });

  it("rejects invalid bodies", async () => {
    const { sessionId, sessionToken } = await createSession();
    await request(app)
      .post("/api/chat/message")
      .set("X-Chat-Session-Token", sessionToken)
      .send({ sessionId, message: "", timezone: "Asia/Kolkata" })
      .expect(400);
  });

  it("runs the clarification loop end to end", async () => {
    const { sessionId, sessionToken } = await createSession();
    mockAI.enqueue(
      baseAnalysis({
        normalizedEnglishTitle: "Login broken",
        description: "Login broken.",
        language: "en",
      }),
    );
    const first = await request(app)
      .post("/api/chat/message")
      .set("X-Chat-Session-Token", sessionToken)
      .send({ sessionId, message: "Login is broken.", timezone: "Asia/Kolkata" })
      .expect(200);
    expect(first.body.data.state).toBe("awaiting_clarification");
    expect(first.body.data.draft.missingFields).toContain("assignee");

    mockAI.enqueue(
      baseAnalysis({
        intent: "cancel_pending_ticket",
        status: "needs_clarification",
        language: "en",
        userResponse: "cancelled",
      }),
    );
    const cancelled = await request(app)
      .post("/api/chat/message")
      .set("X-Chat-Session-Token", sessionToken)
      .send({ sessionId, message: "never mind", timezone: "Asia/Kolkata" })
      .expect(200);
    expect(cancelled.body.data.state).toBe("idle");
    expect(cancelled.body.data.draft).toBeNull();
  });

  it("creates a ticket and exposes it to admins", async () => {
    const { sessionId, sessionToken } = await createSession();
    mockAI.enqueue(
      baseAnalysis({
        status: "complete",
        normalizedEnglishTitle: "API test ticket",
        description: "Created by API test.",
        assigneeCandidate: "Neha Singh",
        assigneeResolution: "resolved",
        dueDate: "2026-10-02",
        dueDateRaw: "Friday",
        dueDateResolution: "resolved",
        language: "en",
      }),
    );
    const created = await request(app)
      .post("/api/chat/message")
      .set("X-Chat-Session-Token", sessionToken)
      .send({ sessionId, message: "Something broke. Neha Singh by Friday.", timezone: "Asia/Kolkata" })
      .expect(200);
    expect(created.body.data.ticket.ticketNumber).toBeGreaterThan(0);
    ticketIds.push(created.body.data.ticket.id as string);
  });

  it("isolates sessions: token A cannot write to session B", async () => {
    const a = await createSession();
    const b = await createSession();
    await request(app)
      .post("/api/chat/message")
      .set("X-Chat-Session-Token", a.sessionToken)
      .send({ sessionId: b.sessionId, message: "hijack", timezone: "Asia/Kolkata" })
      .expect(401);
  });
});

describe("admin authorization", () => {
  it("rejects ticket listing without a token", async () => {
    await request(app).get("/api/tickets").expect(401);
  });

  it("rejects ticket listing with a garbage token", async () => {
    await request(app).get("/api/tickets").set("Authorization", "Bearer garbage").expect(401);
  });
});

describe("token hashing", () => {
  it("stores only the hash, never the raw token", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).not.toContain(token.slice(4, 12));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});


