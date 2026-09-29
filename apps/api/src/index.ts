import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Local dev loads the repo-root .env (walk up from CWD). On Vercel the
// environment provides variables directly, so missing files are fine.
let dir = process.cwd();
for (let i = 0; i < 4; i++) {
  const candidate = path.join(dir, ".env");
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
dotenv.config();

import express from "express";
import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";

/**
 * Never crash the serverless function at import time: if required
 * environment variables are missing (e.g. not yet set in Vercel),
 * export a degraded app that answers health checks and names the
 * missing variables (names only — never values) instead of an empty 500.
 */
function missingEnvNames(message: string): string[] {
  const names = new Set<string>();
  for (const match of message.matchAll(/([A-Z][A-Z0-9_]{2,})/g)) {
    if (match[1]) names.add(match[1]);
  }
  return [...names];
}

function createDegradedApp(missing: string[]): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  const status = { status: "degraded", missing };
  app.get(["/health", "/api/health"], (_req, res) => {
    res.status(200).json(status);
  });
  app.use((req, res) => {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: `API is misconfigured (missing environment: ${missing.join(", ") || "unknown"}). Set them in Vercel → Project → Settings → Environment Variables.`,
        details: [],
      },
      path: req.path,
    });
  });
  return app;
}

let app: express.Express;
let envPort = 4000;
try {
  const env = getEnv();
  envPort = env.PORT;
  app = createApp();
} catch (err) {
  const missing = missingEnvNames(err instanceof Error ? err.message : "");
  console.error(JSON.stringify({ route: "boot", message: "degraded mode", missing }));
  app = createDegradedApp(missing);
}

if (process.env.VERCEL !== "1") {
  app.listen(envPort, () => {
    console.log(`API listening on http://localhost:${envPort}`);
  });
}

export default app;
