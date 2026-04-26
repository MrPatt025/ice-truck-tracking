'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Truck,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Route,
  RadioTower,
  ShieldCheck,
  Menu,
  X,
  Snowflake,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore, hasPermission } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard:view',
  },
  {
    label: 'Fleet Management',
    href: '/fleet',
    icon: Truck,
    permission: 'fleet:view',
  },
  {
    label: 'Live Tracking',
    href: '/tracking',
    icon: Route,
    permission: 'fleet:view',
  },
  {
    label: 'Operations',
    href: '/operations',
    icon: RadioTower,
    permission: 'reports:view',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permission: 'reports:view',
  },
  {
    label: 'Alerts & Rules',
    href: '/alerts',
    icon: Bell,
    permission: 'alerts:view',
  },
  {
    label: 'Compliance',
    href: '/compliance',
    icon: ShieldCheck,
    permission: 'alerts:view',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings:view',
  },
  { label: 'Admin', href: '/admin', icon: Shield, permission: 'users:view' },
]

export default function AppSidebar({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const currentPathname = pathname ?? ''
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const filteredNav = navItems.filter(item =>
    hasPermission(user?.role, item.permission)
  )

  const isActive = (href: string) => {
    if (href === '/dashboard') return currentPathname === '/dashboard'
    return currentPathname.startsWith(href)
  }

  const handleLogout = () => {
    logout()
    globalThis.location.href = '/login'
  }

  return (
    <div className='flex h-screen bg-background overflow-hidden'>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/50 z-40 lg:hidden'
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative z-50 flex flex-col h-full bg-card border-r border-border transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className='flex items-center gap-3 px-4 h-16 border-b border-border shrink-0'>
          <div className='flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10'>
            <Snowflake className='w-5 h-5 text-primary' />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className='font-bold text-lg whitespace-nowrap'
            >
              Ice Truck
            </motion.span>
          )}
        </div>

        {/* Navigation */}
        <nav className='flex-1 overflow-y-auto py-4 px-2 space-y-1'>
          {filteredNav.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <motion.div
                    layoutId='sidebar-active'
                    className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full'
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className='w-5 h-5 shrink-0' />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && !!item.badge && item.badge > 0 && (
                  <span className='ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full'>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className='border-t border-border p-3 shrink-0'>
          {user && (
            <div
              className={cn(
                'flex items-center gap-3',
                collapsed && 'justify-center'
              )}
            >
              <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0'>
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate'>{user.name}</p>
                  <p className='text-xs text-muted-foreground truncate capitalize'>
                    {user.role}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  className='p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors'
                  title='Sign out'
                >
                  <LogOut className='w-4 h-4' />
                </button>
              )}
            </div>
          )}
          {!user && !collapsed && (
            <Link
              href='/login'
              className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'
            >
              <User className='w-4 h-4' />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className='hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-background items-center justify-center text-muted-foreground hover:text-foreground shadow-sm transition-colors'
        >
          {collapsed ? (
            <ChevronRight className='w-3 h-3' />
          ) : (
            <ChevronLeft className='w-3 h-3' />
          )}
        </button>
      </aside>

      {/* Main content area */}
      <main className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        {/* Top bar (mobile) */}
        <div className='lg:hidden flex items-center gap-2 h-14 px-4 border-b border-border bg-card shrink-0'>
          <button
            onClick={() => setMobileOpen(true)}
            className='p-2 rounded-md hover:bg-muted'
          >
            {mobileOpen ? (
              <X className='w-5 h-5' />
            ) : (
              <Menu className='w-5 h-5' />
            )}
          </button>
          <div className='flex items-center gap-2'>
            <Snowflake className='w-5 h-5 text-primary' />
            <span className='font-bold'>Ice Truck</span>
          </div>
        </div>

        {/* Page content */}
        <div className='flex-1 overflow-y-auto'>{children}</div>
      </main>
    </div>
  )
}
