"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("admin@pyrock.demo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3EE] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F0644E] text-[16px] font-bold text-white">
            T
          </span>
          <div>
            <div className="text-[17px] font-bold leading-5">Ticketdesk</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#77736A]">
              Admin sign in
            </div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="rounded-[16px] border border-[#D8D3C9] bg-[#FBFAF7] p-6">
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
          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-[10px] bg-[#F0644E] py-2.5 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-[#C94A37] disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-[12px] text-[#77736A]">
          Use the demo credentials from the README.
        </p>
      </div>
    </div>
  );
}
