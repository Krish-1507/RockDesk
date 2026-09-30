import type { CSSProperties, ReactNode } from "react";

const STATUS_STYLES: Record<string, CSSProperties> = {
  Open: { background: "#FBE1DB", color: "#C94A37", border: "1px solid #F0B4A6" },
  "In Progress": { background: "#FBF3DF", color: "#A26724", border: "1px solid #E7D3A7" },
  Resolved: { background: "#E3EEE6", color: "#3E7650", border: "1px solid #BFD8C6" },
};

const STATUS_DOT: Record<string, string> = {
  Open: "#F0644E",
  "In Progress": "#A26724",
  Resolved: "#3E7650",
};

const PRIORITY_STYLES: Record<string, CSSProperties> = {
  Low: { background: "#EFECE5", color: "#4E4C46", border: "1px solid #D8D3C9" },
  Medium: { background: "#E9EDFB", color: "#2F5BEA", border: "1px solid #C3CFF5" },
  High: { background: "#FBE1DB", color: "#C94A37", border: "1px solid #F0B4A6" },
  Urgent: { background: "#B83C34", color: "#FFFFFF", border: "1px solid #B83C34" },
};

function Pill({ label, style, dot }: { label: string; style?: CSSProperties; dot?: string }): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-[16px]"
      style={style}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} aria-hidden="true" />}
      {label}
    </span>
  );
}

export function StatusPill({ status }: { status: string }): React.JSX.Element {
  return (
    <Pill label={status} style={STATUS_STYLES[status] ?? STATUS_STYLES.Open} dot={STATUS_DOT[status] ?? STATUS_DOT.Open} />
  );
}

export function PriorityPill({ priority }: { priority: string }): React.JSX.Element {
  return <Pill label={priority} style={PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Medium} />;
}

export function MetaPill({ label }: { label: string }): React.JSX.Element {
  return (
    <Pill
      label={label}
      style={{ background: "#EFECE5", color: "#4E4C46", border: "1px solid #D8D3C9" }}
    />
  );
}

export function FieldLabel({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77736A]">
      {children}
    </div>
  );
}
