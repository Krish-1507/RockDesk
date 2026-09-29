import { createBrowserClient } from "@supabase/ssr";

export class PublicConfigError extends Error {
  constructor() {
    super(
      "RockDesk is missing its public configuration (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Set them in Vercel → Project → Settings → Environment Variables (web service, all environments) and redeploy without build cache.",
    );
    this.name = "PublicConfigError";
  }
}

/** Build-time public config. Null when the web service was built without env vars. */
export function publicConfig(): { url: string; publishableKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isPublicConfigOk(): boolean {
  return publicConfig() !== null;
}

export function createSupabaseBrowser(): ReturnType<typeof createBrowserClient> {
  const config = publicConfig();
  if (!config) throw new PublicConfigError();
  return createBrowserClient(config.url, config.publishableKey);
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
