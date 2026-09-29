import { execSync } from "node:child_process";
import { findRepoRoot } from "./repo-root.mjs";

const root = findRepoRoot();
execSync("npm install", { cwd: root, stdio: "inherit" });
