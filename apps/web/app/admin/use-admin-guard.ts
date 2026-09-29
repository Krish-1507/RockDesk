"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { authMe } from "@/lib/api-client";

export function useAdminGuard(): { ready: boolean; displayName: string | null } {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      try {
        const me = await authMe();
        if (me.role !== "admin") {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }
        setDisplayName(me.name);
        setReady(true);
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return { ready, displayName };
}
