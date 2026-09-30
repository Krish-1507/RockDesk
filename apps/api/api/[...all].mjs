/**
 * Catch-all API function: every /api/* path lands here and the Express
 * application routes internally. No vercel.json rewrites required.
 */
import app from "../dist/src/index.js";

export default function handler(req, res) {
  app(req, res);
}
