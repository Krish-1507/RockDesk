"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import AppShell from "@/components/app-shell";
import { PriorityPill, StatusPill } from "@/components/pills";
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
  const { ready } = useAdminGuard();
  const [items, setItems] = useState<TicketListItem[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
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
  }, [search, status, assigneeId, priority, overdueOnly, page]);

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
    "rounded-[10px] border border-[#BDB7AC] bg-white px-3 py-2 text-[13px] font-medium focus:border-[#151512] focus:outline-none";

  if (!ready) {
    return (
      <AppShell>
        <div className="p-8">
          <TableSkeleton />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#77736A]">Operations</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-[36px]">Tickets</h1>
          </div>
          <p className="font-mono text-[12px] text-[#77736A]">
            {total} total · newest first
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77736A]" />
            <input
              value={search}
              onChange={(e) => resetPageAndFetch(() => setSearch(e.target.value))}
              placeholder="Search title, description, or #number…"
              aria-label="Search tickets"
              className="w-full rounded-[10px] border border-[#BDB7AC] bg-white py-2 pl-9 pr-3 text-[13px] focus:border-[#151512] focus:outline-none"
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

        <div className="mt-4">
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchTickets} />
          ) : items.length === 0 ? (
            <EmptyState title="No tickets match these filters." body="Try widening the search or clearing a filter. New tickets from chat appear here instantly." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7]">
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#D8D3C9] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77736A]">
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
                      <tr key={t.id} className="border-b border-[#D8D3C9] transition-colors duration-150 last:border-0 hover:bg-[#F5F3EE]">
                        <td className="px-5 py-3.5">
                          <Link href={`/admin/${t.id}`} className="block">
                            <span className="font-mono text-[12px] font-semibold text-[#C94A37]">#{t.ticketNumber}</span>
                            <span className="block max-w-md truncate text-[14px] font-medium leading-[20px]">{t.title}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5"><StatusPill status={t.status} /></td>
                        <td className="px-4 py-3.5 text-[13px]">{t.assignee?.name ?? <span className="text-[#77736A]">Unassigned</span>}</td>
                        <td className="px-4 py-3.5"><PriorityPill priority={t.priority} /></td>
                        <td className={`px-4 py-3.5 font-mono text-[12px] ${isOverdue(t) ? "font-semibold text-[#B83C34]" : ""}`}>{formatDue(t.dueDate)}</td>
                        <td className="px-4 py-3.5 font-mono text-[12px] text-[#77736A]">{formatUpdated(t.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[12px] text-[#77736A]">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-[10px] border border-[#BDB7AC] bg-[#FBFAF7] px-3.5 py-1.5 text-[13px] font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-[10px] border border-[#BDB7AC] bg-[#FBFAF7] px-3.5 py-1.5 text-[13px] font-semibold disabled:opacity-40"
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
