export default function Custom500Page() {
  return (
    <main className='min-h-screen bg-slate-950 px-6 py-20 text-slate-100'>
      <div className='mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-8 py-16 text-center shadow-2xl shadow-black/30 backdrop-blur-xl'>
        <div className='space-y-4'>
          <p className='font-display text-sm uppercase tracking-[0.4em] text-cyan-300/80'>
            System Fault
          </p>
          <h1 className='font-display text-5xl font-semibold tracking-tight text-white md:text-6xl'>
            500
          </h1>
          <p className='mx-auto max-w-xl text-base leading-7 text-slate-300 md:text-lg'>
            The dashboard hit an unexpected server error. Please retry the request or return to the
            main experience.
          </p>
        </div>
      </div>
    </main>
  )
}