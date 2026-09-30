import { z } from "zod";
export const TicketPrioritySchema = z.enum(["Low", "Medium", "High", "Urgent"]);
export const TicketStatusSchema = z.enum(["Open", "In Progress", "Resolved"]);
export const ChatRoleSchema = z.enum(["user", "assistant"]);
export const SupportedLanguageSchema = z
    .string()
    .min(2)
    .max(16)
    .describe("BCP-47-ish language code detected from the latest user message, e.g. en, hi, es, ar, zh");
export const TicketIntentSchema = z.enum([
    "create_ticket",
    "general_chat",
    "cancel_pending_ticket",
]);
export const TicketExtractionStatusSchema = z.enum(["complete", "needs_clarification"]);
export const AssigneeResolutionSchema = z.enum([
    "resolved",
    "ambiguous",
    "not_found",
    "explicitly_unassigned",
    "unknown",
]);
export const DueDateResolutionSchema = z.enum([
    "resolved",
    "ambiguous",
    "no_deadline",
    "unknown",
]);
/**
 * Structured interpretation produced by the LLM. The model suggests;
 * backend code validates, resolves DB-dependent values, and decides.
 */
export const TicketAnalysisSchema = z.object({
    intent: TicketIntentSchema,
    status: TicketExtractionStatusSchema,
    normalizedEnglishTitle: z.string().min(3).max(200).nullable(),
    description: z.string().min(1).max(4000).nullable(),
    assigneeCandidate: z.string().min(1).max(120).nullable(),
    assigneeResolution: AssigneeResolutionSchema,
    resolvedAssigneeId: z.string().uuid().nullable(),
    dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be ISO YYYY-MM-DD")
        .nullable(),
    dueDateRaw: z.string().max(200).nullable(),
    dueDateResolution: DueDateResolutionSchema,
    priority: TicketPrioritySchema,
    tags: z.array(z.string().min(1).max(40)).max(20).default([]),
    language: SupportedLanguageSchema,
    missingFields: z.array(z.enum(["title", "assignee", "due_date"])).default([]),
    userResponse: z.string().min(1).max(2000),
});
/** Pending draft persisted in chat_sessions.pending_ticket (Postgres is authoritative). */
export const PendingTicketSchema = z.object({
    title: z.string().min(1).max(200).nullable(),
    originalTitle: z.string().max(400).nullable(),
    description: z.string().max(4000).nullable(),
    assigneeCandidate: z.string().max(120).nullable(),
    assigneeId: z.string().uuid().nullable(),
    explicitlyUnassigned: z.boolean().default(false),
    dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    explicitlyNoDeadline: z.boolean().default(false),
    ambiguousDateQuestion: z.string().max(300).nullable(),
    priority: TicketPrioritySchema.default("Medium"),
    tags: z.array(z.string().min(1).max(40)).max(20).default([]),
    language: z.string().min(2).max(16).default("en"),
    missingFields: z.array(z.enum(["title", "assignee", "due_date"])).default([]),
    sourceMessageId: z.string().uuid().nullable(),
    disambiguationOptions: z
        .array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
        department: z.string().nullable(),
        active: z.boolean(),
    }))
        .default([]),
    duplicateCandidate: z
        .object({
        id: z.string().uuid(),
        ticketNumber: z.number().int(),
        title: z.string().max(200),
    })
        .nullable()
        .default(null),
    duplicateConfirmed: z.boolean().default(false),
    updatedTurn: z.number().int().nonnegative().default(0),
});
export const MAX_USER_MESSAGE_LENGTH = 8000;
export const MAX_SEARCH_LENGTH = 200;
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
//# sourceMappingURL=schemas.js.map