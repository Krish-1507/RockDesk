import type { NextFunction, Request, Response } from "express";
import { errorBody } from "../utils/errors.js";
import { logRequest } from "./request-id.js";
import { hashSessionToken } from "../utils/tokens.js";
import { getSupabaseAdmin } from "../config/supabase.js";

declare module "express-serve-static-core" {
  interface Request {
    chatSessionId?: string;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates the opaque public chat session token. The DB stores only the hash.
 * Raw session UUIDs are never accepted as authorization.
 */
export async function requireChatSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.header("x-chat-session-token") ?? "";
  const bodyId = (req.body as { sessionId?: unknown } | undefined)?.sessionId;
  const queryId = req.query.sessionId;
  const sessionId =
    req.chatSessionId ??
    (typeof bodyId === "string" ? bodyId : undefined) ??
    (typeof req.params.id === "string" ? req.params.id : undefined) ??
    (typeof queryId === "string" ? queryId : undefined);
  if (!token || typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    logRequest(req, 401, { operation: "chat-session" });
    res.status(401).json(errorBody("UNAUTHORIZED", "Valid chat session credentials required."));
    return;
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("public_access_token_hash", hashSessionToken(token))
      .maybeSingle();
    if (error || !data) {
      logRequest(req, 401, { operation: "chat-session" });
      res.status(401).json(errorBody("UNAUTHORIZED", "Valid chat session credentials required."));
      return;
    }
    req.chatSessionId = sessionId;
    next();
  } catch {
    logRequest(req, 500, { operation: "chat-session", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not verify the chat session."));
  }
}
