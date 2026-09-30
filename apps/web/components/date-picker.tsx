"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface YMD {
  y: number;
  m: number;
  d: number;
}

function parseISO(v: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function toISO(y: number, m: number, d: number): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${y}-${p(m + 1)}-${p(d)}`;
}

function todayYMD(): YMD {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
}

export function DatePicker({
  label,
  value,
  min,
  max,
  onChange,
  placeholder = "dd–mm–yyyy",
  align = "left",
  stretch = false,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  align?: "left" | "right";
  stretch?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const today = useMemo(todayYMD, []);

  const parsed = parseISO(value);
  const [view, setView] = useState<YMD>(parsed ?? today);

  useEffect(() => {
    const p = parseISO(value);
    if (p) setView(p);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const leading = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const daysInPrev = new Date(view.y, view.m, 0).getDate();
    const list: Array<YMD & { outside: boolean; key: string }> = [];
    for (let i = leading - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const pm = view.m === 0 ? 11 : view.m - 1;
      const py = view.m === 0 ? view.y - 1 : view.y;
      list.push({ y: py, m: pm, d, outside: true, key: `p-${d}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ y: view.y, m: view.m, d, outside: false, key: `c-${d}` });
    }
    while (list.length % 7 !== 0) {
      const n = list.length - (leading + daysInMonth) + 1;
      const nm = view.m === 11 ? 0 : view.m + 1;
      const ny = view.m === 11 ? view.y + 1 : view.y;
      list.push({ y: ny, m: nm, d: n, outside: true, key: `n-${n}` });
    }
    return list;
  }, [view ]);

  function shiftMonth(delta: number): void {
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11, d: 1 };
      if (m > 11) return { y: v.y + 1, m: 0, d: 1 };
      return { y: v.y, m, d: 1 };
    });
  }

  function pick(day: YMD): void {
    onChange(toISO(day.y, day.m, day.d));
    setOpen(false);
  }

  const selectedISO = parsed ? value : null;
  const todayISO = toISO(today.y, today.m, today.d);
  const todayAllowed = (!min || todayISO >= min) && (!max || todayISO <= max);

  return (
    <div ref={ref} className={`relative ${stretch ? "w-full" : ""}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-[10px] border bg-white px-3 py-2 text-[13px] transition-colors duration-150 ${
          stretch ? "w-full justify-between" : ""
        } ${
          open
            ? "border-[#8a867e]"
            : parsed
              ? "border-[#BDB7AC] font-medium text-[#151512] hover:border-[#8a867e]"
              : "border-[#BDB7AC] text-[#77736A] hover:border-[#8a867e]"
        }`}
      >
        <CalendarBlank size={15} className="shrink-0 text-[#77736A]" />
        <span className={parsed ? "font-mono text-[12.5px]" : undefined}>
          {parsed ? `${parsed.d} ${MONTHS_SHORT[parsed.m]} ${parsed.y}` : placeholder}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={label}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute z-30 mt-1.5 w-64 rounded-[12px] border border-[#D8D3C9] bg-white p-3 shadow-[0_12px_32px_-12px_rgba(21,21,18,0.3)] ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4E4C46] transition-colors hover:bg-[#F5F3EE]"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <p className="text-[13px] font-semibold">
                {MONTHS[view.m]} {view.y}
              </p>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4E4C46] transition-colors hover:bg-[#F5F3EE]"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-7 text-center font-mono text-[10.5px] text-[#77736A]">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 text-center">
              {cells.map((c) => {
                const iso = toISO(c.y, c.m, c.d);
                const disabled = (min && iso < min) || (max && iso > max) ? true : false;
                const isSelected = selectedISO === iso;
                const isToday = todayISO === iso;
                return (
                  <button
                    key={c.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(c)}
                    aria-label={`${c.d} ${MONTHS[c.m]} ${c.y}`}
                    aria-pressed={isSelected}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12.5px] transition-colors duration-100 ${
                      isSelected
                        ? "bg-[#151512] font-semibold text-white"
                        : disabled
                          ? "cursor-not-allowed text-[#D8D3C9]"
                          : c.outside
                            ? "text-[#BDB7AC] hover:bg-[#F5F3EE]"
                            : isToday
                              ? "font-bold text-[#C94A37] hover:bg-[#F5F3EE]"
                              : "text-[#4E4C46] hover:bg-[#F5F3EE]"
                    }`}
                  >
                    {c.d}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#D8D3C9] pt-2">
              <button
                type="button"
                onClick={() => {
                  if (todayAllowed) pick(today);
                }}
                disabled={!todayAllowed}
                className="rounded-lg px-2 py-1 text-[12.5px] font-medium text-[#4E4C46] transition-colors hover:bg-[#F5F3EE] disabled:opacity-40"
              >
                Today
              </button>
              {parsed ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="rounded-lg px-2 py-1 text-[12.5px] font-medium text-[#C94A37] transition-colors hover:bg-[#FDF1EE]"
                >
                  Clear
                </button>
              ) : (
                <span className="px-2 py-1 font-mono text-[11px] text-[#77736A]">
                  {MONTHS_SHORT[view.m]} {view.y}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
