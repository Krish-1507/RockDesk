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
      const { data: existing } = await supabase
        .from("rate_limits")
        .select("count")
        .eq("bucket", bucket)
        .maybeSingle();
      const row = existing as { count: number } | null;
      const current = row?.count ?? 0;
      if (current >= limit) {
        logRequest(req, 429, { operation, errorCode: "RATE_LIMITED" });
        res.status(429).json(errorBody("RATE_LIMITED", "Too many requests. Please wait a moment and try again."));
        return;
      }
      await supabase.from("rate_limits").upsert(
        { bucket, count: current + 1, window_start: windowStart },
        { onConflict: "bucket" },
      );
      next();
    } catch {
      // Fail open on limiter errors so a limiter outage does not take down chat.
      next();
    }
  };
}
