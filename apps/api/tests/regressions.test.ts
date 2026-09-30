import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveDueDate } from "../src/services/chat/date-resolver.js";
import { buildClarification } from "../src/services/chat/responder.js";
import { SendMessageSchema, UpdateTicketSchema } from "../src/schemas/http.js";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("deadline regressions", () => {
  it.each(["2026-02-30", "2026-13-01", "2026-04-31"])("rejects impossible calendar date %s", (date) => {
    expect(resolveDueDate(date, date, "resolved", date, "2026-01-01").kind).toBe("unknown");
    expect(UpdateTicketSchema.safeParse({ dueDate: date }).success).toBe(false);
  });
  it("rolls bare day numbers into the next valid month", () => {
    expect(resolveDueDate(null, "the 4th", "ambiguous", "by the 4th", "2026-09-30")).toMatchObject({ kind: "ambiguous", iso: "2026-10-04" });
    expect(resolveDueDate(null, "the 31st", "ambiguous", "by the 31st", "2026-04-01")).toMatchObject({ kind: "ambiguous", iso: "2026-05-31" });
  });
  it("does not turn issue counts into deadlines", () => {
    expect(resolveDueDate(null, null, "unknown", "Login fails for 4 users", "2026-09-30")).toEqual({ kind: "unknown" });
  });
  it("corrects even plausible model dates for tomorrow", () => {
    expect(resolveDueDate("2026-10-09", "tomorrow", "resolved", "tomorrow", "2026-09-30")).toEqual({ kind: "resolved", iso: "2026-10-01" });
  });
  it("uses next calendar week for next Friday", () => {
    expect(resolveDueDate(null, "next Friday", "resolved", "next Friday", "2026-10-03")).toEqual({ kind: "resolved", iso: "2026-10-09" });
  });
  it("rejects invalid timezones at the HTTP boundary", () => {
    expect(SendMessageSchema.safeParse({ sessionId: "11111111-2222-4333-8444-555555555555", message: "hi", timezone: "Not/AZone" }).success).toBe(false);
  });
});

describe("combined clarification", () => {
  it("asks for the date alongside ambiguous or unknown assignees", () => {
    for (const problem of [
      { kind: "ambiguous" as const, options: [{ name: "Rahul Sharma", department: "Backend" }, { name: "Rahul Verma", department: "Frontend" }] },
      { kind: "not_found" as const, candidate: "Unknown Person" },
    ]) {
      const reply = buildClarification("en", { missingFields: ["assignee", "due_date"], assigneeProblem: problem, ambiguousDateQuestion: null, candidateName: "Rahul", teamNames: ["Priya"], title: "Search fails" });
      expect(reply).toMatch(/assign/i);
      expect(reply).toContain("When should it be due?");
    }
  });
});
