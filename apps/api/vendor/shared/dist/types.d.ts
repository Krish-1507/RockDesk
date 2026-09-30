import type { AssigneeResolution, ChatRole, DueDateResolution, PendingTicket, TicketAnalysis, TicketIntent, TicketPriority, TicketStatus } from "./schemas.js";
export interface AssignableUser {
    id: string;
    name: string;
    email: string;
    department: string | null;
    active: boolean;
}
export interface AppProfile {
    id: string;
    authUserId: string | null;
    name: string;
    email: string;
    role: "admin" | "member";
    department: string | null;
}
export interface ChatSessionState {
    id: string;
    pendingTicket: PendingTicket | null;
    pendingState: "idle" | "awaiting_clarification" | "ready_to_create";
    createdAt: string;
    updatedAt: string;
}
export interface ChatMessageRecord {
    id: string;
    sessionId: string;
    role: ChatRole;
    content: string;
    detectedLanguage: string | null;
    clientMessageId: string | null;
    createdAt: string;
}
export interface TicketRecord {
    id: string;
    ticketNumber: number;
    title: string;
    description: string;
    originalTitle: string | null;
    assigneeId: string | null;
    assignee: AssignableUser | null;
    dueDate: string | null;
    priority: TicketPriority;
    status: TicketStatus;
    tags: string[];
    language: string | null;
    sourceMessageId: string | null;
    sourceMessage: string | null;
    sourceType: string;
    createdAt: string;
    updatedAt: string;
}
export interface TicketAnalysisInput {
    nowIso: string;
    todayInTimezone: string;
    timezone: string;
    assignableUsers: AssignableUser[];
    recentConversation: Array<{
        role: ChatRole;
        content: string;
    }>;
    pendingDraft: PendingTicket | null;
    latestMessage: string;
}
export interface AIProvider {
    analyzeTicket(input: TicketAnalysisInput): Promise<TicketAnalysis>;
}
export type { PendingTicket, TicketAnalysis, TicketIntent, TicketPriority, TicketStatus };
export type { AssigneeResolution, ChatRole, DueDateResolution };
//# sourceMappingURL=types.d.ts.map