// Keep browser requests same-origin on production, previews, and local dev.
// Business logic and credentials remain in the separate Express service.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function forward(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const base = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.VERCEL ? "https://rockdesk-api.vercel.app" : "http://localhost:4000")).trim();
  try {
    const target = new URL(base);
    if (!['http:', 'https:'].includes(target.protocol) || target.origin === incoming.origin) {
      throw new Error("Invalid API target");
    }
    target.pathname = incoming.pathname;
    target.search = incoming.search;
    const headers = new Headers();
    for (const name of ["authorization", "content-type", "x-chat-session-token"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(110_000),
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["content-type", "retry-after", "x-request-id"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: { code: "API_UNAVAILABLE", message: "Cannot reach the server. Please try again shortly." } }, { status: 502 });
  }
}

export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
