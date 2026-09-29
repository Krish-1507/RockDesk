import { createBrowserClient } from "@supabase/ssr";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}.`);
  return value;
}

export function createSupabaseBrowser(): ReturnType<typeof createBrowserClient> {
  return createBrowserClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
