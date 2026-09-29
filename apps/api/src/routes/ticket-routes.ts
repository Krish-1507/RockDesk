import { Router } from "express";
import { getTicketHandler, listTicketsHandler, patchTicketHandler } from "../controllers/ticket-controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const ticketRouter: Router = Router();

ticketRouter.use(requireAuth, requireAdmin);
ticketRouter.get("/", listTicketsHandler);
ticketRouter.get("/:id", getTicketHandler);
ticketRouter.patch("/:id", patchTicketHandler);
