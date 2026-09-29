import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssignableUser } from "@chat-to-ticket/shared";
import { findUsersByName } from "../../repositories/user-repository.js";

export type AssigneeOutcome =
  | { kind: "resolved"; user: AssignableUser }
  | { kind: "ambiguous"; options: AssignableUser[] }
  | { kind: "not_found"; candidate: string }
  | { kind: "explicitly_unassigned" }
  | { kind: "unknown" };

const UNASSIGNED_PATTERNS = [
  "unassign", "no one", "nobody", "leave it", "backlog", "triage",
  "afai", "koi nahi", "किसी को नहीं", "sin asignar", "sans assign",
];

function looksExplicitlyUnassigned(text: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return UNASSIGNED_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Backend-owned assignee resolution against database users.
 * The LLM may only suggest a candidate name; this function decides.
 * Never invents or fuzzy-guesses an identity: 0 or 2+ matches → clarify.
 */
export async function resolveAssignee(
  db: SupabaseClient,
  candidate: string | null,
  modelClaim: "resolved" | "ambiguous" | "not_found" | "explicitly_unassigned" | "unknown",
  latestMessage: string,
): Promise<AssigneeOutcome> {
  if (modelClaim === "explicitly_unassigned" || looksExplicitlyUnassigned(latestMessage) || looksExplicitlyUnassigned(candidate)) {
    return { kind: "explicitly_unassigned" };
  }
  const name = (candidate ?? "").trim();
  if (!name) return { kind: "unknown" };
  const matches = await findUsersByName(db, name);
  if (matches.length === 1 && matches[0]) return { kind: "resolved", user: matches[0] };
  if (matches.length > 1) return { kind: "ambiguous", options: matches.slice(0, 6) };
  // Last-chance: single-token first/last-name match against all users.
  return { kind: "not_found", candidate: name };
}

/** Resolve a user's clarification answer (e.g. "Rahul Sharma" or "the second one") to a known user. */
export async function resolveAnswerToUser(
  db: SupabaseClient,
  answer: string,
  options: AssignableUser[],
): Promise<AssignableUser | null> {
  const text = answer.trim().toLowerCase();
  if (!text) return null;
  const ordinal = /^(second|2nd|2)\b/.exec(text);
  if (ordinal && options.length >= 2 && options[1]) {
    // "second one" only valid when disambiguation options were actually offered.
    const named = options.find((o) => text.includes(o.name.toLowerCase()));
    return named ?? options[1];
  }
  const first = /^(first|1st|1)\b/.exec(text);
  if (first && options.length >= 1 && options[0]) {
    const named = options.find((o) => text.includes(o.name.toLowerCase()));
    return named ?? options[0];
  }
  for (const option of options) {
    if (text.includes(option.name.toLowerCase())) return option;
  }
  const matches = await findUsersByName(db, answer.trim());
  return matches.length === 1 && matches[0] ? matches[0] : null;
}
