import Groq from "groq-sdk";
import type { AIProvider, TicketAnalysis, TicketAnalysisInput } from "@chat-to-ticket/shared";
import { TicketAnalysisSchema } from "@chat-to-ticket/shared";
import { AI_TIMEOUT_MS } from "@chat-to-ticket/shared";
import { getEnv } from "../../config/env.js";
import { buildAnalysisPrompt, REPAIR_INSTRUCTION } from "./ticket-prompt.js";

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/m.exec(trimmed);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function parseAnalysis(raw: string): TicketAnalysis | null {
  try {
    const parsed: unknown = JSON.parse(extractJson(raw));
    const result = TicketAnalysisSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function complete(client: Groq, model: string, system: string, user: string): Promise<string> {
  const response = await withTimeout(
    client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
    AI_TIMEOUT_MS,
  );
  const content = response.choices[0]?.message?.content ?? "";
  if (!content) throw new Error("AI_EMPTY_RESPONSE");
  return content;
}

/**
 * Groq-backed provider with automatic fallback: if GROQ_API_KEY fails
 * (network/auth/rate-limit/5xx), retry the same request with GROQ_FALLBACK_API_KEY.
 * Exactly one structured-output retry per key on schema-invalid JSON.
 */
export class GroqAIProvider implements AIProvider {
  private readonly primaryKey: string | undefined;
  private readonly fallbackKey: string | undefined;
  private readonly model: string;

  constructor(primaryKey?: string, fallbackKey?: string, model?: string) {
    const env = safeEnv();
    this.primaryKey = primaryKey ?? env?.GROQ_API_KEY;
    this.fallbackKey = fallbackKey ?? env?.GROQ_FALLBACK_API_KEY;
    this.model = model ?? env?.LLM_MODEL ?? "llama-3.3-70b-versatile";
    if (!this.primaryKey && !this.fallbackKey) {
      throw new Error("GroqAIProvider requires GROQ_API_KEY and/or GROQ_FALLBACK_API_KEY.");
    }
  }

  async analyzeTicket(input: TicketAnalysisInput): Promise<TicketAnalysis> {
    const { system, user } = buildAnalysisPrompt(input);
    const keys = [this.primaryKey, this.fallbackKey].filter((k): k is string => Boolean(k));
    let lastError: unknown = null;
    for (const key of keys) {
      try {
        return await this.attemptWithKey(key, system, user);
      } catch (err) {
        lastError = err;
        if (err instanceof Error && (err.message === "AI_TIMEOUT" || err.message === "AI_INVALID_OUTPUT")) {
          throw err;
        }
        // Otherwise try the next key (provider/auth/network failure → fallback).
      }
    }
    if (lastError instanceof Error && (lastError.message === "AI_TIMEOUT" || lastError.message === "AI_INVALID_OUTPUT")) {
      throw lastError;
    }
    throw new Error("AI_UNAVAILABLE");
  }

  private async attemptWithKey(key: string, system: string, user: string): Promise<TicketAnalysis> {
    const client = new Groq({ apiKey: key });
    let raw: string;
    try {
      raw = await complete(client, this.model, system, user);
    } catch (err) {
      if (err instanceof Error && err.message === "AI_TIMEOUT") throw err;
      throw new Error("AI_PROVIDER_ERROR");
    }
    const first = parseAnalysis(raw);
    if (first) return first;
    // Single structured-output repair retry.
    try {
      const repaired = await complete(client, this.model, system, `${user}\n\n${REPAIR_INSTRUCTION}\nYour previous invalid reply was:\n${raw.slice(0, 2000)}`);
      const second = parseAnalysis(repaired);
      if (second) return second;
    } catch (err) {
      if (err instanceof Error && err.message === "AI_TIMEOUT") throw err;
      throw new Error("AI_PROVIDER_ERROR");
    }
    throw new Error("AI_INVALID_OUTPUT");
  }
}

function safeEnv(): { GROQ_API_KEY?: string | undefined; GROQ_FALLBACK_API_KEY?: string | undefined; LLM_MODEL?: string | undefined } | null {
  try {
    return getEnv();
  } catch {
    return null;
  }
}
