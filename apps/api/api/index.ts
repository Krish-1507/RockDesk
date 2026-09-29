import type { Request, Response } from "express";

/**
 * Defensive serverless entry: if the application module fails to load
 * (missing dependency, env, bundling issue), answer with the load error
 * instead of an opaque FUNCTION_INVOCATION_FAILED.
 */
async function loadApp(): Promise<(req: Request, res: Response) => void> {
  try {
    const mod = (await import("../src/index.js")) as { default: (req: Request, res: Response) => void };
    return mod.default;
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 500) : "unknown load error";
    console.error(JSON.stringify({ route: "entry", message }));
    return (_req: Request, res: Response) => {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: `API failed to start: ${message}`,
          details: [],
        },
      });
    };
  }
}

const handlerPromise = loadApp();

export default function handler(req: Request, res: Response): void {
  handlerPromise
    .then((handler) => handler(req, res))
    .catch(() => {
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "API failed to start.", details: [] },
      });
    });
}
