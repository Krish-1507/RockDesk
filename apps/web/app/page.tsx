"use client";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  ChatTeardropText,
  ListChecks,
  ShieldCheck,
  Ticket,
  Translate,
} from "@phosphor-icons/react";
import TicketCard from "@/components/ticket-card";
import { Rise, Stagger, StaggerItem } from "@/components/motion-helpers";

const STEPS = [
  {
    n: "01",
    title: "Describe it",
    body: "Type the issue the way you'd say it — any of six languages, typos and all.",
    icon: ChatTeardropText,
  },
  {
    n: "02",
    title: "Answer once",
    body: "Missing assignee or date? RockDesk asks a single short question. It never guesses.",
    icon: ListChecks,
  },
  {
    n: "03",
    title: "Track it",
    body: "Ticket lands in admin with its source message pinned. Search, edit, resolve.",
    icon: Ticket,
  },
];

const LANGS = ["English", "हिन्दी", "Hinglish", "Español", "العربية", "中文"];

const EXAMPLES = [
  "Checkout page is throwing 500 errors. Priya will fix it by Friday, high priority.",
  "Login crashes on Safari, resolve by the 4th.",
  "Search results are wrong, Rahul to fix by tomorrow.",
];

export default function Home(): React.JSX.Element {
  return (
    <div className="grain min-h-dvh bg-[#F5F3EE] text-[#151512] antialiased">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#D8D3C9]/70 bg-[#F5F3EE]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-6">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="RockDesk home">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F0644E] text-[15px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(240,100,78,0.6)] transition-transform duration-200 group-hover:-rotate-6">
              R
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#151512] ring-2 ring-[#F5F3EE]" />
            </span>
            <span className="text-[15px] font-bold tracking-tight">RockDesk</span>
            <span className="hidden rounded-full border border-[#D8D3C9] bg-[#FBFAF7] px-2 py-0.5 font-mono text-[10px] font-medium text-[#77736A] sm:inline">
              LIVE DEMO
            </span>
          </Link>
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
              className="btn-press ml-1 rounded-[10px] bg-[#151512] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-85"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* ── Hero: split, fits viewport ─────────────────── */}
        <div className="relative grid items-center gap-12 pb-14 pt-10 md:grid-cols-[1.05fr_0.95fr] md:pt-14">
          {/* ambient */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="animate-orb-drift absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-[#F0644E]/15 blur-3xl" />
            <div className="absolute left-[-8%] top-1/3 h-56 w-56 rounded-full bg-[#E7D3A7]/40 blur-3xl" />
            <div className="dot-grid absolute right-0 top-6 h-40 w-64 opacity-60 [mask-image:radial-gradient(closest-side,black,transparent)]" />
          </div>

          <div>
            <Rise>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#E7B9AE] bg-[#FDF1EE] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C94A37]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse-ring absolute h-full w-full rounded-full bg-[#F0644E]" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-[#F0644E]" />
                </span>
                Chat-to-Ticket
              </p>
            </Rise>
            <Rise delay={0.06}>
              <h1 className="mt-4 text-[44px] font-semibold leading-[46px] tracking-[-0.03em] md:text-[56px] md:leading-[58px]">
                Say it.
                <br />
                It&apos;s <span className="italic text-[#C94A37]">ticketed.</span>
              </h1>
            </Rise>
            <Rise delay={0.12}>
              <p className="mt-4 max-w-[42ch] text-[15px] leading-[24px] text-[#4E4C46]">
                Describe the issue in your own words. RockDesk drafts the ticket instantly.
              </p>
            </Rise>
            <Rise delay={0.18}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/chat"
                  className="btn-press group inline-flex items-center gap-2 rounded-[10px] bg-[#F0644E] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(240,100,78,0.7)] hover:bg-[#C94A37]"
                >
                  <ChatTeardropText size={17} weight="fill" />
                  Open the chat
                  <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="btn-press inline-flex items-center gap-1.5 rounded-[10px] border border-[#BDB7AC] bg-[#FBFAF7] px-5 py-3 text-[14px] font-semibold hover:border-[#151512]"
                >
                  Admin sign in
                </Link>
              </div>
            </Rise>
            <Rise delay={0.24}>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#77736A]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#3E7650]" /> Never guesses assignees
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Translate size={14} className="text-[#C94A37]" /> 6 languages in, 1 clean queue
                </span>
              </div>
            </Rise>
          </div>

          {/* Hero visual — real component preview, floating */}
          <Rise delay={0.15} className="relative">
            <div className="relative mx-auto max-w-[440px]">
              <div className="dot-grid absolute -inset-4 -z-10 rounded-[20px] opacity-50 [mask-image:radial-gradient(70%_70%_at_50%_40%,black,transparent)]" aria-hidden="true" />
              {/* chat bubble mock */}
              <motion.div
                initial={{ opacity: 0, y: 16, rotate: -1 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="card-lift relative z-10 ml-auto w-fit max-w-[88%] rounded-[14px] rounded-br-[6px] bg-[#151512] px-4 py-2.5 text-[13.5px] leading-[21px] text-[#FBFAF7] shadow-[0_16px_40px_-16px_rgba(21,21,18,0.5)]"
              >
                Checkout 500s are back — Priya to fix by Friday, high priority
              </motion.div>
              {/* ticket preview */}
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="animate-float-soft relative z-20 -mt-2"
              >
                <div className="shadow-[0_24px_64px_-20px_rgba(21,21,18,0.35)]">
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
                </div>
              </motion.div>
              {/* floating language chips */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -left-3 top-2 z-30 -rotate-3 rounded-[10px] border border-[#D8D3C9] bg-[#FBFAF7]/95 px-2.5 py-1.5 font-mono text-[11px] shadow-[0_8px_20px_-8px_rgba(21,21,18,0.3)] backdrop-blur md:-left-8"
              >
                हिन्दी → English ✓
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.68, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -right-2 bottom-8 z-30 rotate-2 rounded-[10px] bg-[#151512] px-2.5 py-1.5 font-mono text-[11px] text-[#FBFAF7] shadow-[0_8px_20px_-8px_rgba(21,21,18,0.5)] md:-right-6"
              >
                0 fields guessed
              </motion.div>
              <p className="mt-3 flex items-center gap-2 pl-1 text-[12px] text-[#77736A]">
                <Ticket size={14} />
                Created from one chat message — source attached
              </p>
            </div>
          </Rise>
        </div>

        {/* ── Language marquee (single per page) ─────────── */}
        <div className="overflow-hidden rounded-[14px] border border-[#D8D3C9] bg-[#151512] py-3" aria-label="Supported languages">
          <div className="animate-marquee flex w-max items-center gap-8 pr-8">
            {[...LANGS, ...LANGS].map((l, i) => (
              <span key={`${l}-${i}`} className="flex items-center gap-8 whitespace-nowrap text-[13px] font-medium text-[#FBFAF7]">
                {l}
                <span className="h-1 w-1 rounded-full bg-[#F0644E]" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>

        {/* ── How it works: asymmetric bento ─────────────── */}
        <section aria-label="How it works" className="py-14">
          <Stagger className="grid gap-4 md:grid-cols-3" gap={0.09}>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const featured = i === 0;
              return (
                <StaggerItem key={s.n}>
                  <div
                    className={`card-lift group relative h-full overflow-hidden rounded-[14px] border p-6 ${
                      featured
                        ? "border-[#151512] bg-[#151512] text-[#FBFAF7]"
                        : "border-[#D8D3C9] bg-[#FBFAF7]"
                    }`}
                  >
                    {featured && (
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F0644E]/25 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                        <div className="dot-grid-light absolute bottom-0 left-0 h-24 w-full opacity-40" />
                      </div>
                    )}
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-[13px] font-bold ${featured ? "text-[#F0644E]" : "text-[#C94A37]"}`}>
                          {s.n}
                        </span>
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-[10px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 ${
                            featured ? "bg-[#F0644E] text-white" : "bg-[#EFECE5] text-[#4E4C46]"
                          }`}
                        >
                          <Icon size={18} weight={featured ? "fill" : "regular"} />
                        </span>
                      </div>
                      <h2 className="mt-5 text-[18px] font-semibold leading-[24px] tracking-tight">{s.title}</h2>
                      <p className={`mt-1.5 max-w-[36ch] text-[13px] leading-[20px] ${featured ? "text-[#D8D3C9]" : "text-[#4E4C46]"}`}>
                        {s.body}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>

        {/* ── Live proof: split + prompt cards ───────────── */}
        <section aria-label="Try it now" className="grid gap-10 border-t border-[#D8D3C9] py-14 md:grid-cols-[0.9fr_1.1fr]">
          <Rise>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#C94A37]">Live proof</p>
            <h2 className="mt-2 max-w-[18ch] text-[30px] font-semibold leading-[36px] tracking-[-0.02em]">
              Three sentences. Three tickets.
            </h2>
            <p className="mt-3 max-w-[44ch] text-[14px] leading-[22px] text-[#4E4C46]">
              These are real inputs the demo handles — ambiguity, ordinals, and multilingual text included.
            </p>
            <Link
              href="/chat"
              className="btn-press group mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#C94A37]"
            >
              Try them live
              <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <dl className="mt-8 grid max-w-[380px] grid-cols-3 gap-4">
              {[
                ["6", "languages"],
                ["1", "question max"],
                ["0", "guesses"],
              ].map(([v, l]) => (
                <div key={l} className="border-t-2 border-[#151512] pt-2">
                  <dt className="sr-only">{l}</dt>
                  <dd className="text-[26px] font-semibold leading-none tracking-tight">{v}</dd>
                  <dd className="mt-1 text-[12px] text-[#77736A]">{l}</dd>
                </div>
              ))}
            </dl>
          </Rise>
          <Stagger className="flex flex-col gap-2.5" gap={0.08}>
            {EXAMPLES.map((ex, i) => (
              <StaggerItem key={ex}>
                <Link
                  href="/chat"
                  className="card-lift group flex items-start gap-3.5 rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#EFECE5] font-mono text-[12px] font-bold text-[#4E4C46] transition-colors duration-200 group-hover:bg-[#F0644E] group-hover:text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] leading-[21px] text-[#4E4C46] transition-colors group-hover:text-[#151512]">
                    “{ex}”
                  </span>
                  <ArrowUpRight size={16} className="mt-1 shrink-0 text-[#BDB7AC] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#F0644E]" />
                </Link>
              </StaggerItem>
            ))}
            <StaggerItem>
              <p className="flex items-center gap-2 px-1 pt-1 font-mono text-[11px] text-[#77736A]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse-ring absolute h-full w-full rounded-full bg-[#3E7650]" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-[#3E7650]" />
                </span>
                API + LLM VERIFIED LIVE · GROQ JSON MODE
              </p>
            </StaggerItem>
          </Stagger>
        </section>

        {/* ── CTA band ───────────────────────────────────── */}
        <Rise>
          <section className="relative mb-14 overflow-hidden rounded-[16px] bg-[#151512] px-8 py-12 text-center text-[#FBFAF7] md:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="animate-orb-drift absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#F0644E]/30 blur-3xl" />
              <div className="absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-[#F0644E]/15 blur-3xl" />
              <div className="dot-grid-light absolute inset-0 opacity-30 [mask-image:radial-gradient(60%_80%_at_50%_50%,black,transparent)]" />
            </div>
            <div className="relative">
              <h2 className="mx-auto max-w-[20ch] text-[30px] font-semibold leading-[36px] tracking-[-0.02em] md:text-[36px] md:leading-[42px]">
                Stop filing tickets. Start talking.
              </h2>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/chat"
                  className="btn-press group inline-flex items-center gap-2 rounded-[10px] bg-[#F0644E] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_12px_32px_-8px_rgba(240,100,78,0.8)] hover:bg-[#C94A37]"
                >
                  <ChatTeardropText size={17} weight="fill" />
                  Open the chat
                  <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="btn-press rounded-[10px] border border-white/20 px-6 py-3 text-[14px] font-semibold text-[#FBFAF7] hover:border-white/50 hover:bg-white/5"
                >
                  Admin sign in
                </Link>
              </div>
            </div>
          </section>
        </Rise>

        <footer className="flex items-center justify-between border-t border-[#D8D3C9] py-6">
          <p className="font-mono text-[11px] text-[#77736A]">ROCKDESK · INTERNAL TOOLING</p>
          <div className="flex gap-4 text-[12px] font-medium text-[#77736A]">
            <Link href="/chat" className="transition-colors hover:text-[#151512]">Chat</Link>
            <Link href="/admin" className="transition-colors hover:text-[#151512]">Tickets</Link>
            <Link href="/login" className="transition-colors hover:text-[#151512]">Sign in</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
