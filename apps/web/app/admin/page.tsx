"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import AppShell from "@/components/app-shell";
import { PriorityPill, StatusPill } from "@/components/pills";
import { ConfigErrorBanner } from "@/components/config-error";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/states";
import { listTickets, listUsers, type DirectoryUser, type TicketListItem } from "@/lib/api-client";
import { useAdminGuard } from "./use-admin-guard";

const STATUSES = ["", "Open", "In Progress", "Resolved"];
const PRIORITIES = ["", "Low", "Medium", "High", "Urgent"];

function formatDue(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isOverdue(t: { dueDate: string | null; status: string }): boolean {
  if (!t.dueDate || t.status === "Resolved") return false;
  return t.dueDate < new Date().toISOString().slice(0, 10);
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default function AdminListPage(): React.JSX.Element {
  const { ready, configError, authError } = useAdminGuard();
  const [items, setItems] = useState<TicketListItem[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (assigneeId) params.set("assigneeId", assigneeId);
      if (priority) params.set("priority", priority);
      if (dueFrom) params.set("dueFrom", dueFrom);
      if (dueTo) params.set("dueTo", dueTo);
      if (overdueOnly) params.set("overdue", "true");
      params.set("page", String(page));
      params.set("pageSize", "15");
      const result = await listTickets(`?${params.toString()}`);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tickets.");
    } finally {
      setLoading(false);
    }
  }, [search, status, assigneeId, priority, dueFrom, dueTo, overdueOnly, page]);

  useEffect(() => {
    if (!ready) return;
    void fetchTickets();
    listUsers().then((r) => setUsers(r.users)).catch(() => undefined);
  }, [ready, fetchTickets]);

  function resetPageAndFetch(setter: () => void): void {
    setter();
    setPage(1);
  }

  const selectCls =
    "rounded-[10px] border border-[#BDB7AC] bg-white px-3 py-2 text-[13px] font-medium shadow-[0_1px_2px_rgba(21,21,18,0.05)] transition-colors focus:border-[#F0644E] focus:outline-none focus:shadow-[0_0_0_3px_#FBE1DB]";

  if (!ready) {
    return (
      <AppShell>
        <div className="p-8">
          {authError ? <ErrorState message={authError} onRetry={() => window.location.reload()} /> : configError ? <ConfigErrorBanner /> : <TableSkeleton />}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#77736A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0644E]" aria-hidden="true" />
              Operations
            </p>
            <h1 className="mt-1 text-[30px] font-semibold leading-[36px] tracking-[-0.02em]">Tickets</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <p className="rounded-full border border-[#D8D3C9] bg-[#FBFAF7] px-3 py-1 font-mono text-[12px] text-[#4E4C46]">
              {total} total · newest first
            </p>
            <Link
              href="/chat"
              className="btn-press hidden rounded-[10px] bg-[#151512] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-85 sm:inline-block"
            >
              New from chat
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-4 shadow-[0_1px_2px_rgba(21,21,18,0.06),0_2px_8px_rgba(21,21,18,0.06)] lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77736A]" />
            <input
              value={search}
              onChange={(e) => resetPageAndFetch(() => setSearch(e.target.value))}
              placeholder="Search title, description, or #number…"
              aria-label="Search tickets"
              className="w-full rounded-[10px] border border-[#BDB7AC] bg-white py-2 pl-9 pr-3 text-[13px] shadow-[0_1px_2px_rgba(21,21,18,0.05)] transition-all focus:border-[#F0644E] focus:outline-none focus:shadow-[0_0_0_3px_#FBE1DB]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter by status" value={status} onChange={(e) => resetPageAndFetch(() => setStatus(e.target.value))} className={selectCls}>
              <option value="">All statuses</option>
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select aria-label="Filter by assignee" value={assigneeId} onChange={(e) => resetPageAndFetch(() => setAssigneeId(e.target.value))} className={selectCls}>
              <option value="">All assignees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select aria-label="Filter by priority" value={priority} onChange={(e) => resetPageAndFetch(() => setPriority(e.target.value))} className={selectCls}>
              <option value="">All priorities</option>
              {PRIORITIES.filter(Boolean).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              onClick={() => { setOverdueOnly((v) => !v); setPage(1); }}
              aria-pressed={overdueOnly}
              className={`rounded-[10px] border px-3 py-2 text-[13px] font-semibold transition-colors duration-150 ${
                overdueOnly ? "border-[#B83C34] bg-[#B83C34] text-white" : "border-[#BDB7AC] bg-white text-[#4E4C46] hover:border-[#151512]"
              }`}
            >
              Overdue
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-[12px] text-[#4E4C46]">Due from
            <input type="date" value={dueFrom} max={dueTo || undefined} onChange={(e) => resetPageAndFetch(() => setDueFrom(e.target.value))} className={`${selectCls} ml-2`} />
          </label>
          <label className="text-[12px] text-[#4E4C46]">Due through
            <input type="date" value={dueTo} min={dueFrom || undefined} onChange={(e) => resetPageAndFetch(() => setDueTo(e.target.value))} className={`${selectCls} ml-2`} />
          </label>
          {(dueFrom || dueTo) && <button className="text-[12px] text-[#C94A37]" onClick={() => { setDueFrom(""); setDueTo(""); setPage(1); }}>Clear dates</button>}
        </div>

        <div className="mt-4">
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchTickets} />
          ) : items.length === 0 ? (
            <EmptyState title="No tickets match these filters." body="Try widening the search or clearing a filter. New tickets from chat appear here instantly." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] shadow-[0_1px_2px_rgba(21,21,18,0.06),0_2px_8px_rgba(21,21,18,0.06)]">
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#D8D3C9] bg-[#F5F3EE]/60 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77736A]">
                      <th className="px-5 py-3">Ticket</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((t) => (
                      <tr key={t.id} className="group border-b border-[#D8D3C9] transition-colors duration-150 last:border-0 hover:bg-[#FDF1EE]/50">
                        <td className="px-5 py-3.5">
                          <Link href={`/admin/${t.id}`} className="block">
                            <span className="font-mono text-[12px] font-semibold text-[#C94A37]">#{t.ticketNumber}</span>
                            <span className="block max-w-md truncate text-[14px] font-medium leading-[20px] transition-colors group-hover:text-[#C94A37]">{t.title}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5"><StatusPill status={t.status} /></td>
                        <td className="px-4 py-3.5 text-[13px]">{t.assignee?.name ?? <span className="text-[#77736A]">Unassigned</span>}</td>
                        <td className="px-4 py-3.5"><PriorityPill priority={t.priority} /></td>
                        <td className={`px-4 py-3.5 font-mono text-[12px] ${isOverdue(t) ? "font-semibold text-[#B83C34]" : ""}`}>
                          {isOverdue(t) && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#B83C34]" aria-hidden="true" />}
                          {formatDue(t.dueDate)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[12px] text-[#77736A]">{formatUpdated(t.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-mono text-[12px] text-[#77736A]">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-press rounded-[10px] border border-[#BDB7AC] bg-[#FBFAF7] px-3.5 py-1.5 text-[13px] font-semibold shadow-[0_1px_2px_rgba(21,21,18,0.05)] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn-press rounded-[10px] border border-[#BDB7AC] bg-[#FBFAF7] px-3.5 py-1.5 text-[13px] font-semibold shadow-[0_1px_2px_rgba(21,21,18,0.05)] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
