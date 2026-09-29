"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChatTeardropText, Ticket, Users, SignOut } from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase";

const NAV = [
  { href: "/chat", label: "Chat", icon: ChatTeardropText },
  { href: "/admin", label: "Tickets", icon: Ticket },
  { href: "/admin/users", label: "People", icon: Users },
];

export default function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut(): Promise<void> {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#F5F3EE] text-[#151512]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#D8D3C9] bg-[#FBFAF7] md:flex">
        <div className="px-5 pb-6 pt-7">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F0644E] text-[15px] font-bold text-white">
              R
            </span>
            <div>
              <div className="text-[15px] font-bold leading-5">RockDesk</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#77736A]">
                Chat-to-Ticket
              </div>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/chat" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors duration-150 ${
                  active ? "bg-[#151512] text-[#FBFAF7]" : "text-[#4E4C46] hover:bg-[#EFECE5]"
                }`}
              >
                <Icon size={17} weight={active ? "fill" : "regular"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-3">
          <div className="rounded-[14px] border border-[#D8D3C9] bg-[#F5F3EE] p-3.5">
            <p className="text-[12px] font-semibold leading-[18px]">Describe it, don&apos;t file it</p>
            <p className="mt-1 text-[12px] leading-[18px] text-[#77736A]">
              Type an issue in any language. The desk drafts the ticket.
            </p>
          </div>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#77736A] transition-colors duration-150 hover:bg-[#EFECE5] hover:text-[#151512]"
          >
            <SignOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[#D8D3C9] bg-[#FBFAF7] px-4 py-3 md:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0644E] text-[13px] font-bold text-white">
            R
          </span>
          <span className="text-[15px] font-bold">RockDesk</span>
          <nav className="ml-auto flex gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium ${
                  pathname === item.href ? "bg-[#151512] text-white" : "text-[#4E4C46]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
