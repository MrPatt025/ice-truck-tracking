'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  animate,
  motion,
  useMotionValueEvent,
  useMotionValue,
  useScroll,
  useTransform,
} from 'framer-motion'
import {
  Truck,
  Thermometer,
  MapPin,
  Bell,
  Shield,
  BarChart3,
  Zap,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import HeroBackground from '@/components/landing/HeroBackground'
import GlassPanel from '@/components/landing/GlassPanel'
import ScrollTruckStory from '@/components/landing/ScrollTruckStory'
import { useTransitionStore } from '@/stores/transitionStore'

const EASE_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1]
const EASE_OUTRO: [number, number, number, number] = [0.68, 0, 0.12, 1]

/* ───────────────────── Animation variants ───────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.52, ease: EASE_STANDARD },
  }),
}

const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

/* ───────────────────── Feature data ─────────────────────────── */
const features = [
  {
    icon: MapPin,
    title: 'Real-Time GPS Tracking',
    description:
      'Track every truck on a live map with sub-second MQTT updates.',
    color: 'text-blue-500',
  },
  {
    icon: Thermometer,
    title: 'Temperature Monitoring',
    description:
      'TimescaleDB stores millions of temperature readings with auto-aggregation.',
    color: 'text-red-500',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    description:
      'Configurable threshold alerts pushed to dashboard & mobile in real time.',
    color: 'text-yellow-500',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description:
      'Granular RBAC: admin, manager, dispatcher, driver, viewer roles.',
    color: 'text-green-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description:
      'shadcn/ui components with WCAG 2.1 AA compliance & animated charts.',
    color: 'text-purple-500',
  },
  {
    icon: Zap,
    title: 'IoT-First Architecture',
    description:
      'Eclipse Mosquitto MQTT → Redis → PostgreSQL pipeline for low-latency.',
    color: 'text-orange-500',
  },
]

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<200ms', label: 'Telemetry Latency' },
  { value: '10M+', label: 'Data Points / Day' },
  { value: '24/7', label: 'Monitoring' },
]

