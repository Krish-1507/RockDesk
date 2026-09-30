"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretDown, Check } from "@phosphor-icons/react";

export interface FilterOption {
  value: string;
  label: string;
  dot?: string;
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  stretch = false,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  stretch?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

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

  const selected = options.find((o) => o.value === value) ?? options[0];
  const isFiltered = value !== "";

  return (
    <div ref={ref} className={`relative ${stretch ? "w-full" : ""}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-[10px] border bg-white px-3 py-2 text-[13px] transition-colors duration-150 ${
          stretch ? "w-full justify-between" : ""
        } ${
          open
            ? "border-[#8a867e]"
            : isFiltered
              ? "border-[#8a867e] font-semibold text-[#151512]"
              : "border-[#BDB7AC] font-medium text-[#4E4C46] hover:border-[#8a867e]"
        }`}
      >
        {selected?.dot && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: selected.dot }} aria-hidden="true" />
        )}
        <span className="whitespace-nowrap">{selected?.label}</span>
        <CaretDown
          size={13}
          weight="bold"
          className={`shrink-0 text-[#77736A] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={label}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-30 mt-1.5 w-max min-w-full rounded-[12px] border border-[#D8D3C9] bg-white p-1 shadow-[0_12px_32px_-12px_rgba(21,21,18,0.3)]"
          >
            {options.map((o) => {
              const active = o.value === value;
              return (
                <li key={o.value || "all"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-100 ${
                      active ? "bg-[#EFECE5] font-semibold text-[#151512]" : "text-[#4E4C46] hover:bg-[#F5F3EE]"
                    }`}
                  >
                    {o.dot ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: o.dot }} aria-hidden="true" />
                    ) : (
                      <span className="w-1.5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="flex-1 whitespace-nowrap">{o.label}</span>
                    {active && <Check size={14} weight="bold" className="shrink-0 text-[#C94A37]" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
