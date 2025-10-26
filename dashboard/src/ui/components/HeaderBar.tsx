'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/ui/utils';
import { theme } from '@/ui/tokens/theme';
import React from 'react';

export interface HeaderBarProps {
  className?: string;
  title?: string;
  right?: React.ReactNode;
}

// Header pinned on top of main content; glassy with accent underline.
export function HeaderBar({
  className,
  title = 'Command Center',
  right,
}: HeaderBarProps) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      role="banner"
      initial={{ opacity: 0, y: -theme.motion.distance.sm }}
      animate={{
        opacity: 1,
        y: 0,
        transition: reduce
          ? { duration: 0 }
          : {
              duration: theme.motion.duration.short / 1000,
              ease: theme.motion.easing.entrance,
            },
      }}
      className={cn(
        'sticky top-0 z-30',
        'glass-surface',
        'mx-4 mt-4 rounded-xl px-4 py-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-2 w-2 rounded-full bg-(--glow-ok) shadow-[0_0_16px_var(--glow-ok)]"
            aria-hidden
          />
          <h1 className="text-lg font-semibold text-brand-gradient">{title}</h1>
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </motion.header>
  );
}
