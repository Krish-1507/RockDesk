import { Router } from "express";
import { createChatSession, getChatSession, sendChatMessage, streamChatMessage } from "../controllers/chat-controller.js";
import { requireChatSession } from "../middleware/chat-session.js";
import { rateLimit } from "../middleware/rate-limit.js";

export const chatRouter: Router = Router();

chatRouter.post("/sessions", createChatSession);
chatRouter.post("/message", requireChatSession, rateLimit("chat-message"), sendChatMessage);
chatRouter.post("/stream", requireChatSession, rateLimit("chat-message"), streamChatMessage);
// Static alias (some static hosts do not match dynamic segments).
chatRouter.get("/sessions/by-id", requireChatSession, getChatSession);
chatRouter.get("/sessions/:id", requireChatSession, getChatSession);
