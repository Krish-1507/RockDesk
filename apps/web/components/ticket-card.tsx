import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { PriorityPill, StatusPill } from "./pills";

export interface TicketCardData {
  id: string;
  ticketNumber: number;
  title: string;
  assignee: { name: string } | null;
  dueDate: string | null;
  priority: string;
  status: string;
}

function formatDue(iso: string | null): string {
  if (!iso) return "No deadline";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function TicketCard({ ticket, linkToAdmin }: { ticket: TicketCardData; linkToAdmin?: boolean }): React.JSX.Element {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[12px] font-semibold text-[#C94A37]">#{ticket.ticketNumber}</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#77736A]">Ticket created</span>
        <span className="ml-auto flex gap-1.5">
          <StatusPill status={ticket.status} />
          <PriorityPill priority={ticket.priority} />
        </span>
      </div>
      <div className="mt-2 text-[16px] font-semibold leading-[22px]">{ticket.title}</div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#4E4C46]">
        <span>
          <span className="text-[#77736A]">Assignee · </span>
          <span className="font-medium text-[#151512]">{ticket.assignee?.name ?? "Unassigned"}</span>
        </span>
        <span>
          <span className="text-[#77736A]">Due · </span>
          <span className="font-medium text-[#151512]">{formatDue(ticket.dueDate)}</span>
        </span>
      </div>
      {linkToAdmin && (
        <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#C94A37]">
          Open in admin <ArrowRight size={14} />
        </span>
      )}
    </>
  );

  const cls =
    "animate-card-in block rounded-[14px] border border-[#BDB7AC] border-l-4 border-l-[#F0644E] bg-[#FBFAF7] p-5 transition-colors duration-150 hover:border-[#F0644E]";

  if (linkToAdmin) {
    return (
      <Link href={`/admin/${ticket.id}`} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}
