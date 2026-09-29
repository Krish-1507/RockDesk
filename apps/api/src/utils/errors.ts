export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "AI_TIMEOUT"
  | "AI_INVALID_OUTPUT"
  | "AI_UNAVAILABLE"
  | "DATABASE_ERROR"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, status: number, message: string, details: unknown = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function ok<T>(data: T): { data: T } {
  return { data };
}

export function errorBody(code: ErrorCode, message: string, details: unknown = []): {
  error: { code: ErrorCode; message: string; details: unknown };
} {
  return { error: { code, message, details } };
}
