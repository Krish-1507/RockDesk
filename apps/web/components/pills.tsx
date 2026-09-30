import type { ReactNode } from "react";

const STATUS_COLOR: Record<string, string> = {
  Open: "#C94A37",
  "In Progress": "#A26724",
  Resolved: "#3E7650",
};

const PRIORITY_COLOR: Record<string, string> = {
  Low: "#77736A",
  Medium: "#2F5BEA",
  High: "#C94A37",
  Urgent: "#B83C34",
};

function Dot({ color }: { color: string }): React.JSX.Element {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />;
}

export function StatusPill({ status }: { status: string }): React.JSX.Element {
  const color = STATUS_COLOR[status] ?? "#C94A37";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color }}>
      <Dot color={color} />
      {status}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: string }): React.JSX.Element {
  const color = PRIORITY_COLOR[priority] ?? "#2F5BEA";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color }}>
      <Dot color={color} />
      {priority}
    </span>
  );
}

export function MetaPill({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center rounded-md border border-[#D8D3C9] px-2 py-0.5 text-[11.5px] font-medium text-[#4E4C46]">
      {label}
    </span>
  );
}

export function FieldLabel({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="text-[12px] font-semibold text-[#4E4C46]">{children}</div>;
}
