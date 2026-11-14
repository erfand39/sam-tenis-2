'use client';

import type { ReactNode } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { usePathname } from 'next/navigation';

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ClubPageMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        key={pathname}
        className="club-page-motion"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

export function AccessCardMotion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        className={className}
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.38, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.section>
    </MotionConfig>
  );
}
