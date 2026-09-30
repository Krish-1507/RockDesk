import type { SupabaseClient } from "@supabase/supabase-js";

/** Words that carry no signal when comparing issue titles, across the supported languages. */
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "for", "of", "on", "in", "at", "by",
  "with", "and", "or", "it", "this", "that", "page", "app",
  "hai", "hain", "ka", "ki", "ke", "ko", "mein", "me", "ne", "se", "par", "aur", "ya", "ek",
  "el", "la", "los", "las", "de", "del", "en", "una", "uno", "con", "por", "que",
  "في", "من", "على", "أن", "إلى",
]);

function stem(token: string): string {
  // Naive English plural strip; only for ASCII tokens long enough to stay meaningful.
  if (/^[a-z]+$/.test(token) && token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

export function titleTokens(title: string): string[] {
  const words = title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const out: string[] = [];
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

/** Jaccard similarity over significant title tokens, 0 when either side is empty. */
export function titleSimilarity(a: string, b: string): number {
  const setA = new Set(titleTokens(a));
  const setB = new Set(titleTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) overlap += 1;
  }
  return overlap / (setA.size + setB.size - overlap);
}

export interface SimilarTicket {
  id: string;
  ticketNumber: number;
  title: string;
  score: number;
}

const SIMILARITY_THRESHOLD = 0.5;

/**
 * Finds the most similar non-resolved ticket to a candidate title.
 * Deterministic backend check: resolved tickets are history, not duplicates.
 */
export async function findSimilarTicket(db: SupabaseClient, title: string): Promise<SimilarTicket | null> {
  const { data, error } = await db
    .from("tickets")
    .select("id, ticket_number, title")
    .neq("status", "Resolved")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  let best: SimilarTicket | null = null;
  for (const row of (data ?? []) as Array<{ id: string; ticket_number: number; title: string }>) {
    const score = titleSimilarity(title, row.title);
    if (score >= SIMILARITY_THRESHOLD && (!best || score > best.score)) {
      best = { id: row.id, ticketNumber: row.ticket_number, title: row.title, score };
    }
  }
  return best;
}
