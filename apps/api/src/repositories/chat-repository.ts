import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessageRecord, ChatSessionState, PendingTicket } from "@chat-to-ticket/shared";
import { PendingTicketSchema } from "@chat-to-ticket/shared";

export async function createSession(db: SupabaseClient, tokenHash: string): Promise<ChatSessionState> {
  const { data, error } = await db
    .from("chat_sessions")
    .insert({ public_access_token_hash: tokenHash, pending_state: "idle", pending_ticket: null })
    .select("id, pending_ticket, pending_state, created_at, updated_at")
    .single();
  if (error) throw error;
  return toSessionState(data as SessionRow);
}

interface SessionRow {
  id: string;
  pending_ticket: unknown;
  pending_state: string;
  created_at: string;
  updated_at: string;
}

function parsePending(raw: unknown): PendingTicket | null {
  if (raw === null || raw === undefined) return null;
  const parsed = PendingTicketSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function toSessionState(row: SessionRow): ChatSessionState {
  const state = row.pending_state === "awaiting_clarification" ? "awaiting_clarification" : row.pending_state === "ready_to_create" ? "ready_to_create" : "idle";
  return {
    id: row.id,
    pendingTicket: parsePending(row.pending_ticket),
    pendingState: state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSession(db: SupabaseClient, sessionId: string): Promise<ChatSessionState | null> {
  const { data, error } = await db
    .from("chat_sessions")
    .select("id, pending_ticket, pending_state, created_at, updated_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toSessionState(data as SessionRow);
}

export async function savePendingState(
  db: SupabaseClient,
  sessionId: string,
  pendingTicket: PendingTicket | null,
  pendingState: ChatSessionState["pendingState"],
): Promise<void> {
  const { error } = await db
    .from("chat_sessions")
    .update({ pending_ticket: pendingTicket, pending_state: pendingState })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function clearPendingState(db: SupabaseClient, sessionId: string): Promise<void> {
  await savePendingState(db, sessionId, null, "idle");
}

interface MessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  detected_language: string | null;
  client_message_id: string | null;
  created_at: string;
}

function toMessage(row: MessageRow): ChatMessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    detectedLanguage: row.detected_language,
    clientMessageId: row.client_message_id,
    createdAt: row.created_at,
  };
}

export async function insertMessage(
  db: SupabaseClient,
  input: { sessionId: string; role: "user" | "assistant"; content: string; detectedLanguage?: string | null | undefined; clientMessageId?: string | null | undefined },
): Promise<ChatMessageRecord> {
  const { data, error } = await db
    .from("chat_messages")
    .insert({
      session_id: input.sessionId,
      role: input.role,
      content: input.content,
      detected_language: input.detectedLanguage ?? null,
      client_message_id: input.clientMessageId ?? null,
    })
    .select("id, session_id, role, content, detected_language, client_message_id, created_at")
    .single();
  if (error) throw error;
  return toMessage(data as MessageRow);
}

export async function findMessageByClientId(
  db: SupabaseClient,
  sessionId: string,
  clientMessageId: string,
): Promise<ChatMessageRecord | null> {
  const { data, error } = await db
    .from("chat_messages")
    .select("id, session_id, role, content, detected_language, client_message_id, created_at")
    .eq("session_id", sessionId)
    .eq("client_message_id", clientMessageId)
    .eq("role", "user")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toMessage(data as MessageRow);
}

export async function listMessages(db: SupabaseClient, sessionId: string, limit = 50): Promise<ChatMessageRecord[]> {
  const { data, error } = await db
    .from("chat_messages")
    .select("id, session_id, role, content, detected_language, client_message_id, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data as MessageRow[]).map(toMessage);
}

export async function latestAssistantAfter(
  db: SupabaseClient,
  sessionId: string,
  afterIso: string,
): Promise<ChatMessageRecord | null> {
  const { data, error } = await db
    .from("chat_messages")
    .select("id, session_id, role, content, detected_language, client_message_id, created_at")
    .eq("session_id", sessionId)
    .eq("role", "assistant")
    .gt("created_at", afterIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toMessage(data as MessageRow);
}

export async function latestTicketForSession(db: SupabaseClient, sessionId: string): Promise<{ id: string; ticketNumber: number } | null> {
  const { data, error } = await db
    .from("tickets")
    .select("id, ticket_number")
    .eq("source_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { id: string; ticket_number: number };
  return { id: row.id, ticketNumber: row.ticket_number };
}
