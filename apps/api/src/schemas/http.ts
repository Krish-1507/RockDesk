import { z } from "zod";
import { MAX_SEARCH_LENGTH, MAX_USER_MESSAGE_LENGTH, TicketPrioritySchema, TicketStatusSchema } from "@chat-to-ticket/shared";

export const UuidSchema = z.string().uuid();

export const SendMessageSchema = z.object({
  sessionId: UuidSchema,
  message: z.string().trim().min(1).max(MAX_USER_MESSAGE_LENGTH),
  timezone: z.string().min(1).max(60).default("Asia/Kolkata"),
  clientMessageId: z.string().uuid().optional(),
});

export const TicketListQuerySchema = z.object({
  search: z.string().max(MAX_SEARCH_LENGTH).optional(),
  status: TicketStatusSchema.optional(),
  assigneeId: UuidSchema.optional(),
  unassigned: z.enum(["true", "false"]).optional(),
  priority: TicketPrioritySchema.optional(),
  dueFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  overdue: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpdateTicketSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    priority: TicketPrioritySchema.optional(),
    status: TicketStatusSchema.optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field must be provided." });

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  department: z.string().trim().max(120).nullable().optional(),
  role: z.enum(["admin", "member"]).optional(),
});
