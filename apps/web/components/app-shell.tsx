"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChatTeardropText, Ticket, Users, SignOut } from "@phosphor-icons/react";
import { createSupabaseBrowser, isPublicConfigOk } from "@/lib/supabase";
import { ConfigErrorBanner } from "@/components/config-error";

const NAV = [
  { href: "/chat", label: "Chat", icon: ChatTeardropText },
  { href: "/admin", label: "Tickets", icon: Ticket },
  { href: "/admin/users", label: "People", icon: Users },
];

export default function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut(): Promise<void> {
    try {
      const supabase = createSupabaseBrowser();
      await supabase.auth.signOut();
    } catch {
      // Config errors are surfaced by the banner; still leave the admin area.
    }
    router.push("/login");
  }

  const configOk = isPublicConfigOk();

  return (
    <div className="flex min-h-screen bg-[#F5F3EE] text-[#151512]">
      <aside className="hidden h-dvh w-56 shrink-0 flex-col self-start border-r border-[#D8D3C9] bg-[#FBFAF7] md:sticky md:top-0 md:flex">
        <div className="px-5 pb-5 pt-6">
          <Link href="/" className="text-[16px] font-bold tracking-tight" aria-label="RockDesk home">
            RockDesk<span className="text-[#F0644E]">.</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 px-3" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/chat" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors duration-150 ${
                  active
                    ? "bg-[#EFECE5] font-semibold text-[#151512]"
                    : "font-medium text-[#4E4C46] hover:bg-[#EFECE5]/60 hover:text-[#151512]"
                }`}
              >
                <Icon size={17} weight={active ? "fill" : "regular"} className={active ? "text-[#C94A37]" : undefined} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#D8D3C9] p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[#77736A] transition-colors duration-150 hover:bg-[#EFECE5]/60 hover:text-[#151512]"
          >
            <SignOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {!configOk && <ConfigErrorBanner />}
        <header className="flex items-center gap-3 border-b border-[#D8D3C9] bg-[#FBFAF7] px-4 py-3 md:hidden">
          <Link href="/" className="text-[15px] font-bold tracking-tight" aria-label="RockDesk home">
            RockDesk<span className="text-[#F0644E]">.</span>
          </Link>
          <nav className="ml-auto flex gap-1" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/chat" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    active ? "bg-[#EFECE5] text-[#151512]" : "text-[#4E4C46]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
