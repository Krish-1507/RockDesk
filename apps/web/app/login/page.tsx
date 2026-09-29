"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { ChatTeardropText, ShieldCheck, Translate } from "@phosphor-icons/react";
import { createSupabaseBrowser, isPublicConfigOk } from "@/lib/supabase";
import { CONFIG_HELP } from "@/components/config-error";

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
      router.push("/admin");
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-[#F5F3EE] text-[#151512] lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[#151512] p-10 text-[#FBFAF7] lg:flex">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F0644E] text-[15px] font-bold text-white">
              R
            </span>
            <span className="text-[15px] font-bold">RockDesk</span>
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="max-w-[16ch] text-[34px] font-semibold leading-[40px] tracking-[-0.01em]">
            The queue your team actually trusts.
          </h1>
          <ul className="mt-8 flex flex-col gap-5">
            {[
              { icon: ChatTeardropText, text: "Tickets drafted from plain chat — no forms first." },
              { icon: Translate, text: "Six languages in, one clean English queue out." },
              { icon: ShieldCheck, text: "Nothing invented. Every field is confirmed or asked." },
            ].map((row) => (
              <li key={row.text} className="flex items-center gap-3 text-[14px] text-[#D8D3C9]">
                <row.icon size={19} className="shrink-0 text-[#F0644E]" />
                {row.text}
              </li>
            ))}
          </ul>
        </motion.div>
        <p className="font-mono text-[11px] text-[#77736A]">ROCKDESK · ADMIN ACCESS</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-6 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F0644E] text-[16px] font-bold text-white">
                R
              </span>
              <span className="text-[17px] font-bold">RockDesk</span>
            </Link>
          </div>
          <h2 className="text-[24px] font-semibold leading-[30px]">Admin sign in</h2>
          <p className="mt-1 text-[13px] text-[#77736A]">Use the demo credentials from the README.</p>
          {!configOk && (
            <p className="mt-4 rounded-[10px] bg-[#FDF1EE] px-3 py-2 text-[13px] text-[#B83C34]" role="alert">
              <strong className="font-semibold">Deployment misconfigured.</strong> {CONFIG_HELP}
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-6 rounded-[16px] border border-[#D8D3C9] bg-[#FBFAF7] p-6">
            <label className="block text-[12px] font-semibold text-[#4E4C46]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-[10px] border border-[#BDB7AC] bg-white px-3.5 py-2.5 text-[14px] focus:border-[#151512] focus:outline-none"
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
              className="mt-1.5 w-full rounded-[10px] border border-[#BDB7AC] bg-white px-3.5 py-2.5 text-[14px] focus:border-[#151512] focus:outline-none"
              required
            />
            {error && (
              <p className="mt-3 rounded-[10px] bg-[#FDF1EE] px-3 py-2 text-[13px] text-[#B83C34]" role="alert">
                {error}
              </p>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={busy || !configOk}
              className="mt-5 w-full rounded-[10px] bg-[#F0644E] py-2.5 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-[#C94A37] disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
