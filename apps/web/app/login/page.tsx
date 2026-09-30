"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { ChatTeardropText, ShieldCheck, Translate, WarningCircle } from "@phosphor-icons/react";
import { createSupabaseBrowser, isPublicConfigOk } from "@/lib/supabase";
import { CONFIG_HELP } from "@/components/config-error";
import { authMe } from "@/lib/api-client";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("admin@rockdesk.demo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configOk = isPublicConfigOk();

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      const me = await authMe();
      if (me.role !== "admin") {
        setError("This account does not have admin access.");
        return;
      }
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "mt-1.5 w-full rounded-[10px] border border-[#BDB7AC] bg-white px-3.5 py-2.5 text-[14px] shadow-[0_1px_2px_rgba(21,21,18,0.05)] transition-all focus:border-[#F0644E] focus:outline-none focus:shadow-[0_0_0_3px_#FBE1DB]";

  return (
    <div className="grain grid min-h-dvh bg-[#F5F3EE] text-[#151512] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#151512] p-10 text-[#FBFAF7] lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="animate-orb-drift absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#F0644E]/25 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#F0644E]/12 blur-3xl" />
          <div className="dot-grid-light absolute inset-0 opacity-30 [mask-image:radial-gradient(70%_70%_at_30%_40%,black,transparent)]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <Link href="/" className="group flex items-center gap-2.5" aria-label="RockDesk home">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F0644E] text-[15px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(240,100,78,0.7)] transition-transform duration-200 group-hover:-rotate-6">
              R
            </span>
            <span className="text-[15px] font-bold tracking-tight">RockDesk</span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] text-[#BDB7AC]">
              ADMIN
            </span>
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <h1 className="max-w-[16ch] text-[36px] font-semibold leading-[42px] tracking-[-0.02em]">
            The queue your team <span className="italic text-[#F0644E]">actually trusts.</span>
          </h1>
          <ul className="mt-8 flex flex-col gap-5">
            {[
              { icon: ChatTeardropText, text: "Tickets drafted from plain chat — no forms first." },
              { icon: Translate, text: "Six languages in, one clean English queue out." },
              { icon: ShieldCheck, text: "Nothing invented. Every field is confirmed or asked." },
            ].map((row, i) => (
              <motion.li
                key={row.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 text-[14px] text-[#D8D3C9]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/8 ring-1 ring-white/10">
                  <row.icon size={18} className="text-[#F0644E]" />
                </span>
                {row.text}
              </motion.li>
            ))}
          </ul>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="animate-float-soft mt-10 max-w-sm rounded-[14px] border border-white/10 bg-white/5 p-4 backdrop-blur"
          >
            <p className="font-mono text-[11px] text-[#F0644E]">#128 · OPEN · HIGH</p>
            <p className="mt-1 text-[14px] font-semibold leading-[20px]">Checkout page throwing 500 errors</p>
            <p className="mt-1 text-[12px] text-[#BDB7AC]">Priya Menon · Due 2 Oct · from one chat message</p>
          </motion.div>
        </motion.div>
        <p className="relative font-mono text-[11px] text-[#77736A]">ROCKDESK · ADMIN ACCESS</p>
      </div>

      <div className="relative flex items-center justify-center px-4 py-10">
        <div
          aria-hidden="true"
          className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_30%,black,transparent)]"
        />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm"
        >
          <div className="mb-6 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F0644E] text-[16px] font-bold text-white">
                R
              </span>
              <span className="text-[17px] font-bold tracking-tight">RockDesk</span>
            </Link>
          </div>
          <h2 className="text-[26px] font-semibold leading-[32px] tracking-[-0.015em]">Admin sign in</h2>
          <p className="mt-1 text-[13px] text-[#77736A]">Use the demo credentials from the README.</p>
          {!configOk && (
            <p className="mt-4 rounded-[10px] bg-[#FDF1EE] px-3 py-2 text-[13px] text-[#B83C34]" role="alert">
              <strong className="font-semibold">Deployment misconfigured.</strong> {CONFIG_HELP}
            </p>
          )}
          <form
            onSubmit={onSubmit}
            className="mt-6 rounded-[16px] border border-[#D8D3C9] bg-[#FBFAF7] p-6 shadow-[0_2px_6px_rgba(21,21,18,0.07),0_12px_32px_-12px_rgba(21,21,18,0.2)]"
          >
            <label className="block text-[12px] font-semibold text-[#4E4C46]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              required
            />
            <label className="mt-4 block text-[12px] font-semibold text-[#4E4C46]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-start gap-2 rounded-[10px] bg-[#FDF1EE] px-3 py-2 text-[13px] text-[#B83C34]"
                role="alert"
              >
                <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
                {error}
              </motion.p>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={busy || !configOk}
              className="btn-press mt-5 w-full rounded-[10px] bg-[#F0644E] py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(240,100,78,0.7)] transition-colors duration-150 hover:bg-[#C94A37] disabled:opacity-60 disabled:shadow-none"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-white" />
                    ))}
                  </span>
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </motion.button>
            <p className="mt-3 rounded-[10px] bg-[#EFECE5] px-3 py-2 font-mono text-[11px] leading-[17px] text-[#4E4C46]">
              Demo: admin@rockdesk.demo
              <br />
              Password in README — chat needs no login.
            </p>
          </form>
          <p className="mt-4 text-center text-[12px] text-[#77736A]">
            Just want to file something?{" "}
            <Link href="/chat" className="font-semibold text-[#C94A37] hover:underline">
              Open the public chat
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
