import { z } from "zod";

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  SUPABASE_SECRET_KEY: z.string().min(10),
  GROQ_API_KEY: z.string().min(5).optional(),
  GROQ_FALLBACK_API_KEY: z.string().min(5).optional(),
  LLM_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
  APP_TIMEZONE_DEFAULT: z.string().min(1).default("Asia/Kolkata"),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.string().default("development"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  if (!parsed.data.GROQ_API_KEY && !parsed.data.GROQ_FALLBACK_API_KEY) {
    throw new Error("Invalid environment configuration: provide GROQ_API_KEY and/or GROQ_FALLBACK_API_KEY");
  }
  cached = parsed.data;
  return cached;
}

/** Test-only escape hatch so unit tests do not need real secrets. */
export function resetEnvCache(): void {
  cached = null;
}
