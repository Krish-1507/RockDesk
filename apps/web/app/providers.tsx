"use client";

import { MotionConfig } from "motion/react";

export default function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
