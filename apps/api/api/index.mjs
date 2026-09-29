/**
 * Production serverless entry (plain JavaScript on purpose).
 *
 * The Express service builder deploys this file as-is, so it must contain
 * zero TypeScript syntax. It imports the tsc-compiled application from
 * ../dist (built by the service buildCommand) and surfaces load failures
 * as JSON instead of an opaque FUNCTION_INVOCATION_FAILED.
 */
async function loadApp() {
  try {
    const mod = await import("../dist/src/index.js");
    return mod.default;
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 500) : "unknown load error";
    console.error(JSON.stringify({ route: "entry", message }));
    return (_req, res) => {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: `API failed to start: ${message}`,
          details: [],
        },
      });
    };
  }
}

const handlerPromise = loadApp();

export default function handler(req, res) {
  handlerPromise
    .then((handler) => handler(req, res))
    .catch(() => {
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "API failed to start.", details: [] },
      });
    });
}
