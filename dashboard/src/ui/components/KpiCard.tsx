'use client';

import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';
import { cn } from '@/ui/utils';
import { theme } from '@/ui/tokens/theme';

export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  className?: string;
}

export function KpiCard({ label, value, delta, className }: KpiCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: theme.motion.distance.sm }}
      whileInView={{
        opacity: 1,
        y: 0,
        transition: reduce
          ? { duration: 0 }
          : {
              duration: theme.motion.duration.short / 1000,
              ease: theme.motion.easing.entrance,
            },
      }}
      viewport={{ once: true, margin: '-40px' }}
      className={cn(
        'card-glass',
        // hover micro-interaction
        reduce
          ? ''
          : 'transition-transform duration-150 will-change-transform hover:scale-[1.02]',
        'p-4',
        className,
      )}
      role="group"
      aria-label={`${label} KPI`}
    >
      <div className="text-xs uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {delta && (
        <div className="mt-1 text-xs text-(--status-info)">{delta}</div>
      )}
    </motion.div>
  );
}
