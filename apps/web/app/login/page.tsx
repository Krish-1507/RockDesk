"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { createSupabaseBrowser, isPublicConfigOk } from "@/lib/supabase";
import { CONFIG_HELP } from "@/components/config-error";
import { authMe } from "@/lib/api-client";

const POINTS = [
  "Tickets drafted from plain chat — no forms first.",
  "Six languages in, one clean English queue out.",
  "Nothing invented. Every field is confirmed or asked.",
];

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
    "mt-1.5 w-full rounded-[10px] border border-[#BDB7AC] bg-white px-3.5 py-2.5 text-[14px] focus:border-[#8a867e] focus:outline-none";

  return (
    <div className="grid min-h-dvh bg-[#F5F3EE] text-[#151512] lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[#151512] p-10 text-[#FBFAF7] lg:flex">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/" className="text-[16px] font-bold tracking-tight text-[#FBFAF7]" aria-label="RockDesk home">
            RockDesk<span className="text-[#F0644E]">.</span>
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="max-w-[18ch] text-[32px] font-semibold leading-[38px] tracking-[-0.015em]">
            The queue your team actually trusts.
          </h1>
          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {POINTS.map((text, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18 + i * 0.08, duration: 0.4 }}
                className="flex items-baseline gap-3 py-3 text-[14px] leading-[21px] text-[#D8D3C9]"
              >
                <span className="font-mono text-[12px] text-[#F0644E]">0{i + 1}</span>
                {text}
              </motion.li>
            ))}
          </ul>
        </motion.div>
        <p className="font-mono text-[11px] text-[#77736A]">ROCKDESK · ADMIN ACCESS</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-6 lg:hidden">
            <Link href="/" className="text-[17px] font-bold tracking-tight">
              RockDesk<span className="text-[#F0644E]">.</span>
            </Link>
          </div>
          <h2 className="text-[24px] font-semibold leading-[30px] tracking-[-0.01em]">Admin sign in</h2>
          <p className="mt-1 text-[13px] text-[#77736A]">
            Demo account: <span className="font-mono text-[12.5px] text-[#4E4C46]">admin@rockdesk.demo</span> · password in the README.
          </p>
          {!configOk && (
            <p className="mt-4 rounded-[10px] bg-[#FDF1EE] px-3 py-2 text-[13px] text-[#B83C34]" role="alert">
              <strong className="font-semibold">Deployment misconfigured.</strong> {CONFIG_HELP}
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-6">
            <label className="block text-[12.5px] font-medium text-[#4E4C46]" htmlFor="email">
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
            <label className="mt-4 block text-[12.5px] font-medium text-[#4E4C46]" htmlFor="password">
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
              <p className="mt-3 text-[13px] text-[#B83C34]" role="alert">
                {error}
              </p>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={busy || !configOk}
              className="mt-5 w-full rounded-[10px] bg-[#151512] py-2.5 text-[14px] font-semibold text-white transition-opacity duration-150 hover:opacity-85 disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </motion.button>
          </form>
          <p className="mt-5 border-t border-[#D8D3C9] pt-4 text-[12.5px] text-[#77736A]">
            Just want to file something?{" "}
            <Link href="/chat" className="font-medium text-[#C94A37] hover:underline">
              Open the public chat
            </Link>{" "}
            — no login needed.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
