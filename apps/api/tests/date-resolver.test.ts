import { describe, expect, it } from "vitest";
import { isValidTimezone, resolveDueDate, todayInTimezone } from "../src/services/chat/date-resolver.js";

describe("todayInTimezone", () => {
  it("formats the current date for Asia/Kolkata", () => {
    const today = todayInTimezone("Asia/Kolkata", new Date("2026-09-29T10:00:00Z"));
    expect(today).toBe("2026-09-29");
  });

  it("rejects invalid timezones", () => {
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });
});

describe("resolveDueDate", () => {
  const TODAY = "2026-09-29"; // a Tuesday

  it("accepts a valid future ISO date from the model", () => {
    const out = resolveDueDate("2026-10-02", "Friday", "resolved", "Priya will fix it by Friday", TODAY);
    expect(out).toEqual({ kind: "resolved", iso: "2026-10-02" });
  });

  it("flags bare ordinals as ambiguous", () => {
    const out = resolveDueDate("2026-10-04", "the 4th", "resolved", "resolved by the 4th", TODAY);
    expect(out.kind).toBe("ambiguous");
    if (out.kind === "ambiguous") {
      expect(out.iso).toBe("2026-10-04");
      expect(out.question).toContain("4 October 2026");
    }
  });

  it("honours explicit no-deadline instructions", () => {
    const out = resolveDueDate(null, null, "no_deadline", "no deadline, whenever", TODAY);
    expect(out).toEqual({ kind: "no_deadline" });
  });

  it("parses tomorrow deterministically when the model gives nothing", () => {
    const out = resolveDueDate(null, null, "unknown", "fix it by tomorrow", TODAY);
    expect(out).toEqual({ kind: "resolved", iso: "2026-09-30" });
  });

  it("parses Friday as the coming Friday", () => {
    const out = resolveDueDate(null, "Friday", "unknown", "by Friday", TODAY);
    expect(out).toEqual({ kind: "resolved", iso: "2026-10-02" });
  });

  it("returns unknown when nothing is said about a date", () => {
    const out = resolveDueDate(null, null, "unknown", "login is broken", TODAY);
    expect(out).toEqual({ kind: "unknown" });
  });

  it("never returns a phrase like tomorrow as the stored date", () => {
    const out = resolveDueDate("2026-09-30", "tomorrow", "resolved", "by tomorrow", TODAY);
    expect(out.kind).toBe("resolved");
    if (out.kind === "resolved") expect(out.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("corrects a model date that falls on the wrong weekday", () => {
    // 2026-09-30 is a Wednesday; the user said Friday (2026-10-02).
    const out = resolveDueDate("2026-09-30", "Friday", "resolved", "Priya will fix it by Friday", TODAY);
    expect(out).toEqual({ kind: "resolved", iso: "2026-10-02" });
  });
});
