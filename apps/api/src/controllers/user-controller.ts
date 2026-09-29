import type { Request, Response } from "express";
import { z } from "zod";
import { CreateUserSchema } from "../schemas/http.js";
import { getSupabaseAdmin } from "../config/supabase.js";
import { createUser, listAssignableUsers, searchAssignableUsers } from "../repositories/user-repository.js";
import { errorBody, ok } from "../utils/errors.js";
import { logRequest } from "../middleware/request-id.js";

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const parsed = z.object({ search: z.string().max(200).optional() }).safeParse(req.query);
  if (!parsed.success) {
    logRequest(req, 400, { operation: "users-list" });
    res.status(400).json(errorBody("VALIDATION_ERROR", "Invalid query parameters."));
    return;
  }
  try {
    const db = getSupabaseAdmin();
    const users = parsed.data.search
      ? await searchAssignableUsers(db, parsed.data.search)
      : await listAssignableUsers(db);
    logRequest(req, 200, { operation: "users-list" });
    res.status(200).json(ok({ users }));
  } catch {
    logRequest(req, 500, { operation: "users-list", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not load users."));
  }
}

export async function createUserHandler(req: Request, res: Response): Promise<void> {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    logRequest(req, 400, { operation: "users-create" });
    res.status(400).json(errorBody("VALIDATION_ERROR", "Invalid user data.", parsed.error.issues));
    return;
  }
  try {
    const db = getSupabaseAdmin();
    const user = await createUser(db, {
      name: parsed.data.name,
      email: parsed.data.email,
      department: parsed.data.department,
      role: parsed.data.role,
    });
    logRequest(req, 201, { operation: "users-create" });
    res.status(201).json(ok({ user }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("duplicate") || message.includes("unique")) {
      logRequest(req, 409, { operation: "users-create", errorCode: "CONFLICT" });
      res.status(409).json(errorBody("CONFLICT", "A user with this email already exists."));
      return;
    }
    logRequest(req, 500, { operation: "users-create", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not create the user."));
  }
}

export async function authMeHandler(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    logRequest(req, 401, { operation: "auth-me" });
    res.status(401).json(errorBody("UNAUTHORIZED", "Authentication required."));
    return;
  }
  logRequest(req, 200, { operation: "auth-me" });
  res.status(200).json(
    ok({
      id: req.auth.profileId,
      name: req.auth.displayName,
      email: req.auth.email,
      role: req.auth.role,
    }),
  );
}
