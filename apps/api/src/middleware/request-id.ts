import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export interface RequestWithId extends Request {
  requestId: string;
  startTime: number;
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const r = req as RequestWithId;
  r.requestId = randomUUID();
  r.startTime = Date.now();
  next();
}

export function getRequestId(req: Request): string {
  return (req as RequestWithId).requestId ?? "unknown";
}

interface LogFields {
  requestId: string;
  route: string;
  statusCode: number;
  durationMs: number;
  operation?: string;
  errorCode?: string;
}

export function logRequest(req: Request, statusCode: number, extra?: { operation?: string; errorCode?: string }): void {
  const r = req as RequestWithId;
  const fields: LogFields = {
    requestId: r.requestId ?? "unknown",
    route: `${req.method} ${req.path}`,
    statusCode,
    durationMs: Date.now() - (r.startTime ?? Date.now()),
    ...extra,
  };
  if (statusCode >= 500) {
    console.error(JSON.stringify(fields));
  } else {
    console.log(JSON.stringify(fields));
  }
}
