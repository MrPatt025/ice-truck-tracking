'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, FileBadge2, Siren, ClipboardCheck } from 'lucide-react'
import AppSidebar from '@/components/AppSidebar'
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'

const CONTROL_ROWS = [
  {
    name: 'Cold-chain SLA',
    owner: 'Ops Team',
    state: 'Compliant',
    score: '99.2%',
  },
  {
    name: 'Driver Certification',
    owner: 'HR / Fleet',
    state: 'Review',
    score: '94.8%',
  },
  {
    name: 'Incident Closure',
    owner: 'NOC',
    state: 'Compliant',
    score: '97.6%',
  },
  {
    name: 'Data Retention',
    owner: 'Security',
    state: 'Compliant',
    score: '100%',
  },
]

export default function CompliancePage() {
  return (
    <AppSidebar>
      <PremiumPageWrapper
        mode='glass'
        denseNoise
        contentClassName='border-white/25 bg-slate-950/42 shadow-[0_36px_130px_-68px_rgba(244,114,182,0.85)]'
      >
        <main className='mx-auto max-w-[1500px] space-y-6 p-4 lg:p-6'>
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42 }}
            className='rounded-2xl border border-white/20 bg-slate-900/45 p-6 backdrop-blur-2xl'
          >
            <h1 className='flex items-center gap-3 text-2xl font-semibold text-slate-50'>
              <ShieldCheck className='h-7 w-7 text-pink-300' />
              Compliance Command
            </h1>
            <p className='mt-2 text-sm leading-6 text-slate-300'>
              Audit-ready control center for policy adherence, incident
              accountability, and verified cold-chain governance KPIs.
            </p>
          </motion.header>

          <section className='grid gap-4 md:grid-cols-3'>
            <article className='rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-2xl'>
              <h2 className='flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-slate-300'>
                <FileBadge2 className='h-4 w-4 text-pink-300' /> Open Findings
              </h2>
              <p className='mt-3 text-3xl font-semibold tabular-nums text-slate-100'>
                7
              </p>
            </article>
            <article className='rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-2xl'>
              <h2 className='flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-slate-300'>
                <Siren className='h-4 w-4 text-rose-300' /> Escalations
              </h2>
              <p className='mt-3 text-3xl font-semibold tabular-nums text-slate-100'>
                2
              </p>
            </article>
            <article className='rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-2xl'>
              <h2 className='flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-slate-300'>
                <ClipboardCheck className='h-4 w-4 text-fuchsia-300' /> Policy
                Coverage
              </h2>
              <p className='mt-3 text-3xl font-semibold tabular-nums text-slate-100'>
                98.7%
              </p>
            </article>
          </section>

          <section className='overflow-hidden rounded-2xl border border-white/20 bg-slate-900/45 backdrop-blur-2xl'>
            <table className='w-full table-fixed'>
              <thead>
                <tr className='border-b border-white/10 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>
                  <th className='px-4 py-3'>Control</th>
                  <th className='px-4 py-3'>Owner</th>
                  <th className='px-4 py-3'>State</th>
                  <th className='px-4 py-3'>Score</th>
                </tr>
              </thead>
              <tbody>
                {CONTROL_ROWS.map(row => (
                  <tr
                    key={row.name}
                    className='border-b border-white/10 text-sm text-slate-200'
                  >
                    <td className='px-4 py-3'>{row.name}</td>
                    <td className='px-4 py-3'>{row.owner}</td>
                    <td className='px-4 py-3'>{row.state}</td>
                    <td className='px-4 py-3 tabular-nums'>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </PremiumPageWrapper>
    </AppSidebar>
  )
}
