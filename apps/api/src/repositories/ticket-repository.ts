import type { SupabaseClient } from "@supabase/supabase-js";
import type { TicketPriority, TicketRecord, TicketStatus } from "@chat-to-ticket/shared";

interface TicketRow {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  original_title: string | null;
  assignee_id: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  tags: string[];
  language: string | null;
  source_message_id: string | null;
  source_type: string;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; name: string; email: string; department: string | null; active: boolean } | null;
  source_message?: { content: string } | null;
}

function toRecord(row: TicketRow): TicketRecord {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    title: row.title,
    description: row.description,
    originalTitle: row.original_title,
    assigneeId: row.assignee_id,
    assignee: row.assignee
      ? { id: row.assignee.id, name: row.assignee.name, email: row.assignee.email, department: row.assignee.department, active: row.assignee.active }
      : null,
    dueDate: row.due_date,
    priority: row.priority as TicketRecord["priority"],
    status: row.status as TicketRecord["status"],
    tags: row.tags ?? [],
    language: row.language,
    sourceMessageId: row.source_message_id,
    sourceMessage: row.source_message?.content ?? null,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  id, ticket_number, title, description, original_title, assignee_id, due_date,
  priority, status, tags, language, source_message_id, source_type, created_at, updated_at,
  assignee:app_users!tickets_assignee_id_fkey (id, name, email, department, active),
  source_message:chat_messages!tickets_source_message_id_fkey (content)
`;

export interface CreateTicketInput {
  title: string;
  description: string;
  originalTitle: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  priority: TicketPriority;
  tags: string[];
  language: string | null;
  sourceMessageId: string | null;
  sourceSessionId: string | null;
}

/**
 * Atomically creates the ticket + TICKET_CREATED event and clears the session
 * draft via the create_ticket_from_chat RPC. Falls back to ordered writes only
 * if the RPC is unavailable (never claim creation before persistence).
 */
export async function createTicketAtomic(db: SupabaseClient, input: CreateTicketInput): Promise<TicketRecord> {
  const { data, error } = await db.rpc("create_ticket_from_chat", {
    p_title: input.title,
    p_description: input.description,
    p_original_title: input.originalTitle,
    p_assignee_id: input.assigneeId,
    p_due_date: input.dueDate,
    p_priority: input.priority,
    p_tags: input.tags,
    p_language: input.language,
    p_source_message_id: input.sourceMessageId,
    p_source_session_id: input.sourceSessionId,
  });
  if (error) throw error;
  const ticketId = data as string;
  const created = await getTicketById(db, ticketId);
  if (!created) throw new Error("Ticket creation did not persist.");
  return created;
}

export async function getTicketById(db: SupabaseClient, id: string): Promise<TicketRecord | null> {
  const { data, error } = await db.from("tickets").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toRecord(data as unknown as TicketRow);
}

export interface TicketFilters {
  search?: string | undefined;
  status?: TicketStatus | undefined;
  assigneeId?: string | undefined;
  unassigned?: boolean | undefined;
  priority?: TicketPriority | undefined;
  dueFrom?: string | undefined;
  dueTo?: string | undefined;
  overdue?: boolean | undefined;
  page: number;
  pageSize: number;
}

export interface TicketPage {
  items: TicketRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listTickets(db: SupabaseClient, filters: TicketFilters): Promise<TicketPage> {
  let query = db.from("tickets").select(SELECT, { count: "exact" });
  if (filters.search) {
    const term = filters.search.slice(0, 200);
    if (/^#?\d+$/.test(term.trim())) {
      query = query.eq("ticket_number", Number.parseInt(term.trim().replace("#", ""), 10));
    } else {
      // Quote PostgREST values so punctuation cannot alter the filter grammar.
      const pattern = `"%${term.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[%_]/g, "\\$&")}%"`;
      query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
    }
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
  if (filters.unassigned) query = query.is("assignee_id", null);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.dueFrom) query = query.gte("due_date", filters.dueFrom);
  if (filters.dueTo) query = query.lte("due_date", filters.dueTo);
  if (filters.overdue) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.lt("due_date", today).neq("status", "Resolved");
  }
  query = query.order("created_at", { ascending: false });
  const from = (filters.page - 1) * filters.pageSize;
  query = query.range(from, from + filters.pageSize - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as TicketRow[];
  const total = count ?? rows.length;
  return {
    items: rows.map(toRecord),
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export interface UpdateTicketInput {
  title?: string | undefined;
  description?: string | undefined;
  assigneeId?: string | null | undefined;
  dueDate?: string | null | undefined;
  priority?: TicketPriority | undefined;
  status?: TicketStatus | undefined;
  tags?: string[] | undefined;
}

export async function updateTicket(
  db: SupabaseClient,
  id: string,
  input: UpdateTicketInput,
  actorId: string | null,
): Promise<TicketRecord | null> {
  const before = await getTicketById(db, id);
  if (!before) return null;
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.assigneeId !== undefined) patch.assignee_id = input.assigneeId;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (Object.keys(patch).length > 0) {
    const { error } = await db.from("tickets").update(patch).eq("id", id);
    if (error) throw error;
  }
  const events: Array<{ ticket_id: string; actor_id: string | null; event_type: string; metadata: Record<string, unknown> }> = [];
  if (input.status !== undefined && input.status !== before.status) {
    events.push({ ticket_id: id, actor_id: actorId, event_type: "STATUS_CHANGED", metadata: { from: before.status, to: input.status } });
  }
  if (input.assigneeId !== undefined && input.assigneeId !== before.assigneeId) {
    events.push({ ticket_id: id, actor_id: actorId, event_type: "ASSIGNEE_CHANGED", metadata: { from: before.assigneeId, to: input.assigneeId } });
  }
  if (input.dueDate !== undefined && input.dueDate !== before.dueDate) {
    events.push({ ticket_id: id, actor_id: actorId, event_type: "DUE_DATE_CHANGED", metadata: { from: before.dueDate, to: input.dueDate } });
  }
  if (input.priority !== undefined && input.priority !== before.priority) {
    events.push({ ticket_id: id, actor_id: actorId, event_type: "PRIORITY_CHANGED", metadata: { from: before.priority, to: input.priority } });
  }
  if (events.length > 0) {
    await db.from("ticket_events").insert(events);
  } else if (Object.keys(patch).length > 0) {
    await db.from("ticket_events").insert({ ticket_id: id, actor_id: actorId, event_type: "TICKET_UPDATED", metadata: {} });
  }
  return getTicketById(db, id);
}

/**
 * Deletes a ticket by id. Activity rows go away automatically through
 * `on delete cascade`. Returns false when the ticket does not exist.
 */
export async function deleteTicket(db: SupabaseClient, id: string): Promise<boolean> {
  const existing = await getTicketById(db, id);
  if (!existing) return false;
  const { error } = await db.from("tickets").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function listTicketEvents(
  db: SupabaseClient,
  ticketId: string,
): Promise<Array<{ id: string; eventType: string; metadata: Record<string, unknown>; createdAt: string }>> {
  const { data, error } = await db
    .from("ticket_events")
    .select("id, event_type, metadata, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; event_type: string; metadata: Record<string, unknown>; created_at: string }>).map((r) => ({
    id: r.id,
    eventType: r.event_type,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
  }));
}
