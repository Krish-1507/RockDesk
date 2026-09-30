import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "./repo-root.mjs";

/**
 * Copies the built @chat-to-ticket/shared output into apps/api/vendor/shared
 * so the api package installs standalone (Vercel classic project uploads only
 * apps/api). Runs automatically via predev/pretest/prebuild/prebundle hooks.
 */
const root = findRepoRoot();
execSync("npm run build --workspace=@chat-to-ticket/shared", { cwd: root, stdio: "inherit" });

const from = path.join(root, "packages", "shared");
const to = path.join(root, "apps", "api", "vendor", "shared");
fs.rmSync(to, { recursive: true, force: true });
fs.mkdirSync(to, { recursive: true });
fs.copyFileSync(path.join(from, "package.json"), path.join(to, "package.json"));
fs.cpSync(path.join(from, "dist"), path.join(to, "dist"), { recursive: true });
console.log("shared vendor synced");
