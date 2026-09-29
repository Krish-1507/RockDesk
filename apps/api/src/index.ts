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

import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";

const env = getEnv();
const app = createApp();

if (process.env.VERCEL !== "1") {
  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

export default app;
