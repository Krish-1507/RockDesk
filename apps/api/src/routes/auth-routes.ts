import { Router } from "express";
import { authMeHandler } from "../controllers/user-controller.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter: Router = Router();

authRouter.get("/me", requireAuth, authMeHandler);
