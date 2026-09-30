"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser, isPublicConfigOk } from "@/lib/supabase";
import { ApiError, authMe } from "@/lib/api-client";

export function useAdminGuard(): { ready: boolean; displayName: string | null; configError: boolean; authError: string | null } {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [configError, setConfigError] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!isPublicConfigOk()) {
        setConfigError(true);
        return;
      }
      try {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
        const me = await authMe();
        if (me.role !== "admin") {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }
        setDisplayName(me.name);
        setReady(true);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setAuthError(err instanceof Error ? err.message : "Could not verify your access. Please retry.");
      }
    })();
  }, [router]);

  return { ready, displayName, configError, authError };
}
