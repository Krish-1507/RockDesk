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
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-[12px] text-[#77736A]">#{ticket.ticketNumber}</span>
        <span className="ml-auto flex gap-4">
          <StatusPill status={ticket.status} />
          <PriorityPill priority={ticket.priority} />
        </span>
      </div>
      <div className="mt-1.5 text-[15px] font-semibold leading-[22px] tracking-tight">{ticket.title}</div>
      <p className="mt-1 text-[13px] text-[#77736A]">
        {ticket.assignee?.name ?? "Unassigned"} · Due {formatDue(ticket.dueDate)}
      </p>
      {linkToAdmin && (
        <span className="mt-3 flex items-center gap-1 border-t border-[#D8D3C9] pt-2.5 text-[13px] font-semibold text-[#151512]">
          Open in admin
          <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      )}
    </>
  );

  const cls =
    "group block rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-5 transition-colors duration-150 hover:border-[#BDB7AC]";

  const animated = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
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
