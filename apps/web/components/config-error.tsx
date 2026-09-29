"use client";

import { useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";

export const CONFIG_HELP =
  "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel (web service, Production + Preview) and redeploy without using the build cache.";

export function ConfigErrorBanner(): React.JSX.Element {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 12000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return <></>;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 border-b border-[#E5B3AC] bg-[#FDF1EE] px-6 py-3 text-[13px] leading-[19px] text-[#B83C34]"
    >
      <WarningCircle size={16} className="mt-0.5 shrink-0" />
      <span>
        <strong className="font-semibold">RockDesk isn&apos;t configured in this deployment.</strong> {CONFIG_HELP}
      </span>
    </div>
  );
}
