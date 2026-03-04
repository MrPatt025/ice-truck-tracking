'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Search, Plus, Trash2, Edit,
  Clock, Truck, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { severityColors } from '@/lib/tokens';
import AppSidebar from '@/components/AppSidebar';
import { useAuthStore, hasPermission } from '@/stores/authStore';

// ── Types ──────────────────────────────────────────────────
interface Alert {
  id: string;
  truckId: string;
  truckName: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  thresholdMax?: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
}

// ── Mock Data ──────────────────────────────────────────────
const mockAlerts: Alert[] = Array.from({ length: 20 }, (_, i) => {
  const types = [
    'Temperature High',
    'Low Fuel',
    'Speed Violation',
    'Door Open',
    'Battery Low',
    'Geo-fence Exit',
  ]
  const severities: Alert['severity'][] = ['critical', 'warning', 'info']
  const statuses: Alert['status'][] = ['active', 'acknowledged', 'resolved']
  return {
    id: `alert-${i + 1}`,
    truckId: `truck-${String((i % 10) + 1).padStart(3, '0')}`,
    truckName: `ICE-${String((i % 10) + 1).padStart(3, '0')}`,
    type: types[i % types.length],
    severity: severities[i % 3],
    message: `${types[i % types.length]} detected on ICE-${String((i % 10) + 1).padStart(3, '0')}`,
    status: statuses[i % 3],
    createdAt: new Date(Date.now() - i * 600000).toISOString(),
    acknowledgedAt:
      statuses[i % 3] === 'active'
        ? undefined
        : new Date(Date.now() - i * 300000).toISOString(),
  }
})

const mockRules: AlertRule[] = [
  {
    id: 'rule-1',
    name: 'High Temperature',
    metric: 'temperature',
    condition: 'gt',
    threshold: -10,
    severity: 'critical',
    enabled: true,
    notifyEmail: true,
    notifySms: true,
  },
  {
    id: 'rule-2',
    name: 'Low Fuel Warning',
    metric: 'fuelLevel',
    condition: 'lt',
    threshold: 20,
    severity: 'warning',
    enabled: true,
    notifyEmail: true,
    notifySms: false,
  },
  {
    id: 'rule-3',
    name: 'Speed Limit',
    metric: 'speed',
    condition: 'gt',
    threshold: 90,
    severity: 'warning',
    enabled: true,
    notifyEmail: false,
    notifySms: false,
  },
  {
    id: 'rule-4',
    name: 'Battery Critical',
    metric: 'batteryLevel',
    condition: 'lt',
    threshold: 15,
    severity: 'critical',
    enabled: true,
    notifyEmail: true,
    notifySms: true,
  },
  {
    id: 'rule-5',
    name: 'Door Open Alert',
    metric: 'doorOpen',
    condition: 'eq',
    threshold: 1,
    severity: 'info',
    enabled: false,
    notifyEmail: false,
    notifySms: false,
  },
]

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className='w-4 h-4' />
    case 'warning':
      return <AlertCircle className='w-4 h-4' />
    default:
      return <Info className='w-4 h-4' />
  }
}

function resolveStatusStyle(status: string): string {
  if (status === 'active')
    return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
  if (status === 'acknowledged')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
  return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
}

