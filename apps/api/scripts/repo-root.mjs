import fs from "node:fs";
import path from "node:path";

/** Find the repo root (contains apps/api + packages/shared) by walking up from any cwd. */
export function findRepoRoot() {
  let dir = process.cwd();
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
  throw new Error("vercel script: repo root not found");
}
