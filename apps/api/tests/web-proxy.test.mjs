/* global Request, Response */
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../web/app/api/[...path]/route.ts";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("web API forwarding", () => {
  it("forwards auth, paths and query parameters without forwarding the preview origin", async () => {
    vi.stubEnv("API_BASE_URL", "https://api.example.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { role: "admin" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new Request("https://preview.example.test/api/auth/me?test=1", {
      headers: { authorization: "Bearer test", origin: "https://preview.example.test", cookie: "unrelated=secret" },
    }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.example.test/api/auth/me?test=1");
    expect(init.headers.get("authorization")).toBe("Bearer test");
    expect(init.headers.has("origin")).toBe(false);
    expect(init.headers.has("cookie")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ data: { role: "admin" } });
  });

  it("preserves chat bodies, session tokens and upstream errors", async () => {
    vi.stubEnv("API_BASE_URL", "https://api.example.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: { code: "RATE_LIMITED" } }, { status: 429, headers: { "Retry-After": "60" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("https://web.example.test/api/chat/message", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Chat-Session-Token": "session-secret" }, body: '{"message":"hello"}',
    }));
    expect(fetchMock.mock.calls[0][1].body).toBe('{"message":"hello"}');
    expect(fetchMock.mock.calls[0][1].headers.get("x-chat-session-token")).toBe("session-secret");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("returns a safe error for an unreachable upstream", async () => {
    vi.stubEnv("API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private details")));
    const response = await GET(new Request("https://web.example.test/api/auth/me"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private details");
  });
});

