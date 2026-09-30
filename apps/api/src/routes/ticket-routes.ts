import { Router } from "express";
import { getTicketHandler, listTicketsHandler, patchTicketHandler } from "../controllers/ticket-controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const ticketRouter: Router = Router();

ticketRouter.use(requireAuth, requireAdmin);
ticketRouter.get("/", listTicketsHandler);
// Static aliases (registered before :id; some static hosts skip dynamic files).
ticketRouter.get("/by-id", getTicketHandler);
ticketRouter.patch("/by-id", patchTicketHandler);
ticketRouter.get("/:id", getTicketHandler);
ticketRouter.patch("/:id", patchTicketHandler);
