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
    "mt-1 w-full rounded-[10px] border border-[#BDB7AC] bg-white px-3 py-2 text-[13.5px] focus:border-[#8a867e] focus:outline-none";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[24px] font-semibold leading-[30px] tracking-[-0.01em]">People</h1>
          <p className="text-[12.5px] text-[#77736A]">{users.length} members</p>
        </div>
        <p className="mt-1 max-w-xl text-[13px] leading-[20px] text-[#77736A]">
          Everyone here can be assigned from chat. Names are matched against this list — nothing is ever invented.
        </p>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_300px]">
          <div>
            {!ready || loading ? (
              authError ? <ErrorState message={authError} onRetry={() => window.location.reload()} /> : configError ? <ConfigErrorBanner /> : <TableSkeleton rows={5} />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchUsers} />
            ) : users.length === 0 ? (
              <EmptyState title="No people yet." body="Add the first assignable team member with the form." />
            ) : (
              <ul className="divide-y divide-[#D8D3C9] border-y border-[#D8D3C9]">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFECE5] text-[12px] font-bold text-[#4E4C46]">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium leading-5">{u.name}</p>
                      <p className="truncate font-mono text-[11.5px] text-[#77736A]">{u.email}</p>
                    </div>
                    <span className="shrink-0 text-[12.5px] text-[#77736A]">{u.department ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside>
            <h2 className="text-[14px] font-semibold">Add a person</h2>
            <form onSubmit={addUser} className="mt-3 flex flex-col gap-3.5">
              <label className="block">
                <span className="block text-[12.5px] font-medium text-[#4E4C46]">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className={inputCls} placeholder="Aarav Patel" />
              </label>
              <label className="block">
                <span className="block text-[12.5px] font-medium text-[#4E4C46]">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={200} className={inputCls} placeholder="aarav@example.com" />
              </label>
              <label className="block">
                <span className="block text-[12.5px] font-medium text-[#4E4C46]">Department <span className="font-normal text-[#77736A]">(optional)</span></span>
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
                className="rounded-[10px] bg-[#151512] py-2 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-85 disabled:opacity-50"
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
