'use client'

import React from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
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

/* ───────────────────── Animation variants ───────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
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
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.25], ['0%', '12%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.55])

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden'>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className='sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-lg'
      >
        <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-6'>
          <div className='flex items-center gap-2'>
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              <Truck className='h-7 w-7 text-blue-400' />
            </motion.div>
            <span className='text-lg font-bold tracking-tight'>
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
              <a href='/dashboard'>Open Dashboard</a>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className='relative mx-auto max-w-7xl px-6 pb-20 pt-28 text-center'
      >
        <div className='absolute inset-0 -z-20 overflow-hidden rounded-3xl'>
          <video
            className='h-full w-full object-cover opacity-35'
            autoPlay
            muted
            loop
            playsInline
            preload='metadata'
            poster='/favicon.ico'
          >
            <source src='/media/ice-fleet-loop.mp4' type='video/mp4' />
          </video>
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.22),transparent_45%),radial-gradient(circle_at_75%_80%,rgba(59,130,246,0.24),transparent_45%),linear-gradient(to_bottom,rgba(2,6,23,0.75),rgba(2,6,23,0.95))]' />
        </div>

        {/* Animated gradient orb */}
        <motion.div
          className='absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]'
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        />

        <motion.div initial='hidden' animate='visible' variants={stagger}>
          <motion.div custom={0} variants={fadeUp}>
            <Badge
              variant='outline'
              className='mb-6 border-blue-400/30 text-blue-300'
            >
              <Globe className='mr-1 h-3 w-3' /> Open Source &middot; Free Tier
              Ready
            </Badge>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className='mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl'
          >
            Cold-Chain Logistics,{' '}
            <span className='bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent'>
              Real-Time Visibility
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className='mx-auto mt-6 max-w-2xl text-lg text-slate-400'
          >
            Monitor temperature, GPS coordinates, and delivery status across
            your entire ice-truck fleet — powered by MQTT, TimescaleDB, and
            Redis for sub-second updates.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className='mt-10 flex justify-center gap-4'
          >
            <Button size='lg' asChild>
              <a href='/dashboard'>
                <MapPin className='mr-2 h-4 w-4' /> Live Dashboard
              </a>
            </Button>
            <Button size='lg' variant='outline' asChild>
              <a
                href='https://github.com/PATTANAKORN025/Ice-truck-racking'
                target='_blank'
                rel='noopener noreferrer'
              >
                GitHub Repo
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section
        id='stats'
        className='border-y border-white/10 bg-slate-900/50 py-12'
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
              <Card className='h-full border-white/10 bg-slate-800/45 backdrop-blur-xl transition hover:border-cyan-300/50 hover:shadow-xl hover:shadow-cyan-500/15'>
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
                className='rounded-lg border border-white/10 bg-slate-800/60 p-4 text-center text-sm font-medium text-slate-300 transition hover:border-blue-400/40 hover:text-white'
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
              <a href='/dashboard'>
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
    </div>
  )
}
