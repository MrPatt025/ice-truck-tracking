'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Users, Search, Plus, Edit, Trash2,
  UserCheck, UserX,
  Phone, Calendar, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { roleColors } from '@/lib/tokens';
import AppSidebar from '@/components/AppSidebar';
import { useAuthStore, hasPermission } from '@/stores/authStore';
import type { UserRole } from '@/lib/tokens';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended';
  lastLogin: string;
  createdAt: string;
  phone?: string;
}

// ── Mock Data ──────────────────────────────────────────────
const mockUsers: AdminUser[] = [
  { id: '1', name: 'Somchai Admin', email: 'admin@icetruck.com', role: 'admin', status: 'active', lastLogin: '2024-06-15T08:00:00Z', createdAt: '2023-01-01T00:00:00Z', phone: '+66 81 234 5678' },
  { id: '2', name: 'Prasert Manager', email: 'prasert@icetruck.com', role: 'fleet-manager', status: 'active', lastLogin: '2024-06-14T12:30:00Z', createdAt: '2023-03-15T00:00:00Z' },
  { id: '3', name: 'Nattapong Ops', email: 'nattapong@icetruck.com', role: 'operator', status: 'active', lastLogin: '2024-06-15T06:00:00Z', createdAt: '2023-06-01T00:00:00Z' },
  { id: '4', name: 'Kittisak View', email: 'kittisak@icetruck.com', role: 'viewer', status: 'active', lastLogin: '2024-06-13T15:00:00Z', createdAt: '2024-01-10T00:00:00Z' },
  { id: '5', name: 'Wichai Driver', email: 'wichai@icetruck.com', role: 'operator', status: 'suspended', lastLogin: '2024-05-20T09:00:00Z', createdAt: '2023-09-05T00:00:00Z' },
  { id: '6', name: 'Anong Analyst', email: 'anong@icetruck.com', role: 'fleet-manager', status: 'active', lastLogin: '2024-06-15T07:30:00Z', createdAt: '2023-11-20T00:00:00Z' },
];

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, 'users:edit');
  const canDelete = hasPermission(user?.role, 'users:delete');

  const [users] = useState<AdminUser[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    for (const u of users) counts[u.role] = (counts[u.role] || 0) + 1;
    return counts;
  }, [users]);

  return (
    <AppSidebar>
      <div className='p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold flex items-center gap-2'>
              <Shield className='w-7 h-7 text-primary' />
              User Administration
            </h1>
            <p className='text-muted-foreground text-sm mt-1'>
              Manage users, roles, and access permissions
            </p>
          </div>
          {canEdit && (
            <button className='px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors'>
              <Plus className='w-4 h-4' />
              <span>Add User</span>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {[
            {
              label: 'Total Users',
              value: users.length,
              icon: Users,
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-950/30',
            },
            {
              label: 'Active',
              value: users.filter(u => u.status === 'active').length,
              icon: UserCheck,
              color: 'text-green-500',
              bg: 'bg-green-50 dark:bg-green-950/30',
            },
            {
              label: 'Suspended',
              value: users.filter(u => u.status === 'suspended').length,
              icon: UserX,
              color: 'text-red-500',
              bg: 'bg-red-50 dark:bg-red-950/30',
            },
            {
              label: 'Admins',
              value: users.filter(u => u.role === 'admin').length,
              icon: Shield,
              color: 'text-purple-500',
              bg: 'bg-purple-50 dark:bg-purple-950/30',
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className='bg-card rounded-xl border border-border p-4'
            >
              <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    card.bg
                  )}
                >
                  <card.icon className={cn('w-5 h-5', card.color)} />
                </div>
                <div>
                  <p className='text-2xl font-bold'>{card.value}</p>
                  <p className='text-xs text-muted-foreground'>{card.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <input
              type='text'
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search users...'
              className='w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className='px-3 py-2.5 rounded-lg border border-input bg-background text-sm'
            aria-label='Filter by role'
          >
            <option value='all'>All Roles ({roleCounts.all})</option>
            <option value='admin'>Admin ({roleCounts.admin || 0})</option>
            <option value='fleet-manager'>
              Fleet Manager ({roleCounts['fleet-manager'] || 0})
            </option>
            <option value='operator'>
              Operator ({roleCounts.operator || 0})
            </option>
            <option value='viewer'>Viewer ({roleCounts.viewer || 0})</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='px-3 py-2.5 rounded-lg border border-input bg-background text-sm'
            aria-label='Filter by status'
          >
            <option value='all'>All Statuses</option>
            <option value='active'>Active</option>
            <option value='suspended'>Suspended</option>
          </select>
        </div>

        {/* User Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
          {filtered.map((u, i) => {
            const rc = roleColors[u.role]
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className='bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow'
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold'>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className='font-medium'>{u.name}</p>
                      <p className='text-xs text-muted-foreground'>{u.email}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      u.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    )}
                  >
                    {u.status}
                  </span>
                </div>

                <div className='space-y-2 mb-4'>
                  <div className='flex items-center gap-2'>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        rc.bg,
                        rc.text
                      )}
                    >
                      {u.role}
                    </span>
                  </div>
                  {u.phone && (
                    <p className='text-xs text-muted-foreground flex items-center gap-1'>
                      <Phone className='w-3 h-3' /> {u.phone}
                    </p>
                  )}
                  <p className='text-xs text-muted-foreground flex items-center gap-1'>
                    <Calendar className='w-3 h-3' /> Joined{' '}
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                  <p className='text-xs text-muted-foreground flex items-center gap-1'>
                    <Activity className='w-3 h-3' /> Last login:{' '}
                    {new Date(u.lastLogin).toLocaleDateString()}
                  </p>
                </div>

                <div className='flex items-center gap-2 pt-3 border-t border-border'>
                  {canEdit && (
                    <button className='flex-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted flex items-center justify-center gap-1 transition-colors'>
                      <Edit className='w-3 h-3' /> Edit
                    </button>
                  )}
                  {canDelete && u.role !== 'admin' && (
                    <button
                      className='px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-destructive hover:bg-destructive/10 flex items-center gap-1 transition-colors'
                      aria-label='Delete user'
                    >
                      <Trash2 className='w-3 h-3' />
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className='text-center py-12 text-muted-foreground'>
            <Users className='w-12 h-12 mx-auto mb-3 opacity-30' />
            <p>No users matching your filters</p>
          </div>
        )}
      </div>
    </AppSidebar>
  )
}
