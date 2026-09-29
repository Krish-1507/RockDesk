import { beforeAll, describe, expect, it } from "vitest";
import { getSupabaseAdmin } from "../src/config/supabase.js";
import { resolveAssignee } from "../src/services/chat/assignee-resolver.js";

describe("assignee resolution", () => {
  beforeAll(() => {
    if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL missing for tests");
  });

  it("resolves a unique full name", async () => {
    const db = getSupabaseAdmin();
    const out = await resolveAssignee(db, "Priya Menon", "resolved", "Priya Menon will fix it");
    expect(out.kind).toBe("resolved");
    if (out.kind === "resolved") expect(out.user.name).toBe("Priya Menon");
  });

  it("asks for clarification when two users share the same first name", async () => {
    const db = getSupabaseAdmin();
    const out = await resolveAssignee(db, "Rahul", "ambiguous", "Rahul to fix by tomorrow");
    expect(out.kind).toBe("ambiguous");
    if (out.kind === "ambiguous") {
      expect(out.options.length).toBe(2);
      expect(out.options.map((o) => o.name).sort()).toEqual(["Rahul Sharma", "Rahul Verma"]);
    }
  });

  it("reports not_found instead of guessing", async () => {
    const db = getSupabaseAdmin();
    const out = await resolveAssignee(db, "Amitabh", "not_found", "Amitabh will fix it");
    expect(out.kind).toBe("not_found");
  });

  it("supports explicit unassigned instructions", async () => {
    const db = getSupabaseAdmin();
    const out = await resolveAssignee(db, null, "explicitly_unassigned", "leave it unassigned");
    expect(out).toEqual({ kind: "explicitly_unassigned" });
  });

  it("returns unknown when nobody was mentioned", async () => {
    const db = getSupabaseAdmin();
    const out = await resolveAssignee(db, null, "unknown", "login is broken");
    expect(out).toEqual({ kind: "unknown" });
  });
});
