import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "./repo-root.mjs";

const root = findRepoRoot();
execSync("npm run build --workspace=@chat-to-ticket/shared", { cwd: root, stdio: "inherit" });
execSync("npm run build --workspace=@chat-to-ticket/api", { cwd: root, stdio: "inherit" });
execSync("npm run bundle --workspace=@chat-to-ticket/api", { cwd: root, stdio: "inherit" });
// Guarantee the callable shape for CJS serverless launchers regardless of interop.
fs.appendFileSync(
  path.join(root, "apps", "api", "api", "bundle.cjs"),
  "\nmodule.exports = module.exports.default;\n",
);
console.log("api bundle ready");
