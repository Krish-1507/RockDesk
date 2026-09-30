"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChatTeardropText, Ticket, Users, SignOut, Sparkle } from "@phosphor-icons/react";
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
    <div className="grain flex min-h-screen bg-[#F5F3EE] text-[#151512]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#D8D3C9] bg-[#FBFAF7]/90 backdrop-blur md:flex">
        <div className="px-5 pb-6 pt-7">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="RockDesk home">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F0644E] text-[15px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(240,100,78,0.6)] transition-transform duration-200 group-hover:-rotate-6">
              R
            </span>
            <div>
              <div className="text-[15px] font-bold leading-5 tracking-tight">RockDesk</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#77736A]">
                Chat-to-Ticket
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/chat" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors duration-150 ${
                  active ? "text-[#FBFAF7]" : "text-[#4E4C46] hover:bg-[#EFECE5] hover:text-[#151512]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-[10px] bg-[#151512] shadow-[0_6px_16px_-6px_rgba(21,21,18,0.5)]"
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <Icon size={17} weight={active ? "fill" : "regular"} className="relative" />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-3">
          <div className="relative overflow-hidden rounded-[14px] bg-[#151512] p-3.5 text-[#FBFAF7]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#F0644E]/30 blur-2xl" />
            </div>
            <p className="relative flex items-center gap-1.5 text-[12px] font-semibold leading-[18px]">
              <Sparkle size={14} weight="fill" className="text-[#F0644E]" />
              Describe it, don&apos;t file it
            </p>
            <p className="relative mt-1 text-[12px] leading-[18px] text-[#BDB7AC]">
              Type an issue in any language. The desk drafts the ticket.
            </p>
            <Link
              href="/chat"
              className="btn-press relative mt-3 block rounded-[10px] bg-[#F0644E] py-1.5 text-center text-[12px] font-semibold text-white hover:bg-[#C94A37]"
            >
              New conversation
            </Link>
          </div>
          <button
            onClick={signOut}
            className="btn-press mt-2 flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#77736A] transition-colors duration-150 hover:bg-[#EFECE5] hover:text-[#151512]"
          >
            <SignOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {!configOk && <ConfigErrorBanner />}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#D8D3C9]/70 bg-[#FBFAF7]/85 px-4 py-3 backdrop-blur-md md:hidden">
          <Link href="/" className="flex items-center gap-2" aria-label="RockDesk home">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0644E] text-[13px] font-bold text-white">
              R
            </span>
            <span className="text-[15px] font-bold tracking-tight">RockDesk</span>
          </Link>
          <nav className="ml-auto flex gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  pathname === item.href || (item.href !== "/chat" && pathname.startsWith(item.href))
                    ? "bg-[#151512] text-white"
                    : "text-[#4E4C46]"
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
