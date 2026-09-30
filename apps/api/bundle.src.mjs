/**
 * esbuild entry for the deployed catch-all function (plain JavaScript).
 * Bundled by `npm run bundle` into api/[...all].mjs. Never import this file
 * at runtime — it is build source only.
 */
import app from "./dist/src/index.js";

export default function handler(req, res) {
  app(req, res);
}
