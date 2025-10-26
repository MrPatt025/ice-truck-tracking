'use client';

import React from 'react';
import { cn } from '@/ui/utils';

export interface TabBarMobileProps {
  className?: string;
  items?: Array<{
    key: string;
    label: string;
    href: string;
    active?: boolean;
    icon?: React.ReactNode;
  }>;
}

// Mobile bottom tab bar. Visible on mobile only.
export function TabBarMobile({ className, items }: TabBarMobileProps) {
  const tabs = items ?? [
    { key: 'overview', label: 'Overview', href: '#', active: true },
    { key: 'fleet', label: 'Fleet', href: '#' },
    { key: 'alerts', label: 'Alerts', href: '#' },
    { key: 'reports', label: 'Reports', href: '#' },
  ];

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t p-2 lg:hidden',
        'glass-surface',
        className,
      )}
      role="navigation"
      aria-label="Mobile"
    >
      {tabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          className={cn(
            'flex flex-col items-center gap-1 rounded-md px-3 py-1.5 text-xs focus-ring-theme',
            t.active ? 'text-white' : 'text-white/70 hover:text-white',
          )}
          aria-current={t.active ? 'page' : undefined}
        >
          {t.icon}
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}
