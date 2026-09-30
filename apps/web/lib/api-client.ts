import { getAccessToken } from "./supabase";

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function apiBase(): string {
  // The Next.js route forwards to the configured Express API on the server.
  return "";
}

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as {
    data?: T;
    error?: { code: string; message: string };
  } | null;
  if (!res.ok) {
    throw new ApiError(json?.error?.code ?? "INTERNAL_ERROR", res.status, json?.error?.message ?? "Something went wrong.");
  }
  if (!json || !("data" in json)) {
    throw new ApiError("INVALID_RESPONSE", 502, "The server returned an unexpected response. Please try again.");
  }
  return json.data as T;
}

export interface ChatSessionCreate {
  sessionId: string;
  sessionToken: string;
}

export interface AssistantMessage {
  id: string;
  content: string;
  detectedLanguage: string | null;
}

export interface DraftView {
  title: string | null;
  description: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  priority: string;
  missingFields: string[];
  disambiguationOptions: Array<{ id: string; name: string; department: string | null }>;
  duplicateCandidate: { ticketNumber: number; title: string } | null;
}

export interface CreatedTicketView {
  id: string;
  ticketNumber: number;
  title: string;
  assignee: { id: string; name: string } | null;
  dueDate: string | null;
  priority: string;
  status: string;
}

export interface ChatMessageResponse {
  sessionId: string;
  assistantMessage: AssistantMessage;
  state: "idle" | "awaiting_clarification";
  draft: DraftView | null;
  ticket: CreatedTicketView | null;
  duplicate: { ticketNumber: number; title: string } | null;
}

export async function createChatSession(): Promise<ChatSessionCreate> {
  const res = await fetch(`${apiBase()}/api/chat/sessions`, { method: "POST" });
  return parse<ChatSessionCreate>(res);
}

export async function sendChatMessage(args: {
  sessionId: string;
  sessionToken: string;
  message: string;
  timezone: string;
  clientMessageId: string;
}): Promise<ChatMessageResponse> {
  const res = await fetch(`${apiBase()}/api/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Chat-Session-Token": args.sessionToken,
    },
    body: JSON.stringify({
      sessionId: args.sessionId,
      message: args.message,
      timezone: args.timezone,
      clientMessageId: args.clientMessageId,
    }),
  });
  return parse<ChatMessageResponse>(res);
}

/**
 * Streaming variant: renders the validated reply progressively, then resolves
 * with the same payload shape as sendChatMessage. Throws when the server does
 * not speak event-stream so the caller can fall back to the JSON endpoint.
 */
export async function streamChatMessage(
  args: {
    sessionId: string;
    sessionToken: string;
    message: string;
    timezone: string;
    clientMessageId: string;
  },
  onToken: (text: string) => void,
): Promise<ChatMessageResponse> {
  const res = await fetch(`${apiBase()}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Chat-Session-Token": args.sessionToken,
    },
    body: JSON.stringify({
      sessionId: args.sessionId,
      message: args.message,
      timezone: args.timezone,
      clientMessageId: args.clientMessageId,
    }),
  });
  if (!res.ok) {
    // parse() throws the server's ApiError for non-ok responses.
    return parse<ChatMessageResponse>(res);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !res.body) {
    throw new ApiError("STREAM_UNSUPPORTED", 502, "Streaming is not available. Please try again.");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload: ChatMessageResponse | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const eventLine = frame.split("\n").find((l) => l.startsWith("event:"));
      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!eventLine || !dataLine) continue;
      const event = eventLine.slice("event:".length).trim();
      const data = JSON.parse(dataLine.slice("data:".length).trim()) as unknown;
      if (event === "token" && data && typeof data === "object" && "text" in data && typeof (data as { text: unknown }).text === "string") {
        onToken((data as { text: string }).text);
      } else if (event === "done") {
        donePayload = data as ChatMessageResponse;
      } else if (event === "error") {
        const errData = data as { error?: { code?: string; message?: string } };
        throw new ApiError(errData?.error?.code ?? "INTERNAL_ERROR", res.status, errData?.error?.message ?? "Something went wrong.");
      }
    }
  }
  if (!donePayload) {
    throw new ApiError("STREAM_INCOMPLETE", 502, "The reply was cut off. Please try again.");
  }
  return donePayload;
}

export interface ChatHistory {
  session: { id: string; pendingTicket: DraftView | null; pendingState: string };
  messages: Array<{ id: string; role: "user" | "assistant"; content: string; detectedLanguage: string | null; createdAt: string; ticket?: CreatedTicketView | null }>;
}

export async function loadChatHistory(sessionId: string, sessionToken: string): Promise<ChatHistory> {
  const res = await fetch(`${apiBase()}/api/chat/sessions/by-id?sessionId=${encodeURIComponent(sessionId)}`, {
    headers: { "X-Chat-Session-Token": sessionToken },
  });
  return parse<ChatHistory>(res);
}

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new ApiError("UNAUTHORIZED", 401, "Please sign in.");
  return fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export interface TicketListItem {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  assignee: { id: string; name: string; department: string | null } | null;
  dueDate: string | null;
  priority: string;
  status: string;
  tags: string[];
  language: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketPage {
  items: TicketListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listTickets(query: string): Promise<TicketPage> {
  const res = await authed(`/api/tickets${query}`);
  return parse<TicketPage>(res);
}

export interface TicketDetail {
  ticket: TicketListItem & { originalTitle: string | null; sourceMessage: string | null; sourceType: string };
  events: Array<{ id: string; eventType: string; metadata: Record<string, unknown>; createdAt: string }>;
}

export async function getTicket(id: string): Promise<TicketDetail> {
  const res = await authed(`/api/tickets/by-id?id=${encodeURIComponent(id)}`);
  return parse<TicketDetail>(res);
}

export async function patchTicket(id: string, patch: Record<string, unknown>): Promise<{ ticket: TicketListItem }> {
  const res = await authed(`/api/tickets/by-id?id=${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
  return parse<{ ticket: TicketListItem }>(res);
}

export async function deleteTicket(id: string): Promise<{ deleted: boolean }> {
  const res = await authed(`/api/tickets/by-id?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  return parse<{ deleted: boolean }>(res);
}

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  department: string | null;
  active: boolean;
}

export async function listUsers(search?: string): Promise<{ users: DirectoryUser[] }> {
  const res = await authed(`/api/users${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  return parse<{ users: DirectoryUser[] }>(res);
}

export async function createUser(input: { name: string; email: string; department?: string }): Promise<{ user: DirectoryUser }> {
  const res = await authed("/api/users", { method: "POST", body: JSON.stringify(input) });
  return parse<{ user: DirectoryUser }>(res);
}

export async function authMe(): Promise<{ id: string | null; name: string | null; email: string | null; role: string | null }> {
  const res = await authed("/api/auth/me");
  return parse(res);
}