/* ───────────────────── Landing Page Component ───────────────── */
export default function LandingPage() {
  const router = useRouter()
  const isTransitioning = useTransitionStore(s => s.isTransitioning)
  const phase = useTransitionStore(s => s.phase)
  const startTransition = useTransitionStore(s => s.startTransition)
  const setProgress = useTransitionStore(s => s.setProgress)
  const transitionProgress = useMotionValue(0)
  const latestScrollRef = React.useRef(0)

  const navigateToDashboard = React.useCallback(() => {
    try {
      router.push('/dashboard')
    } catch {
      globalThis.location.href = '/dashboard'
    }
  }, [router])

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.25], ['0%', '12%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.55])
  const heroScale = useTransform(scrollYProgress, [0, 0.35], [1, 0.92])
  const pageOpacity = useTransform(transitionProgress, [0, 1], [1, 0.08])
  const pageScale = useTransform(transitionProgress, [0, 1], [1, 0.94])
  const pageLift = useTransform(transitionProgress, [0, 1], ['0px', '-18px'])
  const veilOpacity = useTransform(transitionProgress, [0, 1], [0, 1])
  const veilBloomOpacity = useTransform(transitionProgress, [0, 0.65, 1], [0, 0.75, 1])
  const veilSolidOpacity = useTransform(transitionProgress, [0, 0.55, 1], [0, 0.22, 1])

  useMotionValueEvent(scrollYProgress, 'change', latest => {
    latestScrollRef.current = Math.min(1, Math.max(0, latest))
  })

  const beginDashboardTransition = React.useCallback(
    (e?: React.MouseEvent<HTMLAnchorElement>) => {
      if (e) e.preventDefault()
      if (isTransitioning) return
      router.prefetch('/dashboard')
      transitionProgress.set(0.04)
      startTransition()
      setProgress(0.04)
    },
    [isTransitioning, router, setProgress, startTransition, transitionProgress]
  )

  React.useEffect(() => {
    router.prefetch('/dashboard')
  }, [router])

  React.useEffect(() => {
    if (!isTransitioning || phase !== 'outro') {
      transitionProgress.set(0)
      return
    }

    const controls = animate(transitionProgress, 1, {
      duration: 0.84,
      ease: EASE_OUTRO,
      onUpdate: latest => {
        setProgress(latest)
      },
      onComplete: () => {
        navigateToDashboard()
      },
    })

    return () => {
      controls.stop()
    }
  }, [isTransitioning, navigateToDashboard, phase, setProgress, transitionProgress])

  return (
    <motion.div
      style={{
        opacity: pageOpacity,
        scale: pageScale,
        y: pageLift,
        willChange: 'opacity, transform',
        contain: 'layout paint style',
      }}
      className='mission-control-shell min-h-screen overflow-hidden text-white'
    >
      <div className='pointer-events-none fixed inset-0 -z-20 hud-grid-overlay opacity-45' />
      <div className='pointer-events-none fixed inset-0 -z-10 scanline-overlay opacity-40' />

      {/* ── Nav ─────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: EASE_STANDARD }}
        className='glass-panel sticky top-0 z-50 border-b border-cyan-200/20 bg-slate-950/65 backdrop-blur-2xl shadow-[0_20px_70px_-35px_rgba(34,211,238,0.5)] transform-gpu'
      >
        <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-6'>
          <div className='flex items-center gap-2'>
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              <Truck className='h-7 w-7 text-blue-400' />
            </motion.div>
            <span
              data-display-font='true'
              className='text-lg font-bold tracking-[0.14em] uppercase'
            >
              Ice Truck <span className='text-blue-400'>Tracking</span>
            </span>
          </div>

          <div className='hidden items-center gap-6 md:flex'>
            <a
              href='#features'
              className='text-sm text-slate-300 hover:text-white transition'
            >
              Features
            </a>
            <a
              href='#stats'
              className='text-sm text-slate-300 hover:text-white transition'
            >
              Performance
            </a>
            <a
              href='#tech'
              className='text-sm text-slate-300 hover:text-white transition'
            >
              Tech Stack
            </a>
            <Button size='sm' asChild>
              <a href='/dashboard' onClick={beginDashboardTransition}>
                Open Dashboard
              </a>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className='relative mx-auto flex min-h-[92vh] max-w-7xl items-center px-6 pb-16 pt-24 text-center transform-gpu'
      >
        <HeroBackground
          scrollProgress={scrollYProgress}
          transitionProgress={transitionProgress}
          transitionPhase={phase}
          isTransitioning={isTransitioning}
        />

        {/* Animated gradient orb */}
        <motion.div
          className='absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px] transform-gpu will-change-transform'
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        />

        <GlassPanel
          scrollProgress={scrollYProgress}
          parallaxRange={[0, 0.25]}
          className='mx-auto max-w-5xl px-6 py-12 sm:px-10'
        >
          <motion.div initial='hidden' animate='visible' variants={stagger}>
            <motion.div custom={0} variants={fadeUp}>
              <Badge
                variant='outline'
                className='mb-6 border-cyan-300/45 bg-cyan-400/10 px-3 py-1 text-cyan-100'
              >
                <Globe className='mr-1 h-3 w-3' /> Command Grid Online &middot;
                Live Fleet Telemetry
              </Badge>
            </motion.div>

            <motion.h1
              data-display-font='true'
              custom={1}
              variants={fadeUp}
              className='mx-auto max-w-4xl text-4xl font-extrabold uppercase leading-tight tracking-[0.08em] sm:text-5xl lg:text-6xl'
            >
              Cold-Chain Mission Control for{' '}
              <span className='bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-200 bg-clip-text text-transparent'>
                Real-Time Fleet Command
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className='mx-auto mt-6 max-w-2xl text-lg text-slate-300'
            >
              Track truck temperature, GPS, route health, and alert escalation
              through a cinematic operations layer designed for sub-second
              decision loops.
            </motion.p>

            <motion.div
              custom={2}
              variants={fadeUp}
              className='mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 text-left text-xs uppercase tracking-[0.08em] text-cyan-100/90 sm:grid-cols-4'
            >
              <div className='rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2'>
                Node Uplink Stable
              </div>
              <div className='rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2'>
                Route Integrity 99.9%
              </div>
              <div className='rounded-xl border border-blue-300/30 bg-blue-400/10 px-3 py-2'>
                Sensor Mesh Active
              </div>
              <div className='rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2'>
                Dispatch AI Assisted
              </div>
            </motion.div>

            <motion.div
              custom={3}
              variants={fadeUp}
              className='mt-10 flex flex-wrap justify-center gap-4'
            >
              <Button size='lg' asChild>
                <a href='/dashboard' onClick={beginDashboardTransition}>
                  <MapPin className='mr-2 h-4 w-4' /> Live Dashboard
                </a>
              </Button>
              <Button size='lg' variant='outline' asChild>
                <a href='/dashboard' onClick={beginDashboardTransition}>
                  Login
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </GlassPanel>
      </motion.section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section
        id='stats'
        className='border-y border-cyan-100/10 bg-slate-900/45 py-12'
      >
        <div className='mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4'>
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial='hidden'
              whileInView='visible'
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              className='text-center'
            >
              <p className='text-3xl font-bold text-blue-400'>{stat.value}</p>
              <p className='mt-1 text-sm text-slate-400'>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <ScrollTruckStory />

      {/* ── Features ────────────────────────────────────────── */}
      <section id='features' className='mx-auto max-w-7xl px-6 py-24'>
        <motion.h2
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className='text-center text-3xl font-bold sm:text-4xl'
        >
          Everything You Need for Cold-Chain IoT
        </motion.h2>

        <div className='mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              initial='hidden'
              whileInView='visible'
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
            >
              <Card className='glass-panel h-full border-cyan-100/20 bg-white/[0.06] backdrop-blur-2xl saturate-150 ring-1 ring-cyan-100/10 transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-300/55 hover:shadow-xl hover:shadow-cyan-500/20 transform-gpu'>
                <CardHeader>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  <CardTitle className='mt-2 text-lg text-white'>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className='text-slate-400'>
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ──────────────────────────────────────── */}
      <section
        id='tech'
        className='border-t border-white/10 bg-slate-900/50 px-6 py-24'
      >
        <div className='mx-auto max-w-5xl'>
          <motion.h2
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className='text-center text-3xl font-bold sm:text-4xl'
          >
            Built with Modern Open-Source Tech
          </motion.h2>

          <motion.div
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true }}
            variants={stagger}
            className='mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'
          >
            {[
              'Next.js 15',
              'React 18',
              'TypeScript',
              'Tailwind CSS',
              'shadcn/ui',
              'Framer Motion',
              'PostgreSQL',
              'TimescaleDB',
              'Redis',
              'MQTT',
              'Socket.IO',
              'Playwright',
            ].map((tech, i) => (
              <motion.div
                key={tech}
                custom={i}
                variants={fadeUp}
                className='rounded-xl border border-white/15 bg-white/[0.04] p-4 text-center text-sm font-medium text-slate-300 backdrop-blur-xl transition hover:border-blue-400/50 hover:text-white'
              >
                {tech}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className='mx-auto max-w-3xl px-6 py-24 text-center'>
        <motion.div
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2
            custom={0}
            variants={fadeUp}
            className='text-3xl font-bold sm:text-4xl'
          >
            Ready to Track?
          </motion.h2>
          <motion.p
            custom={1}
            variants={fadeUp}
            className='mt-4 text-slate-400'
          >
            Deploy in minutes with Docker Compose. 100% open-source, free tier
            compatible.
          </motion.p>
          <motion.div custom={2} variants={fadeUp} className='mt-8'>
            <Button size='lg' asChild>
              <a href='/dashboard' onClick={beginDashboardTransition}>
                <Truck className='mr-2 h-4 w-4' /> Launch Dashboard
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className='border-t border-white/10 py-8 text-center text-sm text-slate-500'>
        <p>
          &copy; {new Date().getFullYear()} Ice Truck Tracking &middot;{' '}
          <a
            href='https://github.com/PATTANAKORN025/Ice-truck-racking'
            className='text-slate-400 hover:text-white'
          >
            GitHub
          </a>
        </p>
      </footer>

      <motion.div
        aria-hidden='true'
        style={{ opacity: veilBloomOpacity }}
        className='pointer-events-none fixed inset-0 z-[60] bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,0.5),rgba(7,10,27,0.94)_58%)]'
      />
      <motion.div
        aria-hidden='true'
        style={{ opacity: veilSolidOpacity }}
        className='pointer-events-none fixed inset-0 z-[61] bg-slate-950'
      />
      <motion.div
        aria-hidden='true'
        style={{ opacity: veilOpacity }}
        className='pointer-events-none fixed inset-0 z-[62] bg-[radial-gradient(circle_at_50%_50%,rgba(125,211,252,0.18),rgba(2,6,23,0.98)_65%)]'
      />
    </motion.div>
  )
}
