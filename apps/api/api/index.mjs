/**
 * Production serverless entry (plain JavaScript on purpose).
 * Bundled to a single file by esbuild. Pure request handler: it must never
 * listen on a port (the platform invokes the export per request).
 */
import app from "../dist/src/index.js";

export default function handler(req, res) {
  app(req, res);
}
