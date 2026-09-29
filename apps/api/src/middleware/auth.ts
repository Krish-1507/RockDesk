import type { NextFunction, Request, Response } from "express";
import { getSupabaseAdmin } from "../config/supabase.js";
import { errorBody } from "../utils/errors.js";
import { logRequest } from "./request-id.js";

export interface AuthContext {
  authUserId: string;
  email: string | null;
  profileId: string | null;
  role: "admin" | "member" | null;
  displayName: string | null;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

function unauthorized(res: Response, req: Request, message: string): void {
  logRequest(req, 401, { operation: "auth" });
  res.status(401).json(errorBody("UNAUTHORIZED", message));
}

/** Verifies the Supabase access token and loads the application profile. Never trusts email alone. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/.exec(header);
    if (!match?.[1]) {
      unauthorized(res, req, "Authentication required.");
      return;
    }
    const token = match[1];
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      unauthorized(res, req, "Invalid or expired credentials.");
      return;
    }
    const authUserId = data.user.id;
    const email = data.user.email ?? null;
    const { data: profile } = await supabase
      .from("app_users")
      .select("id, role, name")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    const row = profile as { id: string; role: "admin" | "member"; name: string } | null;
    req.auth = {
      authUserId,
      email,
      profileId: row?.id ?? null,
      role: row?.role ?? null,
      displayName: row?.name ?? null,
    };
    next();
  } catch {
    unauthorized(res, req, "Authentication failed.");
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    unauthorized(res, req, "Authentication required.");
    return;
  }
  if (req.auth.role !== "admin") {
    logRequest(req, 403, { operation: "auth" });
    res.status(403).json(errorBody("FORBIDDEN", "Admin access required."));
    return;
  }
  next();
}
