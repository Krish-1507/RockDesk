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
      <div className="mt-2 text-[16px] font-semibold leading-[22px] tracking-tight">{ticket.title}</div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#4E4C46]">
        <span>
          <span className="text-[#77736A]">Assignee · </span>
          <span className="font-medium text-[#151512]">{ticket.assignee?.name ?? "Unassigned"}</span>
        </span>
        <span>
          <span className="text-[#77736A]">Due · </span>
          <span className="font-mono text-[12.5px] font-medium text-[#151512]">{formatDue(ticket.dueDate)}</span>
        </span>
      </div>
      {linkToAdmin && (
        <span className="group/link mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#C94A37]">
          Open in admin
          <ArrowRight size={14} className="transition-transform duration-200 group-hover/link:translate-x-1" />
        </span>
      )}
    </>
  );

  const cls =
    "group block rounded-[14px] border border-[#D8D3C9] border-l-4 border-l-[#F0644E] bg-[#FBFAF7] p-5 shadow-[0_1px_2px_rgba(21,21,18,0.06),0_2px_8px_rgba(21,21,18,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E7B9AE] hover:shadow-[0_2px_6px_rgba(21,21,18,0.07),0_12px_32px_-12px_rgba(201,74,55,0.25)]";

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
