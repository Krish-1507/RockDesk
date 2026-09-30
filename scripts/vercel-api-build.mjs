import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "./repo-root.mjs";

const root = findRepoRoot();
execSync("npm run build --workspace=@chat-to-ticket/shared", { cwd: root, stdio: "inherit" });
execSync("npm run build --workspace=@chat-to-ticket/api", { cwd: root, stdio: "inherit" });
execSync("node ./scripts/esbuild-bundle.mjs", { cwd: root, stdio: "inherit" });
