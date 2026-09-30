import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { getEnv } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { authRouter } from "./routes/auth-routes.js";
import { chatRouter } from "./routes/chat-routes.js";
import { ticketRouter } from "./routes/ticket-routes.js";
import { userRouter } from "./routes/user-routes.js";
import { errorBody } from "./utils/errors.js";

export function createApp(): express.Express {
  const env = getEnv();
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(requestIdMiddleware);
  const origins = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("CORS blocked"));
        }
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // Public smoke test routed through the same path prefix as everything else.
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/chat", chatRouter);
  app.use("/api/tickets", ticketRouter);
  app.use("/api/users", userRouter);
  app.use("/api/auth", authRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json(errorBody("NOT_FOUND", "Route not found."));
  });

  // Never leak stack traces to clients; keep diagnostics server-side.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json(errorBody("VALIDATION_ERROR", "Request body must be valid JSON."));
      return;
    }
    console.error(JSON.stringify({ route: "unhandled", message: err.message }));
    res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong. Please try again."));
  });

  return app;
}
