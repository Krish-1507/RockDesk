import { buildSync } from "esbuild";
import path from "node:path";
import { findRepoRoot } from "./repo-root.mjs";

const root = findRepoRoot();
buildSync({
  entryPoints: [path.join(root, "apps", "api", "bundle.src.mjs")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: path.join(root, "apps", "api", "api", "index.js"),
  logLevel: "warning",
});
console.log("api bundle ready");
