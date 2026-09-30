import { z } from "zod";
export declare const TicketPrioritySchema: z.ZodEnum<{
    Low: "Low";
    Medium: "Medium";
    High: "High";
    Urgent: "Urgent";
}>;
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;
export declare const TicketStatusSchema: z.ZodEnum<{
    Open: "Open";
    "In Progress": "In Progress";
    Resolved: "Resolved";
}>;
export type TicketStatus = z.infer<typeof TicketStatusSchema>;
export declare const ChatRoleSchema: z.ZodEnum<{
    user: "user";
    assistant: "assistant";
}>;
export type ChatRole = z.infer<typeof ChatRoleSchema>;
export declare const SupportedLanguageSchema: z.ZodString;
export declare const TicketIntentSchema: z.ZodEnum<{
    create_ticket: "create_ticket";
    general_chat: "general_chat";
    cancel_pending_ticket: "cancel_pending_ticket";
}>;
export type TicketIntent = z.infer<typeof TicketIntentSchema>;
export declare const TicketExtractionStatusSchema: z.ZodEnum<{
    complete: "complete";
    needs_clarification: "needs_clarification";
}>;
export type TicketExtractionStatus = z.infer<typeof TicketExtractionStatusSchema>;
export declare const AssigneeResolutionSchema: z.ZodEnum<{
    resolved: "resolved";
    ambiguous: "ambiguous";
    not_found: "not_found";
    explicitly_unassigned: "explicitly_unassigned";
    unknown: "unknown";
}>;
export type AssigneeResolution = z.infer<typeof AssigneeResolutionSchema>;
export declare const DueDateResolutionSchema: z.ZodEnum<{
    resolved: "resolved";
    ambiguous: "ambiguous";
    unknown: "unknown";
    no_deadline: "no_deadline";
}>;
export type DueDateResolution = z.infer<typeof DueDateResolutionSchema>;
/**
 * Structured interpretation produced by the LLM. The model suggests;
 * backend code validates, resolves DB-dependent values, and decides.
 */
export declare const TicketAnalysisSchema: z.ZodObject<{
    intent: z.ZodEnum<{
        create_ticket: "create_ticket";
        general_chat: "general_chat";
        cancel_pending_ticket: "cancel_pending_ticket";
    }>;
    status: z.ZodEnum<{
        complete: "complete";
        needs_clarification: "needs_clarification";
    }>;
    normalizedEnglishTitle: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    assigneeCandidate: z.ZodNullable<z.ZodString>;
    assigneeResolution: z.ZodEnum<{
        resolved: "resolved";
        ambiguous: "ambiguous";
        not_found: "not_found";
        explicitly_unassigned: "explicitly_unassigned";
        unknown: "unknown";
    }>;
    resolvedAssigneeId: z.ZodNullable<z.ZodString>;
    dueDate: z.ZodNullable<z.ZodString>;
    dueDateRaw: z.ZodNullable<z.ZodString>;
    dueDateResolution: z.ZodEnum<{
        resolved: "resolved";
        ambiguous: "ambiguous";
        unknown: "unknown";
        no_deadline: "no_deadline";
    }>;
    priority: z.ZodEnum<{
        Low: "Low";
        Medium: "Medium";
        High: "High";
        Urgent: "Urgent";
    }>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    language: z.ZodString;
    missingFields: z.ZodDefault<z.ZodArray<z.ZodEnum<{
        title: "title";
        assignee: "assignee";
        due_date: "due_date";
    }>>>;
    userResponse: z.ZodString;
}, z.core.$strip>;
export type TicketAnalysis = z.infer<typeof TicketAnalysisSchema>;
/** Pending draft persisted in chat_sessions.pending_ticket (Postgres is authoritative). */
export declare const PendingTicketSchema: z.ZodObject<{
    title: z.ZodNullable<z.ZodString>;
    originalTitle: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    assigneeCandidate: z.ZodNullable<z.ZodString>;
    assigneeId: z.ZodNullable<z.ZodString>;
    explicitlyUnassigned: z.ZodDefault<z.ZodBoolean>;
    dueDate: z.ZodNullable<z.ZodString>;
    explicitlyNoDeadline: z.ZodDefault<z.ZodBoolean>;
    ambiguousDateQuestion: z.ZodNullable<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<{
        Low: "Low";
        Medium: "Medium";
        High: "High";
        Urgent: "Urgent";
    }>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    language: z.ZodDefault<z.ZodString>;
    missingFields: z.ZodDefault<z.ZodArray<z.ZodEnum<{
        title: "title";
        assignee: "assignee";
        due_date: "due_date";
    }>>>;
    sourceMessageId: z.ZodNullable<z.ZodString>;
    disambiguationOptions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        department: z.ZodNullable<z.ZodString>;
        active: z.ZodBoolean;
    }, z.core.$strip>>>;
    duplicateCandidate: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        ticketNumber: z.ZodNumber;
        title: z.ZodString;
    }, z.core.$strip>>>;
    duplicateConfirmed: z.ZodDefault<z.ZodBoolean>;
    updatedTurn: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PendingTicket = z.infer<typeof PendingTicketSchema>;
export declare const MAX_USER_MESSAGE_LENGTH = 8000;
export declare const MAX_SEARCH_LENGTH = 200;
export declare const MAX_TAGS = 20;
export declare const MAX_TAG_LENGTH = 40;
//# sourceMappingURL=schemas.d.ts.map