"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { TicketCardData } from "./ticket-card-data";
import { PriorityPill, StatusPill } from "./pills";
import { ArrowRight } from "@phosphor-icons/react";

export type { TicketCardData };

function formatDue(iso: string | null): string {
  if (!iso) return "No deadline";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function TicketCard({ ticket, linkToAdmin }: { ticket: TicketCardData; linkToAdmin?: boolean }): React.JSX.Element {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-[#C94A37]">#{ticket.ticketNumber}</span>
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
    "block rounded-[14px] border border-[#BDB7AC] border-l-4 border-l-[#F0644E] bg-[#FBFAF7] p-5 transition-colors duration-150 hover:border-[#F0644E]";

  const animated = (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cls}
    >
      {inner}
    </motion.div>
  );

  if (linkToAdmin) {
    return <Link href={`/admin/${ticket.id}`}>{animated}</Link>;
  }
  return animated;
}
