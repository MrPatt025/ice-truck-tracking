'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/ui/utils';
import { theme } from '@/ui/tokens/theme';
import React from 'react';

export interface SidebarProps {
  isOpen?: boolean; // tablet collapsible state
  className?: string;
  children?: React.ReactNode;
}

// Sidebar: fixed on desktop, collapsible on tablet, hidden on mobile.
export function Sidebar({ isOpen = true, className, children }: SidebarProps) {
  const reduce = useReducedMotion();

  return (
    <motion.aside
      aria-label="Primary navigation"
      initial={{ opacity: 0, x: -theme.motion.distance.md }}
      animate={{
        opacity: 1,
        x: 0,
        transition: reduce
          ? { duration: 0 }
          : {
              duration: theme.motion.duration.medium / 1000,
              ease: theme.motion.easing.entrance,
            },
      }}
      className={cn(
        // layout
        'fixed left-0 top-0 z-40 hidden h-dvh w-64 lg:block',
        // glass + depth
        'glass-surface',
        // spacing
        'p-4',
        // tablet collapsible behavior
        isOpen ? 'md:translate-x-0' : 'md:-translate-x-full',
        className,
      )}
    >
      <div className="flex h-full flex-col gap-4">
        {children ?? (
          <nav className="flex flex-col gap-2 text-sm">
            <button
              type="button"
              className="rounded-md px-3 py-2 hover:bg-white/5 focus-ring-theme text-left"
            >
              Overview
            </button>
            <button
              type="button"
              className="rounded-md px-3 py-2 hover:bg-white/5 focus-ring-theme text-left"
            >
              Fleet
            </button>
            <button
              type="button"
              className="rounded-md px-3 py-2 hover:bg-white/5 focus-ring-theme text-left"
            >
              Alerts
            </button>
            <button
              type="button"
              className="rounded-md px-3 py-2 hover:bg-white/5 focus-ring-theme text-left"
            >
              Reports
            </button>
          </nav>
        )}
      </div>
    </motion.aside>
  );
}
