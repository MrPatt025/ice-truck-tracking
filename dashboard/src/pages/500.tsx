import Link from 'next/link'
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'

export default function Custom500Page() {
  return (
    <PremiumPageWrapper mode='glass' className='w-full' denseNoise>
      <main className='relative min-h-screen overflow-hidden px-6 py-20 text-slate-100'>
        <div className='pointer-events-none absolute inset-0 opacity-35'>
          <div className='absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl' />
          <div className='absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl' />
        </div>
        <div className='relative mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-8 py-16 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl'>
          <div className='space-y-5'>
            <p className='font-display text-sm uppercase tracking-[0.4em] text-cyan-300/80'>
              System Fault
            </p>
            <h1 className='font-display text-5xl font-semibold tracking-tight text-white md:text-6xl'>
              500
            </h1>
            <p className='mx-auto max-w-xl text-base leading-7 text-slate-300 md:text-lg'>
              The dashboard hit an unexpected server error. Please retry the
              request or return to the main experience.
            </p>
            <div className='flex items-center justify-center pt-2'>
              <Link
                href='/'
                className='inline-flex h-10 items-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-400/20'
              >
                Back to landing
              </Link>
            </div>
          </div>
        </div>
      </main>
    </PremiumPageWrapper>
  )
}
