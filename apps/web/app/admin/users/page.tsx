"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";
import { ConfigErrorBanner } from "@/components/config-error";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/states";
import { createUser, listUsers, type DirectoryUser } from "@/lib/api-client";
import { useAdminGuard } from "../use-admin-guard";

export default function UsersPage(): React.JSX.Element {
  const { ready, configError, authError } = useAdminGuard();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function fetchUsers(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers();
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready) void fetchUsers();
  }, [ready]);

  async function addUser(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    setAdding(true);
    try {
      const result = await createUser({
        name: name.trim(),
        email: email.trim(),
        department: department.trim() || undefined,
      });
      setUsers((prev) => [...prev, result.user].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setEmail("");
      setDepartment("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add the user.");
    } finally {
      setAdding(false);
    }
  }

  const inputCls =
    "w-full rounded-[10px] border border-[#BDB7AC] bg-white px-3 py-2 text-[13px] shadow-[0_1px_2px_rgba(21,21,18,0.05)] transition-all focus:border-[#F0644E] focus:outline-none focus:shadow-[0_0_0_3px_#FBE1DB]";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#77736A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0644E]" aria-hidden="true" />
              Directory
            </p>
            <h1 className="mt-1 text-[30px] font-semibold leading-[36px] tracking-[-0.02em]">People</h1>
            <p className="mt-1 max-w-xl text-[13px] text-[#77736A]">
              Everyone here can be assigned from chat. Names are matched against this list — nothing is ever invented.
            </p>
          </div>
          <p className="rounded-full border border-[#D8D3C9] bg-[#FBFAF7] px-3 py-1 font-mono text-[12px] text-[#4E4C46]">
            {users.length} members
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            {!ready || loading ? (
              authError ? <ErrorState message={authError} onRetry={() => window.location.reload()} /> : configError ? <ConfigErrorBanner /> : <TableSkeleton rows={5} />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchUsers} />
            ) : users.length === 0 ? (
              <EmptyState title="No people yet." body="Add the first assignable team member with the form." />
            ) : (
              <div className="overflow-hidden rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] shadow-[0_1px_2px_rgba(21,21,18,0.06),0_2px_8px_rgba(21,21,18,0.06)]">
                {users.map((u) => (
                  <div key={u.id} className="group flex items-center gap-3 border-b border-[#D8D3C9] px-5 py-3.5 transition-colors last:border-0 hover:bg-[#FDF1EE]/50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#151512] text-[13px] font-bold text-[#FBFAF7] transition-transform duration-200 group-hover:scale-105">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold leading-5 tracking-tight">{u.name}</p>
                      <p className="truncate font-mono text-[11px] text-[#77736A]">{u.email}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full border border-[#D8D3C9] bg-[#EFECE5] px-2.5 py-0.5 text-[12px] font-medium text-[#4E4C46]">{u.department ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <aside className="h-fit rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-5 shadow-[0_1px_2px_rgba(21,21,18,0.06),0_2px_8px_rgba(21,21,18,0.06)] lg:sticky lg:top-6">
            <h2 className="text-[15px] font-semibold tracking-tight">Add a person</h2>
            <form onSubmit={addUser} className="mt-3 flex flex-col gap-3">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#4E4C46]">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className={inputCls} placeholder="Aarav Patel" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#4E4C46]">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={200} className={inputCls} placeholder="aarav@example.com" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#4E4C46]">Department (optional)</span>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={120} className={inputCls} placeholder="Backend" />
              </label>
              {formError && (
                <p className="rounded-[10px] bg-[#FDF1EE] px-3 py-2 text-[13px] text-[#B83C34]" role="alert">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={adding}
                className="btn-press rounded-[10px] bg-[#F0644E] py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(240,100,78,0.6)] transition-colors duration-150 hover:bg-[#C94A37] disabled:opacity-60"
              >
                {adding ? "Adding…" : "Add person"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
