'use client'

import React, { memo } from 'react'
import { AlertTriangle, ServerCrash, WifiOff } from 'lucide-react'

type StatusIssueKind = 'network' | 'websocket' | 'api'

export interface StatusIssue {
  id: string
  kind: StatusIssueKind
  title: string
  detail: string
}

interface PremiumSystemStatusBannerProps {
  issues: readonly StatusIssue[]
  className?: string
}

function resolveIssueIcon(kind: StatusIssueKind): React.ReactNode {
  if (kind === 'network') return <WifiOff aria-hidden='true' className='h-4 w-4' />
  if (kind === 'api') return <ServerCrash aria-hidden='true' className='h-4 w-4' />
  return <AlertTriangle aria-hidden='true' className='h-4 w-4' />
}

function resolveIssuePalette(kind: StatusIssueKind): string {
  if (kind === 'network') {
    return 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100 shadow-[0_14px_40px_-24px_rgba(34,211,238,0.95)]'
  }

  if (kind === 'api') {
    return 'border-rose-300/40 bg-rose-500/10 text-rose-100 shadow-[0_14px_40px_-24px_rgba(244,63,94,0.95)]'
  }

  return 'border-amber-300/40 bg-amber-500/10 text-amber-100 shadow-[0_14px_40px_-24px_rgba(245,158,11,0.95)]'
}

/**
 * PremiumSystemStatusBanner — Memoized status banner for connectivity issues.
 * Displays readonly status issues without re-rendering from parent changes.
 */
const PremiumSystemStatusBanner = memo(function PremiumSystemStatusBanner({
  issues,
  className = '',
}: Readonly<PremiumSystemStatusBannerProps>) {
  if (issues.length === 0) return null

  const statusLabel = issues[0]?.title ?? 'Monitoring'

  return (
    <aside
      aria-live='polite'
      aria-atomic='true'
      role='status'
      className={`fixed right-4 top-20 z-[75] w-[min(92vw,26rem)] space-y-2 ${className}`}
      data-testid='offline-indicator'
    >
      <div className='rounded-2xl border border-white/15 bg-slate-950/55 p-3 backdrop-blur-2xl'>
        <p
          className='text-[11px] uppercase tracking-[0.12em] text-slate-200/85'
          data-testid='connection-status'
        >
          {statusLabel}
        </p>
      </div>
      {issues.map(issue => (
        <div
          key={issue.id}
          className={`rounded-2xl border p-3 backdrop-blur-2xl transition-opacity duration-300 ${resolveIssuePalette(issue.kind)}`}
        >
          <div className='flex items-start gap-2.5'>
            <span className='mt-0.5'>{resolveIssueIcon(issue.kind)}</span>
            <div>
              <p className='text-sm font-semibold'>{issue.title}</p>
              <p className='mt-1 text-xs text-current/80'>{issue.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </aside>
  )
})

PremiumSystemStatusBanner.displayName = 'PremiumSystemStatusBanner'

export default PremiumSystemStatusBanner
