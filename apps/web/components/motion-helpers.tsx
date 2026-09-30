"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Standard entrance: rises once when mounted or scrolled into view. */
export function Rise({
  children,
  delay = 0,
  className,
  y = 14,
  immediate = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  /** Above-the-fold content: animate on mount instead of waiting for the scroll observer. */
  immediate?: boolean;
}): React.JSX.Element {
  const reduce = useReducedMotion();
  if (immediate) {
    return (
      <motion.div
        className={className}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: EASE }}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container — children wrapped in <StaggerItem> reveal in sequence. */
export function Stagger({
  children,
  className,
  delay = 0,
  gap = 0.07,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  gap?: number;
}): React.JSX.Element {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : gap, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Physical press feedback for buttons and cards. */
export function Pressable({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <motion.span
      className="inline-flex"
      whileTap={{ scale: 0.98, y: 1 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.span>
  );
}

export { EASE };
