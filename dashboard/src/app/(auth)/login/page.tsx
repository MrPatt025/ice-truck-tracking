'use client';

import React, { useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Snowflake, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useTransitionStore } from '@/stores/transitionStore'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD

  const login = useAuthStore(s => s.login)
  const isLoading = useAuthStore(s => s.isLoading)
  const error = useAuthStore(s => s.error)
  const clearError = useAuthStore(s => s.clearError)
  const isTransitioning = useTransitionStore(s => s.isTransitioning)
  const startTransition = useTransitionStore(s => s.startTransition)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      clearError()

      if (!email.trim() || !password.trim()) return

      const success = await login(email.trim(), password)
      if (success) {
        startTransition()
        globalThis.setTimeout(() => {
          router.push(redirect)
        }, 820)
      }
    },
    [email, password, login, clearError, router, redirect, startTransition]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 1 }}
      animate={
        isTransitioning
          ? { opacity: 0, y: -14, scale: 0.82 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{
        duration: isTransitioning ? 0.82 : 0.4,
        ease: [0.76, 0, 0.24, 1],
      }}
      style={{ willChange: 'opacity, transform' }}
    >
      {/* Logo */}
      <div className='text-center mb-8'>
        <motion.div
          layoutId='brand-mark'
          className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4'
        >
          <Snowflake className='w-7 h-7 text-primary' />
        </motion.div>
        <h1 className='text-2xl font-bold'>Welcome back</h1>
        <p className='text-muted-foreground mt-1'>
          Sign in to your Ice Truck account
        </p>
      </div>

      {/* Form */}
      <div className='bg-card rounded-xl border border-border p-6 shadow-lg'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className='flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm'
              role='alert'
            >
              <AlertCircle className='w-4 h-4 shrink-0' />
              <span>{error}</span>
            </motion.div>
          )}

          <div className='space-y-2'>
            <label htmlFor='email' className='text-sm font-medium'>
              Email address
            </label>
            <input
              id='email'
              type='email'
              autoComplete='email'
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='you@company.com'
              className='w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors'
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <label htmlFor='password' className='text-sm font-medium'>
                Password
              </label>
              <Link
                href='/forgot-password'
                className='text-xs text-primary hover:text-primary/80 transition-colors'
              >
                Forgot password?
              </Link>
            </div>
            <div className='relative'>
              <input
                id='password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='••••••••'
                className='w-full px-3 py-2.5 pr-10 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors'
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
              </button>
            </div>
          </div>

          <button
            type='submit'
            disabled={isLoading || !email.trim() || !password.trim()}
            className='w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className='mt-6 text-center'>
          <p className='text-sm text-muted-foreground'>
            Don&apos;t have an account?{' '}
            <Link
              href='/register'
              className='text-primary hover:text-primary/80 font-medium transition-colors'
            >
              Create account
            </Link>
          </p>
        </div>
      </div>

      {/* Demo credentials hint */}
      {demoEmail && demoPassword ? (
        <div className='mt-4 p-3 rounded-lg bg-muted/50 border border-border'>
          <p className='text-xs text-muted-foreground text-center'>
            Demo: <span className='font-mono'>{demoEmail}</span> /{' '}
            <span className='font-mono'>{demoPassword}</span>
          </p>
        </div>
      ) : null}
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[200px]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
