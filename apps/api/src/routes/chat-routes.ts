import { Router } from "express";
import { createChatSession, getChatSession, sendChatMessage } from "../controllers/chat-controller.js";
import { requireChatSession } from "../middleware/chat-session.js";
import { rateLimit } from "../middleware/rate-limit.js";

export const chatRouter: Router = Router();

chatRouter.post("/sessions", createChatSession);
chatRouter.post("/message", rateLimit("chat-message"), requireChatSession, sendChatMessage);
chatRouter.get("/sessions/:id", requireChatSession, getChatSession);
