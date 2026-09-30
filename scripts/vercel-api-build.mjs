import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Anchor on THIS file's location (cwd varies across builders).
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (
      fs.existsSync(path.join(dir, "apps", "api", "package.json")) &&
      fs.existsSync(path.join(dir, "packages", "shared", "package.json"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function findApiDir(start) {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "@chat-to-ticket/api") return dir;
      } catch {
        // keep walking
      }
    }
    if (fs.existsSync(path.join(dir, "apps", "api", "package.json"))) {
      return path.join(dir, "apps", "api");
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("vercel script: api package not found");
}

const root = findRoot(scriptsDir);
if (root) {
  execSync("npm run build --workspace=@chat-to-ticket/shared", { cwd: root, stdio: "inherit" });
  execSync("npm run build --workspace=@chat-to-ticket/api", { cwd: root, stdio: "inherit" });
} else {
  // Standalone api upload: vendor/ already carries the shared dist.
  const apiDir = findApiDir(scriptsDir);
  execSync("npx tsc -p tsconfig.json", { cwd: apiDir, stdio: "inherit" });
}
console.log("api build ready");
