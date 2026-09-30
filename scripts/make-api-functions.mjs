import fs from "node:fs";
import path from "node:path";

const apiDir = path.resolve(process.cwd(), "apps", "api", "api");
const files = [
  "health.mjs",
  "chat/sessions.mjs",
  "chat/message.mjs",
  "chat/sessions/[id].mjs",
  "tickets/index.mjs",
  "tickets/[id].mjs",
  "users/index.mjs",
  "auth/me.mjs",
];

for (const f of files) {
  const depth = f.split("/").length;
  const prefix = "../".repeat(depth);
  const full = path.join(apiDir, ...f.split("/"));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(
    full,
    `/** Thin function wrapper: Express routes internally. */\nimport app from "${prefix}dist/src/index.js";\n\nexport default function handler(req, res) {\n  app(req, res);\n}\n`,
  );
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(path.relative(process.cwd(), p));
  }
  return out;
}
console.log(walk(apiDir).join("\n"));
