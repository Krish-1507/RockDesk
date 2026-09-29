"use client";
import Link from "next/link";
import { ArrowRight, ChatTeardropText, ListChecks, Ticket } from "@phosphor-icons/react";
import TicketCard from "@/components/ticket-card";
import { Rise } from "@/components/motion-helpers";

const STEPS = [
  {
    n: "01",
    title: "Describe it",
    body: "Type the issue the way you'd say it — in English, Hindi, Spanish, Arabic, Chinese, or mixed.",
  },
  {
    n: "02",
    title: "Answer one question",
    body: "If anything's missing, RockDesk asks once — assignee, date, nothing more — and never guesses.",
  },
  {
    n: "03",
    title: "Track it",
    body: "The ticket lands in admin with its source message attached. Search, filter, edit, done.",
  },
];

export default function Home(): React.JSX.Element {
  return (
    <div className="min-h-dvh bg-[#F5F3EE] text-[#151512]">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F0644E] text-[15px] font-bold text-white">
          R
        </span>
        <span className="text-[15px] font-bold">RockDesk</span>
        <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
          <Link
            href="/chat"
            className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-[#4E4C46] transition-colors duration-150 hover:bg-[#EFECE5] hover:text-[#151512]"
          >
            Chat
          </Link>
          <Link
            href="/admin"
            className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-[#4E4C46] transition-colors duration-150 hover:bg-[#EFECE5] hover:text-[#151512]"
          >
            Tickets
          </Link>
          <Link
            href="/login"
            className="ml-1 rounded-[10px] bg-[#151512] px-4 py-2 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-85"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 pb-16 pt-10 md:grid-cols-2 md:pt-16">
          <div>
            <Rise>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#C94A37]">
                Chat-to-Ticket
              </p>
            </Rise>
            <Rise delay={0.06}>
              <h1 className="mt-3 text-[44px] font-semibold leading-[48px] tracking-[-0.02em]">
                Say it.
                <br />
                It&apos;s ticketed.
              </h1>
            </Rise>
            <Rise delay={0.12}>
              <p className="mt-4 max-w-[42ch] text-[15px] leading-[24px] text-[#4E4C46]">
                Describe the issue in your own words. RockDesk drafts the ticket and asks only for what&apos;s missing.
              </p>
            </Rise>
            <Rise delay={0.18}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#F0644E] px-5 py-3 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-[#C94A37]"
                >
                  <ChatTeardropText size={17} weight="fill" />
                  Open the chat
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#BDB7AC] bg-[#FBFAF7] px-5 py-3 text-[14px] font-semibold transition-colors duration-150 hover:border-[#151512]"
                >
                  Admin sign in <ArrowRight size={15} />
                </Link>
              </div>
            </Rise>
          </div>
          <Rise delay={0.15} className="hidden md:block">
            <div className="relative">
              <div className="absolute -left-4 top-6 bottom-6 w-px bg-[#BDB7AC]" aria-hidden="true" />
              <div className="pl-6">
                <TicketCard
                  ticket={{
                    id: "demo",
                    ticketNumber: 128,
                    title: "Checkout page throwing 500 errors",
                    assignee: { name: "Priya Menon" },
                    dueDate: "2026-10-02",
                    priority: "High",
                    status: "Open",
                  }}
                />
                <p className="mt-3 flex items-center gap-2 pl-1 text-[12px] text-[#77736A]">
                  <Ticket size={14} />
                  Created from one chat message — source attached
                </p>
              </div>
            </div>
          </Rise>
        </div>

        <section aria-label="How it works" className="border-t border-[#D8D3C9] py-12">
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Rise key={s.n} delay={i * 0.07}>
                <div className="flex gap-4">
                  <span className="font-mono text-[13px] font-semibold text-[#C94A37]">{s.n}</span>
                  <div>
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold leading-[22px]">
                      {i === 0 && <ChatTeardropText size={17} className="text-[#77736A]" />}
                      {i === 1 && <ListChecks size={17} className="text-[#77736A]" />}
                      {i === 2 && <Ticket size={17} className="text-[#77736A]" />}
                      {s.title}
                    </h2>
                    <p className="mt-1.5 max-w-[38ch] text-[13px] leading-[20px] text-[#4E4C46]">{s.body}</p>
                  </div>
                </div>
              </Rise>
            ))}
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-[#D8D3C9] py-6">
          <p className="font-mono text-[11px] text-[#77736A]">ROCKDESK · INTERNAL TOOLING</p>
          <div className="flex gap-4 text-[12px] font-medium text-[#77736A]">
            <Link href="/chat" className="hover:text-[#151512]">Chat</Link>
            <Link href="/admin" className="hover:text-[#151512]">Tickets</Link>
            <Link href="/login" className="hover:text-[#151512]">Sign in</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

