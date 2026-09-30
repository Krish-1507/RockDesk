import type { NextFunction, Request, Response } from "express";
import { getEnv } from "../config/env.js";
import { getSupabaseAdmin } from "../config/supabase.js";
import { errorBody } from "../utils/errors.js";
import { logRequest } from "./request-id.js";

/**
 * Database-backed sliding-window rate limiter (serverless-safe: no in-memory Maps).
 * Table rate_limits(bucket TEXT PK, count INT, window_start TIMESTAMPTZ).
 */
export function rateLimit(operation: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const env = getEnv();
      const limit = env.AI_RATE_LIMIT_PER_MINUTE;
      const identifier =
        req.auth?.authUserId ??
        req.header("x-chat-session-token")?.slice(0, 16) ??
        req.ip ??
        "anonymous";
      const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
      const bucket = `${operation}:${identifier}:${windowStart}`;
      const supabase = getSupabaseAdmin();
      const { data: count, error } = await supabase.rpc("consume_rate_limit", { p_bucket: bucket, p_window_start: windowStart });
      if (error) throw error;
      if (Number(count) > limit) {
        logRequest(req, 429, { operation, errorCode: "RATE_LIMITED" });
        res.setHeader("Retry-After", "60");
        res.status(429).json(errorBody("RATE_LIMITED", "Too many requests. Please wait a moment and try again."));
        return;
      }
      next();
    } catch {
      logRequest(req, 503, { operation, errorCode: "DATABASE_ERROR" });
      res.status(503).json(errorBody("DATABASE_ERROR", "Chat is temporarily unavailable. Please try again shortly."));
    }
  };
}
