"use client";
import Link from "next/link";
import { ArrowRight, ChatTeardropText } from "@phosphor-icons/react";
import TicketCard from "@/components/ticket-card";
import { Rise } from "@/components/motion-helpers";

export default function Home(): React.JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-[#F5F3EE] text-[#151512]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2.5 px-6">
        <Link href="/" className="text-[17px] font-bold tracking-tight" aria-label="RockDesk home">
          RockDesk<span className="text-[#F0644E]">.</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
          <Link
            href="/chat"
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-[#4E4C46] transition-colors duration-150 hover:bg-[#EFECE5] hover:text-[#151512]"
          >
            Chat
          </Link>
          <Link
            href="/admin"
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-[#4E4C46] transition-colors duration-150 hover:bg-[#EFECE5] hover:text-[#151512]"
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

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 pb-16 pt-10 md:pt-14 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <Rise immediate>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#C94A37]">
              Chat-to-Ticket
            </p>
          </Rise>
          <Rise immediate delay={0.06}>
            <h1 className="mt-3 text-[48px] font-semibold leading-[50px] tracking-[-0.03em] md:text-[64px] md:leading-[64px]">
              Say it.
              <br />
              It&apos;s ticketed.
            </h1>
          </Rise>
          <Rise immediate delay={0.12}>
            <p className="mt-4 max-w-[42ch] text-[15px] leading-[24px] text-[#4E4C46]">
              Describe the issue in your own words and language. RockDesk drafts the ticket and asks only for what&apos;s missing.
            </p>
          </Rise>
          <Rise immediate delay={0.18}>
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

        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-0 select-none font-mono text-[170px] font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_#D8D3C9]"
          >
            128
          </span>
          <Rise immediate delay={0.15} className="relative">
            <Link
              href="/chat"
              className="group mx-auto block max-w-[460px] rounded-[16px] border border-[#D8D3C9] bg-[#FBFAF7] p-4 shadow-[0_24px_64px_-28px_rgba(21,21,18,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_72px_-28px_rgba(201,74,55,0.35)]"
              aria-label="Open the live chat"
            >
              <div className="flex flex-col gap-2.5">
                <Rise immediate delay={0.35} y={8}>
                  <div className="ml-auto w-fit max-w-[88%] rounded-[14px] rounded-br-[6px] bg-[#151512] px-4 py-2.5 text-[13.5px] leading-[21px] text-[#FBFAF7]">
                    Checkout 500s are back — Priya to fix by Friday, high priority
                  </div>
                </Rise>
                <Rise immediate delay={0.6} y={8}>
                  <div className="w-fit max-w-[92%] rounded-[14px] rounded-bl-[6px] border border-[#D8D3C9] bg-white px-4 py-2.5 text-[13.5px] leading-[21px]">
                    Ticket #128 created. Anything else?
                  </div>
                </Rise>
                <Rise immediate delay={0.85} y={10}>
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
                </Rise>
              </div>
            </Link>
            <p className="mx-auto mt-3 max-w-[460px] text-[12px] text-[#77736A]">
              One message in, one ticket out. Click to open the live chat.
            </p>
          </Rise>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-[#D8D3C9] px-6 py-5">
        <p className="font-mono text-[11px] text-[#77736A]">ROCKDESK · INTERNAL TOOLING</p>
        <div className="flex gap-4 text-[12px] font-medium text-[#77736A]">
          <Link href="/chat" className="hover:text-[#151512]">Chat</Link>
          <Link href="/admin" className="hover:text-[#151512]">Tickets</Link>
          <Link href="/login" className="hover:text-[#151512]">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
