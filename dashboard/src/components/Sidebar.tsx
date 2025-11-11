// /dashboard/src/components/Sidebar.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Truck,
  LogOut,
  ChevronFirst,
  ChevronLast,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type NavKey = 'dashboard' | 'map' | 'trucks';

type SidebarProps = {
  active?: NavKey;
  onNavigate?: (key: NavKey) => void;
  onLogout?: () => void;
  className?: string;
};

type Item = {
  key: NavKey;
  label: string;
  href: string;
  Icon: LucideIcon;
  testId: string;
};

const ITEMS: readonly Item[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/',
    Icon: LayoutDashboard,
    testId: 'sidebar-item-dashboard',
  },
  {
    key: 'map',
    label: 'Live Map',
    href: '/map',
    Icon: Map,
    testId: 'sidebar-item-map',
  },
  {
    key: 'trucks',
    label: 'Trucks',
    href: '/trucks',
    Icon: Truck,
    testId: 'sidebar-item-trucks',
  },
] as const;

const WIDTH_EXPANDED = 'w-64';
const WIDTH_COLLAPSED = 'w-16';

export default function Sidebar(props: SidebarProps) {
  const pathname = usePathname();

  const derivedActive = React.useMemo<NavKey | undefined>(() => {
    if (props.active) return props.active;
    if (!pathname) return undefined;
    if (pathname.startsWith('/trucks')) return 'trucks';
    if (pathname.startsWith('/map')) return 'map';
    return 'dashboard';
  }, [pathname, props.active]);

  const [expanded, setExpanded] = React.useState(true);

  React.useEffect(() => {
    try {
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('sidebar:expanded')
          : null;
      const preferCollapsed =
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
      setExpanded(stored ? stored === '1' : !preferCollapsed);
    } catch {
      setExpanded(true);
    }
  }, []);

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sidebar:expanded', expanded ? '1' : '0');
      }
    } catch {
      /* ignore */
    }
  }, [expanded]);

  const toggle = React.useCallback(() => setExpanded((v) => !v), []);
  const onToggleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const k = e.key;
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        toggle();
        return;
      }
      if (k === 'ArrowLeft') setExpanded(false);
      if (k === 'ArrowRight') setExpanded(true);
    },
    [toggle],
  );

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 transition-[width] duration-300 motion-reduce:transition-none',
        expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED,
        props.className,
      )}
      data-testid="sidebar"
      aria-label="Sidebar"
    >
      <nav className="h-full flex flex-col bg-slate-950 border-r border-slate-800/60">
        {/* Header */}
        <div className="p-3 flex items-center justify-between">
          <span
            className={cn(
              'font-bold text-lg tracking-tight select-none transition-opacity duration-200 motion-reduce:transition-none',
              expanded ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden={!expanded ? 'true' : 'false'}
          >
            ICE-TRUCK
          </span>
          <button
            type="button"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={expanded ? 'true' : 'false'}
            onClick={toggle}
            onKeyDown={onToggleKeyDown}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            data-testid="sidebar-toggle"
          >
            {expanded ? <ChevronFirst size={18} /> : <ChevronLast size={18} />}
          </button>
        </div>

        {/* Nav */}
        <ul className="flex-1 px-2 py-1 space-y-1">
          {ITEMS.map((it) => (
            <NavItem
              key={it.key}
              item={it}
              active={derivedActive === it.key}
              expanded={expanded}
              {...(props.onNavigate ? { onNavigate: props.onNavigate } : {})}
            />
          ))}
        </ul>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500 to-cyan-500"
            aria-hidden="true"
          />
          <div
            className={cn(
              'overflow-hidden transition-all duration-200 motion-reduce:transition-none',
              expanded ? 'w-48' : 'w-0',
            )}
            aria-hidden={!expanded ? 'true' : 'false'}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="leading-4">
                <h4 className="font-semibold text-slate-100">Admin</h4>
                <span className="text-xs text-slate-400">
                  admin@icetruck.com
                </span>
              </div>
              <button
                type="button"
                aria-label="Sign out"
                onClick={props.onLogout}
                className="p-1.5 rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                data-testid="sidebar-logout"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}

const NavItem = React.memo(function NavItem({
  item,
  active,
  expanded,
  onNavigate,
}: {
  item: Item;
  active: boolean;
  expanded: boolean;
  onNavigate?: (key: NavKey) => void;
}) {
  const { href, Icon, label, key: navKey, testId } = item;

  const base =
    'group flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500';
  const activeCls =
    'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-sm';
  const idleCls = 'text-slate-200 hover:bg-slate-800';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(navKey);
    }
  };

  return (
    <li>
      <Link
        href={href}
        onClick={handleClick}
        className={cn(base, active ? activeCls : idleCls)}
        aria-current={active ? 'page' : undefined}
        data-testid={testId}
        title={expanded ? undefined : label}
      >
        <Icon size={20} aria-hidden="true" />
        <span
          className={cn(
            'whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none',
            expanded ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden={!expanded ? 'true' : 'false'}
        >
          {label}
        </span>
      </Link>
    </li>
  );
});
