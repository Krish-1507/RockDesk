export type DateOutcome =
  | { kind: "resolved"; iso: string }
  | { kind: "ambiguous"; iso: string; question: string }
  | { kind: "no_deadline" }
  | { kind: "unknown" };

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Current date in an IANA timezone, without depending on the server locale. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat("en", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function parseToday(today: string): Date {
  return new Date(`${today}T00:00:00Z`);
}

function addDays(today: string, n: number): string {
  const d = parseToday(today);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextWeekday(today: string, target: number, modifier: "this" | "next" | "plain"): string {
  const base = parseToday(today);
  const current = base.getUTCDay();
  let delta = (target - current + 7) % 7;
  if (modifier === "next") {
    delta = delta === 0 ? 7 : delta + 7 <= 7 ? 7 : delta;
    if (delta <= 0) delta += 7;
    if (delta < 7) delta = 7 + ((target - current + 7) % 7 === 0 ? 0 : (target - current + 7) % 7);
    delta = ((target - current + 7) % 7) + 7;
    if (delta > 14) delta -= 7;
  } else if (modifier === "this") {
    if (delta === 0) delta = 0;
  } else {
    if (delta === 0) delta = 7; // bare "Friday" with today Friday → next Friday
  }
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + delta);
  return toIso(d);
}

/**
 * Backend-owned date normalization. The model proposes; this validates.
 * Supports relative dates, weekday names, "end of week", and "the 4th"-style
 * ordinals (nearest future occurrence, flagged ambiguous when the month is unclear).
 */
export function resolveDueDate(
  modelIso: string | null,
  modelRaw: string | null,
  modelClaim: "resolved" | "ambiguous" | "no_deadline" | "unknown",
  latestMessage: string,
  today: string,
): DateOutcome {
  const text = `${modelRaw ?? ""} ${latestMessage}`.toLowerCase();
  if (modelClaim === "no_deadline" || /\b(no\s*(deadline|rush|hurry)|whenever|no date|backlog|no target)\b/.test(text)) {
    return { kind: "no_deadline" };
  }
  if (modelIso && ISO_RE.test(modelIso) && modelIso >= today) {
    if (modelClaim === "ambiguous") {
      return { kind: "ambiguous", iso: modelIso, question: formatConfirmQuestion(modelIso) };
    }
    // "by the 4th"-style ordinals are ambiguous when the model resolved without a month.
    if (/\b(by\s+)?the\s+\d{1,2}(st|nd|rd|th)?\b/.test(text) && !monthMentioned(text)) {
      return { kind: "ambiguous", iso: modelIso, question: formatConfirmQuestion(modelIso) };
    }
    // Weekday guard: if the user named a weekday, the stored date must fall on it.
    // Models occasionally map "Friday" to the wrong calendar date; recompute deterministically.
    const namedDay = WEEKDAYS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(text));
    if (namedDay >= 0 && new Date(`${modelIso}T00:00:00Z`).getUTCDay() !== namedDay) {
      const fallback = parseRelativeDate(text, today);
      if (fallback && !fallback.ambiguous) return { kind: "resolved", iso: fallback.iso };
    }
    return { kind: "resolved", iso: modelIso };
  }
  // Deterministic fallback parsing when the model gave nothing usable.
  const fallback = parseRelativeDate(text, today);
  if (fallback) {
    if (fallback.ambiguous) return { kind: "ambiguous", iso: fallback.iso, question: formatConfirmQuestion(fallback.iso) };
    return { kind: "resolved", iso: fallback.iso };
  }
  return { kind: "unknown" };
}

function monthMentioned(text: string): boolean {
  return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b\d{1,2}[/-]\d{1,2}\b/.test(text);
}

function formatConfirmQuestion(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `Did you mean ${label}?`;
}

function parseRelativeDate(text: string, today: string): { iso: string; ambiguous: boolean } | null {
  if (/\btoday\b|\baaj\b|\bhoy\b|\bhoy\b/.test(text)) return { iso: today, ambiguous: false };
  if (/\btomorrow\b|\bkal\b|\bmañana\b|\bmanana\b|\bغد/.test(text)) {
    // "kal" (Hindi) is ambiguous (yesterday/tomorrow) but with "tak/fix/karega" context means tomorrow.
    return { iso: addDays(today, 1), ambiguous: false };
  }
  if (/\bend of (the )?week\b|\bweekend\b|\bweek end\b/.test(text)) {
    const base = parseToday(today);
    const delta = (5 - base.getUTCDay() + 7) % 7; // Friday
    return { iso: addDays(today, delta === 0 ? 0 : delta), ambiguous: false };
  }
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const day = WEEKDAYS[i];
    if (!day || !text.includes(day)) continue;
    const modifier: "this" | "next" | "plain" = text.includes(`next ${day}`) ? "next" : text.includes(`this ${day}`) ? "this" : "plain";
    return { iso: nextWeekday(today, i, modifier), ambiguous: false };
  }
  const ordinal = text.match(/\b(?:by\s+)?(?:the\s+)?(\d{1,2})(st|nd|rd|th)?\b/);
  if (ordinal?.[1]) {
    const dayNum = Number.parseInt(ordinal[1], 10);
    if (dayNum >= 1 && dayNum <= 31) {
      const [y, m, d] = today.split("-").map(Number) as [number, number, number];
      const candidateThisMonth = `${y}-${String(m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      if (candidateThisMonth >= today && dayNum >= (d ?? 1)) {
        return { iso: candidateThisMonth, ambiguous: !monthMentioned(text) };
      }
      const next = new Date(Date.UTC(y, m, 0)); // month rollover
      next.setUTCMonth(next.getUTCMonth());
      const nm = next.getUTCMonth() + 1;
      const ny = next.getUTCFullYear();
      return { iso: `${ny}-${String(nm).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`, ambiguous: !monthMentioned(text) };
    }
  }
  return null;
}
