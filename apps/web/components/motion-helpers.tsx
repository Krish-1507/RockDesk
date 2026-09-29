"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Standard entrance: rises once when mounted or scrolled into view. */
export function Rise({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}): React.JSX.Element {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
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
