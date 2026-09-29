import { Router } from "express";
import { createUserHandler, listUsersHandler } from "../controllers/user-controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const userRouter: Router = Router();

// Assignable-user directory: any signed-in user may read; only admins may create.
userRouter.get("/", requireAuth, listUsersHandler);
userRouter.post("/", requireAuth, requireAdmin, createUserHandler);