export default function AlertsPage() {
  const user = useAuthStore(s => s.user)
  const canCreate = hasPermission(user?.role, 'alerts:create')
  const canDelete = hasPermission(user?.role, 'alerts:delete')

  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts')
  const [alerts] = useState<Alert[]>(mockAlerts)
  const [rules, setRules] = useState<AlertRule[]>(mockRules)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showRuleForm, setShowRuleForm] = useState(false)

  // New rule form state
  const [newRule, setNewRule] = useState({
    name: '',
    metric: 'temperature',
    condition: 'gt',
    threshold: 0,
    severity: 'warning' as AlertRule['severity'],
    notifyEmail: true,
    notifySms: false,
  })

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !a.truckName.toLowerCase().includes(q) &&
          !a.message.toLowerCase().includes(q) &&
          !a.type.toLowerCase().includes(q)
        )
          return false
      }
      if (severityFilter !== 'all' && a.severity !== severityFilter)
        return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      return true
    })
  }, [alerts, search, severityFilter, statusFilter])

  const alertCounts = useMemo(
    () => ({
      total: alerts.length,
      critical: alerts.filter(
        a => a.severity === 'critical' && a.status === 'active'
      ).length,
      warning: alerts.filter(
        a => a.severity === 'warning' && a.status === 'active'
      ).length,
      active: alerts.filter(a => a.status === 'active').length,
    }),
    [alerts]
  )

  const handleCreateRule = useCallback(() => {
    const rule: AlertRule = {
      ...newRule,
      id: `rule-${Date.now()}`,
      enabled: true,
    }
    setRules(prev => [...prev, rule])
    setShowRuleForm(false)
    setNewRule({
      name: '',
      metric: 'temperature',
      condition: 'gt',
      threshold: 0,
      severity: 'warning',
      notifyEmail: true,
      notifySms: false,
    })
  }, [newRule])

  const toggleRule = useCallback((id: string) => {
    setRules(prev =>
      prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    )
  }, [])

  return (
    <AppSidebar>
      <div className='p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold flex items-center gap-2'>
              <Bell className='w-7 h-7 text-primary' />
              Alerts & Rules
            </h1>
            <p className='text-muted-foreground text-sm mt-1'>
              {alertCounts.active} active alerts • {alertCounts.critical}{' '}
              critical
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {[
            {
              label: 'Total Alerts',
              value: alertCounts.total,
              icon: Bell,
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-950/30',
            },
            {
              label: 'Active',
              value: alertCounts.active,
              icon: AlertCircle,
              color: 'text-amber-500',
              bg: 'bg-amber-50 dark:bg-amber-950/30',
            },
            {
              label: 'Critical',
              value: alertCounts.critical,
              icon: AlertTriangle,
              color: 'text-red-500',
              bg: 'bg-red-50 dark:bg-red-950/30',
            },
            {
              label: 'Rules',
              value: rules.filter(r => r.enabled).length,
              icon: CheckCircle2,
              color: 'text-green-500',
              bg: 'bg-green-50 dark:bg-green-950/30',
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

        {/* Tabs */}
        <div className='flex items-center gap-1 border-b border-border'>
          <button
            onClick={() => setTab('alerts')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === 'alerts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Alert History
          </button>
          <button
            onClick={() => setTab('rules')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === 'rules'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Alert Rules
          </button>
        </div>

        {/* Alert History */}
        {tab === 'alerts' && (
          <div className='space-y-4'>
            {/* Filters */}
            <div className='flex flex-col sm:flex-row gap-3'>
              <div className='relative flex-1 max-w-md'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <input
                  aria-label='Search alerts'
                  type='text'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder='Search alerts...'
                  className='w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
                />
              </div>
              <select
                aria-label='Filter by severity'
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className='px-3 py-2 rounded-lg border border-input bg-background text-sm'
              >
                <option value='all'>All Severities</option>
                <option value='critical'>Critical</option>
                <option value='warning'>Warning</option>
                <option value='info'>Info</option>
              </select>
              <select
                aria-label='Filter by status'
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className='px-3 py-2 rounded-lg border border-input bg-background text-sm'
              >
                <option value='all'>All Statuses</option>
                <option value='active'>Active</option>
                <option value='acknowledged'>Acknowledged</option>
                <option value='resolved'>Resolved</option>
              </select>
            </div>

            {/* Alert List */}
            <div className='space-y-2'>
              {filteredAlerts.map(alert => {
                const style = severityColors[alert.severity]
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-l-4 bg-card border border-border',
                      style.border
                    )}
                  >
                    <div className={cn('shrink-0', style.icon)}>
                      <SeverityIcon severity={alert.severity} />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-0.5'>
                        <span className='font-medium text-sm'>
                          {alert.type}
                        </span>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-xs font-medium',
                            style.bg,
                            style.text
                          )}
                        >
                          {alert.severity}
                        </span>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-xs',
                            resolveStatusStyle(alert.status)
                          )}
                        >
                          {alert.status}
                        </span>
                      </div>
                      <p className='text-sm text-muted-foreground truncate'>
                        {alert.message}
                      </p>
                      <div className='flex items-center gap-3 mt-1 text-xs text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                          <Truck className='w-3 h-3' />
                          {alert.truckName}
                        </span>
                        <span className='flex items-center gap-1'>
                          <Clock className='w-3 h-3' />
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      {alert.status === 'active' && (
                        <button className='px-2 py-1 rounded text-xs bg-amber-500 text-white hover:bg-amber-600 transition-colors'>
                          Acknowledge
                        </button>
                      )}
                      {alert.status === 'acknowledged' && (
                        <button className='px-2 py-1 rounded text-xs bg-green-500 text-white hover:bg-green-600 transition-colors'>
                          Resolve
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
              {filteredAlerts.length === 0 && (
                <div className='text-center py-12 text-muted-foreground'>
                  <Bell className='w-12 h-12 mx-auto mb-3 opacity-30' />
                  <p>No alerts matching your filters</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alert Rules */}
        {tab === 'rules' && (
          <div className='space-y-4'>
            {canCreate && (
              <div className='flex justify-end'>
                <button
                  onClick={() => setShowRuleForm(!showRuleForm)}
                  className='px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors'
                >
                  <Plus className='w-4 h-4' />
                  New Rule
                </button>
              </div>
            )}

            {/* New Rule Form */}
            <AnimatePresence>
              {showRuleForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className='overflow-hidden'
                >
                  <div className='bg-card rounded-xl border border-border p-6 space-y-4'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-medium'>Create Alert Rule</h3>
                      <button
                        onClick={() => setShowRuleForm(false)}
                        className='text-muted-foreground hover:text-foreground'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                      <div className='space-y-1'>
                        <label
                          htmlFor='rule-name'
                          className='text-sm font-medium'
                        >
                          Rule Name
                        </label>
                        <input
                          id='rule-name'
                          type='text'
                          value={newRule.name}
                          onChange={e =>
                            setNewRule(prev => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder='e.g., High Temperature'
                          className='w-full px-3 py-2 rounded-lg border border-input bg-background text-sm'
                        />
                      </div>
                      <div className='space-y-1'>
                        <label
                          htmlFor='rule-metric'
                          className='text-sm font-medium'
                        >
                          Metric
                        </label>
                        <select
                          id='rule-metric'
                          value={newRule.metric}
                          onChange={e =>
                            setNewRule(prev => ({
                              ...prev,
                              metric: e.target.value,
                            }))
                          }
                          className='w-full px-3 py-2 rounded-lg border border-input bg-background text-sm'
                        >
                          <option value='temperature'>Temperature</option>
                          <option value='speed'>Speed</option>
                          <option value='fuelLevel'>Fuel Level</option>
                          <option value='batteryLevel'>Battery Level</option>
                          <option value='humidity'>Humidity</option>
                        </select>
                      </div>
                      <div className='space-y-1'>
                        <label htmlFor='rule-condition' className='text-sm font-medium'>Condition</label>
                        <select
                          id='rule-condition'
                          value={newRule.condition}
                          onChange={e =>
                            setNewRule(prev => ({
                              ...prev,
                              condition: e.target.value,
                            }))
                          }
                          className='w-full px-3 py-2 rounded-lg border border-input bg-background text-sm'
                        >
                          <option value='gt'>Greater than</option>
                          <option value='lt'>Less than</option>
                          <option value='gte'>Greater or equal</option>
                          <option value='lte'>Less or equal</option>
                          <option value='eq'>Equal to</option>
                        </select>
                      </div>
                      <div className='space-y-1'>
                        <label htmlFor='rule-threshold' className='text-sm font-medium'>Threshold</label>
                        <input
                          id='rule-threshold'
                          type='number'
                          value={newRule.threshold}
                          onChange={e =>
                            setNewRule(prev => ({
                              ...prev,
                              threshold: Number(e.target.value),
                            }))
                          }
                          className='w-full px-3 py-2 rounded-lg border border-input bg-background text-sm'
                        />
                      </div>
                      <div className='space-y-1'>
                        <label htmlFor='rule-severity' className='text-sm font-medium'>Severity</label>
                        <select
                          id='rule-severity'
                          value={newRule.severity}
                          onChange={e =>
                            setNewRule(prev => ({
                              ...prev,
                              severity: e.target.value as AlertRule['severity'],
                            }))
                          }
                          className='w-full px-3 py-2 rounded-lg border border-input bg-background text-sm'
                        >
                          <option value='critical'>Critical</option>
                          <option value='warning'>Warning</option>
                          <option value='info'>Info</option>
                        </select>
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <label className='flex items-center gap-2 text-sm'>
                        <input
                          type='checkbox'
                          checked={newRule.notifyEmail}
                          onChange={e =>
                            setNewRule(prev => ({
                              ...prev,
                              notifyEmail: e.target.checked,
                            }))
                          }
                          className='rounded'
                        />
                        <span>Email notification</span>
                      </label>
                      <label className='flex items-center gap-2 text-sm'>
                        <input
                          type='checkbox'
                          checked={newRule.notifySms}
                          onChange={e =>
                            setNewRule(prev => ({
                              ...prev,
                              notifySms: e.target.checked,
                            }))
                          }
                          className='rounded'
                        />
                        <span>SMS notification</span>
                      </label>
                    </div>
                    <div className='flex justify-end gap-2'>
                      <button
                        onClick={() => setShowRuleForm(false)}
                        className='px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateRule}
                        disabled={!newRule.name.trim()}
                        className='px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors'
                      >
                        Create Rule
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rules List */}
            <div className='bg-card rounded-xl border border-border overflow-hidden'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/50 border-b border-border'>
                  <tr>
                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                      Rule
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                      Condition
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                      Severity
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                      Notifications
                    </th>
                    <th className='px-4 py-3 text-center font-medium text-muted-foreground'>
                      Status
                    </th>
                    <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {rules.map(rule => {
                    const style = severityColors[rule.severity]
                    return (
                      <tr
                        key={rule.id}
                        className='hover:bg-muted/30 transition-colors'
                      >
                        <td className='px-4 py-3 font-medium'>{rule.name}</td>
                        <td className='px-4 py-3 text-muted-foreground font-mono text-xs'>
                          {rule.metric} {rule.condition} {rule.threshold}
                        </td>
                        <td className='px-4 py-3'>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              style.bg,
                              style.text
                            )}
                          >
                            {rule.severity}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-2'>
                            {rule.notifyEmail && (
                              <span className='text-xs bg-muted px-1.5 py-0.5 rounded'>
                                Email
                              </span>
                            )}
                            {rule.notifySms && (
                              <span className='text-xs bg-muted px-1.5 py-0.5 rounded'>
                                SMS
                              </span>
                            )}
                            {!rule.notifyEmail && !rule.notifySms && (
                              <span className='text-xs text-muted-foreground'>
                                None
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='px-4 py-3 text-center'>
                          <button
                            onClick={() => toggleRule(rule.id)}
                            className={cn(
                              'w-10 h-5 rounded-full relative transition-colors',
                              rule.enabled
                                ? 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                                rule.enabled ? 'left-5' : 'left-0.5'
                              )}
                            />
                          </button>
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            {canCreate && (
                              <button className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'>
                                <Edit className='w-4 h-4' />
                              </button>
                            )}
                            {canDelete && (
                              <button className='p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors'>
                                <Trash2 className='w-4 h-4' />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppSidebar>
  )
}
