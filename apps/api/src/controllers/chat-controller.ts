import type { Request, Response } from "express";
import type { AIProvider } from "@chat-to-ticket/shared";
import { SendMessageSchema } from "../schemas/http.js";
import { getSupabaseAdmin } from "../config/supabase.js";
import { createSession, getSession, listMessages } from "../repositories/chat-repository.js";
import { generateSessionToken, hashSessionToken } from "../utils/tokens.js";
import { errorBody, ok, AppError } from "../utils/errors.js";
import { logRequest } from "../middleware/request-id.js";
import { processMessage } from "../services/chat/chat-service.js";
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
      timezone: parsed.data.timezone,
      clientMessageId: parsed.data.clientMessageId,
    });
    logRequest(req, 200, { operation: "chat-message" });
    res.status(200).json(
      ok({
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
              dueDate: outcome.draft.dueDate,
              priority: outcome.draft.priority,
              missingFields: outcome.draft.missingFields,
              disambiguationOptions: outcome.draft.disambiguationOptions,
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
      }),
    );
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
        };
      }
      res.status(err.status).json(body);
      return;
    }
    logRequest(req, 500, { operation: "chat-message", errorCode: "INTERNAL_ERROR" });
    res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong. Please try again."));
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
    logRequest(req, 200, { operation: "chat-session-get" });
    res.status(200).json(ok({ session, messages }));
  } catch {
    logRequest(req, 500, { operation: "chat-session-get", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not load the chat session."));
  }
}
