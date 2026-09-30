"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import AppShell from "@/components/app-shell";
import { ConfigErrorBanner } from "@/components/config-error";
import { FieldLabel, MetaPill, PriorityPill, StatusPill } from "@/components/pills";
import { DatePicker } from "@/components/date-picker";
import { FilterSelect } from "@/components/filter-select";
import { ErrorState, TableSkeleton } from "@/components/states";
import { deleteTicket, getTicket, listUsers, patchTicket, type DirectoryUser, type TicketDetail } from "@/lib/api-client";
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
  const router = useRouter();
  const id = params.id;
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function remove(): Promise<void> {
    setDeleting(true);
    try {
      await deleteTicket(id);
      router.push("/admin");
    } catch (err) {
      setSavedNote(err instanceof Error ? err.message : "Could not delete the ticket.");
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
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

  const STATUS_CHOICES = [
    { value: "Open", label: "Open", dot: "#C94A37" },
    { value: "In Progress", label: "In Progress", dot: "#A26724" },
    { value: "Resolved", label: "Resolved", dot: "#3E7650" },
  ];
  const PRIORITY_CHOICES = [
    { value: "Low", label: "Low", dot: "#77736A" },
    { value: "Medium", label: "Medium", dot: "#2F5BEA" },
    { value: "High", label: "High", dot: "#C94A37" },
    { value: "Urgent", label: "Urgent", dot: "#B83C34" },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#77736A] transition-colors hover:text-[#151512]">
          <ArrowLeft size={14} /> All tickets
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[12px] text-[#77736A]">#{t.ticketNumber}</p>
            <h1 className="mt-1 max-w-2xl text-[22px] font-semibold leading-[28px] tracking-[-0.01em]">{t.title}</h1>
          </div>
          <div className="flex gap-4">
            <StatusPill status={t.status} />
            <PriorityPill priority={t.priority} />
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="flex min-w-0 flex-col gap-8">
            <section>
              <FieldLabel>Description</FieldLabel>
              <p className="mt-1.5 text-[14px] leading-[22px]">{t.description}</p>
              <dl className="mt-4 divide-y divide-[#D8D3C9] border-y border-[#D8D3C9]">
                <div className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[12.5px] text-[#77736A]">Due</dt>
                  <dd className="font-mono text-[12.5px]">{formatDue(t.dueDate)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[12.5px] text-[#77736A]">Assignee</dt>
                  <dd className="text-[13px] font-medium">{t.assignee?.name ?? "Unassigned"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[12.5px] text-[#77736A]">Language</dt>
                  <dd className="font-mono text-[12px]">{t.language ?? "—"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[12.5px] text-[#77736A]">Source</dt>
                  <dd className="text-[13px] font-medium">{t.sourceType}</dd>
                </div>
              </dl>
              {t.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.tags.map((tag) => (
                    <MetaPill key={tag} label={tag} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <FieldLabel>Original chat message</FieldLabel>
              <blockquote className="mt-1.5 border-l-2 border-[#BDB7AC] pl-3 text-[14px] leading-[22px] text-[#4E4C46]">
                {t.sourceMessage ?? "No source message recorded."}
              </blockquote>
              {t.originalTitle && t.originalTitle !== t.sourceMessage && (
                <p className="mt-2 text-[12px] text-[#77736A]">First reported as: {t.originalTitle}</p>
              )}
            </section>

            {detail.events.length > 0 && (
              <section>
                <FieldLabel>Activity</FieldLabel>
                <ul className="mt-2 flex flex-col divide-y divide-[#D8D3C9] border-y border-[#D8D3C9]">
                  {detail.events.map((e) => (
                    <li key={e.id} className="flex items-baseline gap-3 py-2 text-[13px]">
                      <span className="shrink-0 font-mono text-[11px] text-[#77736A]">
                        {new Date(e.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="font-medium">{e.eventType.replace(/_/g, " ")}</span>
                      {Object.keys(e.metadata).length > 0 && (
                        <span className="truncate font-mono text-[11px] text-[#77736A]">{JSON.stringify(e.metadata)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="h-fit lg:sticky lg:top-6">
            <FieldLabel>Edit ticket</FieldLabel>
            <div className="mt-3 flex flex-col gap-3.5">
              <div className="block">
                <span className="block text-[12.5px] font-medium text-[#4E4C46]">Status</span>
                <div className="mt-1">
                  <FilterSelect label="Status" value={status} options={STATUS_CHOICES} onChange={setStatus} stretch />
                </div>
              </div>
              <div className="block">
                <span className="block text-[12.5px] font-medium text-[#4E4C46]">Assignee</span>
                <div className="mt-1">
                  <FilterSelect
                    label="Assignee"
                    value={assigneeId}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...users.map((u) => ({ value: u.id, label: `${u.name}${u.department ? ` — ${u.department}` : ""}` })),
                    ]}
                    onChange={setAssigneeId}
                    stretch
                  />
                </div>
              </div>
              <div className="block">
                <span className="block text-[12.5px] font-medium text-[#4E4C46]">Due date</span>
                <div className="mt-1">
                  <DatePicker label="Due date" value={dueDate} onChange={setDueDate} stretch align="right" />
                </div>
              </div>
              <div className="block">
                <span className="block text-[12.5px] font-medium text-[#4E4C46]">Priority</span>
                <div className="mt-1">
                  <FilterSelect label="Priority" value={priority} options={PRIORITY_CHOICES} onChange={setPriority} stretch />
                </div>
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="mt-1 rounded-[10px] bg-[#151512] py-2 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-85 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              {savedNote && <p className="text-[12.5px] text-[#4E4C46]" role="status">{savedNote}</p>}
              <div className="border-t border-[#D8D3C9] pt-3">
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={remove}
                      disabled={deleting}
                      className="flex-1 rounded-[10px] bg-[#B83C34] py-2 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-85 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="rounded-[10px] border border-[#BDB7AC] px-3 py-2 text-[13px] font-medium text-[#4E4C46] hover:border-[#8a867e]"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setConfirmingDelete(true);
                      setSavedNote(null);
                    }}
                    className="w-full py-1 text-left text-[12.5px] font-medium text-[#77736A] transition-colors hover:text-[#B83C34]"
                  >
                    Delete this ticket
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
