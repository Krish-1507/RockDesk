import type { Request, Response } from "express";
import { TicketListQuerySchema, UpdateTicketSchema, UuidSchema } from "../schemas/http.js";
import { getSupabaseAdmin } from "../config/supabase.js";
import { getTicketById, deleteTicket, listTicketEvents, listTickets, updateTicket } from "../repositories/ticket-repository.js";
import { getUserById } from "../repositories/user-repository.js";
import { errorBody, ok } from "../utils/errors.js";
import { logRequest } from "../middleware/request-id.js";

export async function listTicketsHandler(req: Request, res: Response): Promise<void> {
  const parsed = TicketListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    logRequest(req, 400, { operation: "tickets-list" });
    res.status(400).json(errorBody("VALIDATION_ERROR", "Invalid query parameters.", parsed.error.issues));
    return;
  }
  try {
    const db = getSupabaseAdmin();
    const q = parsed.data;
    const page = await listTickets(db, {
      search: q.search,
      status: q.status,
      assigneeId: q.assigneeId,
      unassigned: q.unassigned === "true",
      priority: q.priority,
      dueFrom: q.dueFrom,
      dueTo: q.dueTo,
      overdue: q.overdue === "true",
      page: q.page,
      pageSize: q.pageSize,
    });
    logRequest(req, 200, { operation: "tickets-list" });
    res.status(200).json(ok(page));
  } catch {
    logRequest(req, 500, { operation: "tickets-list", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not load tickets."));
  }
}

export async function getTicketHandler(req: Request, res: Response): Promise<void> {
  const rawId = typeof req.query.id === "string" ? req.query.id : req.params.id;
  const parsed = UuidSchema.safeParse(rawId);
  if (!parsed.success) {
    logRequest(req, 400, { operation: "tickets-get" });
    res.status(400).json(errorBody("VALIDATION_ERROR", "Invalid ticket id."));
    return;
  }
  try {
    const db = getSupabaseAdmin();
    const ticket = await getTicketById(db, parsed.data);
    if (!ticket) {
      logRequest(req, 404, { operation: "tickets-get" });
      res.status(404).json(errorBody("NOT_FOUND", "Ticket not found."));
      return;
    }
    const events = await listTicketEvents(db, parsed.data);
    logRequest(req, 200, { operation: "tickets-get" });
    res.status(200).json(ok({ ticket, events }));
  } catch {
    logRequest(req, 500, { operation: "tickets-get", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not load the ticket."));
  }
}

export async function patchTicketHandler(req: Request, res: Response): Promise<void> {
  const rawId = typeof req.query.id === "string" ? req.query.id : req.params.id;
  const idParsed = UuidSchema.safeParse(rawId);
  const bodyParsed = UpdateTicketSchema.safeParse(req.body);
  if (!idParsed.success || !bodyParsed.success) {
    logRequest(req, 400, { operation: "tickets-patch" });
    res.status(400).json(
      errorBody("VALIDATION_ERROR", "Invalid ticket update.", [
        ...(idParsed.success ? [] : idParsed.error.issues),
        ...(bodyParsed.success ? [] : bodyParsed.error.issues),
      ]),
    );
    return;
  }
  try {
    const db = getSupabaseAdmin();
    const body = bodyParsed.data;
    if (body.assigneeId) {
      const user = await getUserById(db, body.assigneeId);
      if (!user || !user.active) {
        logRequest(req, 400, { operation: "tickets-patch" });
        res.status(400).json(errorBody("VALIDATION_ERROR", "Assignee must reference an active user."));
        return;
      }
    }
    const updated = await updateTicket(db, idParsed.data, body, req.auth?.profileId ?? null);
    if (!updated) {
      logRequest(req, 404, { operation: "tickets-patch" });
      res.status(404).json(errorBody("NOT_FOUND", "Ticket not found."));
      return;
    }
    logRequest(req, 200, { operation: "tickets-patch" });
    res.status(200).json(ok({ ticket: updated }));
  } catch {
    logRequest(req, 500, { operation: "tickets-patch", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not update the ticket."));
  }
}

export async function deleteTicketHandler(req: Request, res: Response): Promise<void> {
  const rawId = typeof req.query.id === "string" ? req.query.id : req.params.id;
  const parsed = UuidSchema.safeParse(rawId);
  if (!parsed.success) {
    logRequest(req, 400, { operation: "tickets-delete" });
    res.status(400).json(errorBody("VALIDATION_ERROR", "Invalid ticket id."));
    return;
  }
  try {
    const db = getSupabaseAdmin();
    const removed = await deleteTicket(db, parsed.data);
    if (!removed) {
      logRequest(req, 404, { operation: "tickets-delete" });
      res.status(404).json(errorBody("NOT_FOUND", "Ticket not found."));
      return;
    }
    logRequest(req, 200, { operation: "tickets-delete" });
    res.status(200).json(ok({ deleted: true }));
  } catch {
    logRequest(req, 500, { operation: "tickets-delete", errorCode: "DATABASE_ERROR" });
    res.status(500).json(errorBody("DATABASE_ERROR", "Could not delete the ticket."));
  }
}
