'use client'

import React, { useState, useEffect, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { Truck } from 'lucide-react'
import { DashboardToolbar } from './DashboardToolbar'

const EASE_CINEMATIC_INTRO: [number, number, number, number] = [
  0.2, 0.88, 0.25, 1,
]

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PwaInstallPromptState = Readonly<{
  canInstallApp: boolean
  installingApp: boolean
  installApp: () => Promise<void>
}>

const usePwaInstallPrompt = (mounted: boolean): PwaInstallPromptState => {
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installingApp, setInstallingApp] = useState(false)

  useEffect(() => {
    if (!mounted || globalThis.window === undefined) return

    const mediaQuery = globalThis.window.matchMedia(
      '(display-mode: standalone)'
    )
    const updateStandaloneState = () => {
      const navigatorStandalone =
        Reflect.get(globalThis.navigator, 'standalone') === true
      setIsStandalone(mediaQuery.matches || navigatorStandalone)
    }

    const isBeforeInstallPromptEvent = (
      event: Event
    ): event is BeforeInstallPromptEvent =>
      typeof (event as BeforeInstallPromptEvent).prompt === 'function' &&
      'userChoice' in event

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      if (isBeforeInstallPromptEvent(event)) {
        setDeferredInstallPrompt(event)
      }
    }

    updateStandaloneState()
    globalThis.window.addEventListener(
      'beforeinstallprompt',
      onBeforeInstallPrompt
    )
    mediaQuery.addEventListener('change', updateStandaloneState)

    return () => {
      globalThis.window.removeEventListener(
        'beforeinstallprompt',
        onBeforeInstallPrompt
      )
      mediaQuery.removeEventListener('change', updateStandaloneState)
    }
  }, [mounted])

  const installApp = useCallback(async () => {
    if (deferredInstallPrompt === null || installingApp) return

    try {
      setInstallingApp(true)
      await deferredInstallPrompt.prompt()
      const choice = await deferredInstallPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setDeferredInstallPrompt(null)
      }
    } finally {
      setInstallingApp(false)
    }
  }, [deferredInstallPrompt, installingApp])

  return {
    canInstallApp: mounted && deferredInstallPrompt !== null && isStandalone === false,
    installingApp,
    installApp,
  }
}

type DashboardHeaderProps = Readonly<{
  apiHealthy: boolean | null
  downloadReport: () => void
  togglePerf: () => void
}>

const DashboardHeader = memo(function DashboardHeader({
  apiHealthy,
  downloadReport,
  togglePerf,
}: DashboardHeaderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { canInstallApp, installingApp, installApp } =
    usePwaInstallPrompt(mounted)

  return (
    <header
      suppressHydrationWarning
      className='apple-surface relative z-50 sticky top-0 [background-image:linear-gradient(110deg,rgba(34,211,238,0.08),rgba(255,255,255,0.02)_42%,rgba(99,102,241,0.08))]'
    >
      <div className='mx-auto max-w-[120rem] px-4 sm:px-6'>
        <div className='flex items-center justify-between py-4'>
          {/* Logo + Title */}
          <div className='flex items-center gap-3 sm:gap-4'>
            <motion.div layoutId='brand-mark' className='relative'>
              <div className='absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/60 to-cyan-500/60 blur-lg animate-pulse-slow' />
              <div className='relative flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg'>
                <Truck className='h-6 w-6 text-white' />
              </div>
            </motion.div>
            <div>
              <motion.h1
                data-display-font='true'
                className='text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-100 to-slate-400'
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: EASE_CINEMATIC_INTRO,
                }}
              >
                Cryogenic Mission Console
              </motion.h1>
              <motion.p
                className='mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-xs'
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Fleet Sentinel Grid • IoT Engine v4.0
              </motion.p>
            </div>
          </div>

          {/* Toolbar & Controls composed here */}
          <DashboardToolbar
            apiHealthy={apiHealthy}
            canInstallApp={canInstallApp}
            installingApp={installingApp}
            installApp={installApp}
            downloadReport={downloadReport}
            togglePerf={togglePerf}
          />
        </div>
      </div>
    </header>
  )
})

export default DashboardHeader
