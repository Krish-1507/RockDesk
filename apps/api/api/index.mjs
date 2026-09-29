/**
 * Production entry (plain JavaScript on purpose — the service builder
 * deploys this file as-is, so zero TypeScript syntax allowed).
 *
 * Dual-mode: Vercel services may run this as a long-lived server (PORT is
 * set) or invoke the default export per request (classic function). We
 * support both: listen when PORT is present, always export a handler.
 * Application code is imported from ../dist (tsc build output).
 */
import express from "express";

async function boot() {
  try {
    const [{ createApp }, { getEnv }] = await Promise.all([
      import("../dist/src/app.js"),
      import("../dist/src/config/env.js"),
    ]);
    getEnv();
    return createApp();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const missing = [...new Set((message.match(/[A-Z][A-Z0-9_]{2,}/g) ?? []))];
    console.error(JSON.stringify({ route: "boot", message: "degraded mode", missing }));
    const app = express();
    app.disable("x-powered-by");
    app.use(express.json({ limit: "16kb" }));
    app.get(["/health", "/api/health"], (_req, res) => {
      res.status(200).json({ status: "degraded", missing });
    });
    app.use((req, res) => {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: `API is misconfigured (missing environment: ${missing.join(", ") || "unknown"}).`,
          details: [],
        },
        path: req.path,
      });
    });
    return app;
  }
}

const appPromise = boot();

if (process.env.PORT) {
  const port = Number(process.env.PORT) || 4000;
  appPromise.then((app) => {
    app.listen(port, () => {
      console.log(`RockDesk API listening on ${port}`);
    });
  });
}

export default function handler(req, res) {
  appPromise.then((app) => app(req, res)).catch(() => {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "API failed to start.", details: [] },
    });
  });
}
