'use client'

import type { ReactElement } from 'react'

type TooltipEntry = Readonly<{
  value?: string | number
  name?: string
  color?: string
}>

type ChartTooltipProps = Readonly<{
  active?: boolean
  label?: string | number
  payload?: TooltipEntry[]
}>

export default function ChartTooltip({
  active,
  label,
  payload,
}: ChartTooltipProps): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className='rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-[0_12px_48px_-20px_rgba(0,0,0,0.75)] backdrop-blur-2xl'>
      {label ? <div className='mb-1 font-semibold text-cyan-100'>{label}</div> : null}
      <div className='space-y-1'>
        {payload.map(entry => (
          <div key={`${entry.name ?? 'value'}-${entry.value ?? 'na'}`} className='flex items-center gap-2'>
            <span className='h-2 w-2 rounded-full bg-cyan-300' />
            <span className='text-slate-300'>{entry.name ?? 'Value'}:</span>
            <span className='font-semibold text-white'>{String(entry.value ?? '—')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}