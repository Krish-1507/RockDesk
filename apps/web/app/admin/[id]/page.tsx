"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import AppShell from "@/components/app-shell";
import { ConfigErrorBanner } from "@/components/config-error";
import { FieldLabel, MetaPill, PriorityPill, StatusPill } from "@/components/pills";
import { ErrorState, TableSkeleton } from "@/components/states";
import { getTicket, listUsers, patchTicket, type DirectoryUser, type TicketDetail } from "@/lib/api-client";
import { useAdminGuard } from "../use-admin-guard";

function formatDue(iso: string | null): string {
  if (!iso) return "No deadline";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function AdminDetailPage(): React.JSX.Element {
  const { ready, configError, authError } = useAdminGuard();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTicket(id);
      setDetail(result);
      setStatus(result.ticket.status);
      setAssigneeId(result.ticket.assignee?.id ?? "");
      setDueDate(result.ticket.dueDate ?? "");
      setPriority(result.ticket.priority);
      const dir = await listUsers();
      setUsers(dir.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the ticket.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (ready) void fetchDetail();
  }, [ready, fetchDetail]);

  async function save(): Promise<void> {
    if (!detail) return;
    setSaving(true);
    setSavedNote(null);
    try {
      const patch: Record<string, unknown> = {};
      if (status !== detail.ticket.status) patch.status = status;
      const nextAssignee = assigneeId === "" ? null : assigneeId;
      const currentAssignee = detail.ticket.assignee?.id ?? null;
      if (nextAssignee !== currentAssignee) patch.assigneeId = nextAssignee;
      const nextDue = dueDate === "" ? null : dueDate;
      if (nextDue !== detail.ticket.dueDate) patch.dueDate = nextDue;
      if (priority !== detail.ticket.priority) patch.priority = priority;
      if (Object.keys(patch).length === 0) {
        setSavedNote("Nothing changed.");
        return;
      }
      const updated = await patchTicket(id, patch);
      setDetail((prev) => (prev ? { ...prev, ticket: { ...prev.ticket, ...updated.ticket } } : prev));
      setSavedNote("Saved.");
    } catch (err) {
      setSavedNote(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready || loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl p-8">{authError ? <ErrorState message={authError} onRetry={() => window.location.reload()} /> : configError ? <ConfigErrorBanner /> : <TableSkeleton rows={4} />}</div>
      </AppShell>
    );
  }

  if (error || !detail) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl p-8">
          <ErrorState message={error ?? "Ticket not found."} onRetry={fetchDetail} />
        </div>
      </AppShell>
    );
  }

  const t = detail.ticket;
  const inputCls =
    "w-full rounded-[10px] border border-[#BDB7AC] bg-white px-3 py-2 text-[13px] shadow-[0_1px_2px_rgba(21,21,18,0.05)] transition-all focus:border-[#F0644E] focus:outline-none focus:shadow-[0_0_0_3px_#FBE1DB]";

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
        <Link href="/admin" className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#77736A] transition-colors hover:text-[#151512]">
          <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" /> All tickets
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-[12px] font-semibold text-[#C94A37]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0644E]" aria-hidden="true" />#{t.ticketNumber}
            </p>
            <h1 className="mt-1 max-w-2xl text-[26px] font-semibold leading-[32px] tracking-[-0.015em]">{t.title}</h1>
          </div>
          <div className="flex gap-1.5">
            <StatusPill status={t.status} />
            <PriorityPill priority={t.priority} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <section className="card-lift rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-5 shadow-[0_1px_2px_rgba(21,21,18,0.05)]">
              <FieldLabel>Description</FieldLabel>
              <p className="mt-2 text-[14px] leading-[22px]">{t.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  ["Due", formatDue(t.dueDate), false],
                  ["Assignee", t.assignee?.name ?? "Unassigned", false],
                  ["Language", t.language ?? "—", true],
                  ["Source", t.sourceType, false],
                ].map(([label, value, mono]) => (
                  <div key={label as string} className="rounded-[10px] border border-[#D8D3C9] bg-white/60 px-3 py-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#77736A]">{label}</p>
                    <p className={`mt-0.5 truncate text-[13px] font-medium ${mono ? "font-mono text-[12px]" : ""}`}>{value}</p>
                  </div>
                ))}
              </div>
              {t.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.tags.map((tag) => (
                    <MetaPill key={tag} label={tag} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-5 shadow-[0_1px_2px_rgba(21,21,18,0.05)]">
              <FieldLabel>Original chat message</FieldLabel>
              <blockquote className="mt-2 rounded-r-[10px] border-l-2 border-[#F0644E] bg-[#FDF1EE]/60 py-2 pl-3 pr-3 text-[14px] leading-[22px] text-[#4E4C46]">
                {t.sourceMessage ?? "No source message recorded."}
              </blockquote>
              {t.originalTitle && t.originalTitle !== t.sourceMessage && (
                <p className="mt-2 text-[12px] text-[#77736A]">First reported as: {t.originalTitle}</p>
              )}
            </section>

            {detail.events.length > 0 && (
              <section className="rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-5 shadow-[0_1px_2px_rgba(21,21,18,0.05)]">
                <FieldLabel>Activity</FieldLabel>
                <ul className="relative mt-3 flex flex-col gap-3.5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-[#D8D3C9]">
                  {detail.events.map((e) => (
                    <li key={e.id} className="relative flex items-baseline gap-3 pl-5 text-[13px]">
                      <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[#FBFAF7] bg-[#F0644E] shadow" aria-hidden="true" />
                      <span className="shrink-0 font-mono text-[11px] text-[#77736A]">
                        {new Date(e.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="font-semibold">{e.eventType.replace(/_/g, " ")}</span>
                      {Object.keys(e.metadata).length > 0 && (
                        <span className="truncate font-mono text-[11px] text-[#77736A]">{JSON.stringify(e.metadata)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="h-fit rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-5 shadow-[0_1px_2px_rgba(21,21,18,0.06),0_2px_8px_rgba(21,21,18,0.06)] lg:sticky lg:top-6">
            <FieldLabel>Edit ticket</FieldLabel>
            <div className="mt-3 flex flex-col gap-3">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#4E4C46]">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  {["Open", "In Progress", "Resolved"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#4E4C46]">Assignee</span>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputCls}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}{u.department ? ` — ${u.department}` : ""}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#4E4C46]">Due date</span>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#4E4C46]">Priority</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                  {["Low", "Medium", "High", "Urgent"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={save}
                disabled={saving}
                className="btn-press mt-1 rounded-[10px] bg-[#151512] py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(21,21,18,0.5)] transition-opacity duration-150 hover:opacity-85 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              {savedNote && <p className={`rounded-[10px] px-3 py-2 text-[12px] font-medium ${savedNote.includes("Could not") ? "bg-[#FDF1EE] text-[#B83C34]" : "bg-[#E3EEE6] text-[#3E7650]"}`} role="status">{savedNote}</p>}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
