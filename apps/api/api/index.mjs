/**
 * Production serverless entry (plain JavaScript on purpose).
 * Bundled to a single file by esbuild — see package.json `bundle` script.
 */
import app from "../dist/src/index.js";

if (process.env.PORT) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`RockDesk API listening on ${port}`);
  });
}

export default function handler(req, res) {
  app(req, res);
}
