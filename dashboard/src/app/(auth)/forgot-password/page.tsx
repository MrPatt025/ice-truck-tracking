'use client'

import React, { useCallback, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Loader2, Mail, Snowflake } from 'lucide-react'
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'
import { useAuthStore } from '@/stores/authStore'

// ScrollytellingCanvas is mounted globally at ClientSharedCanvasHost

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const forgotPassword = useAuthStore(s => s.forgotPassword)
  const isLoading = useAuthStore(s => s.isLoading)
  const error = useAuthStore(s => s.error)
  const clearError = useAuthStore(s => s.clearError)

  const handleSubmit = useCallback(
    (event: React.SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      clearError()

      const trimmedEmail = email.trim()
      if (!trimmedEmail) return

      void (async () => {
        const success = await forgotPassword(trimmedEmail)
        if (success) {
          setSent(true)
        }
      })()
    },
    [clearError, email, forgotPassword]
  )

  return (
    <PremiumPageWrapper
      mode='glass'
      denseNoise
      testId='auth-page-wrapper'
      contentClassName='mx-auto w-full max-w-[34rem]'
    >
      <div className='relative z-10'>
        <div className='mb-8 text-center'>
          <div className='mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10'>
            <Snowflake className='h-7 w-7 text-primary' />
          </div>
          <h1 className='text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-100 to-slate-400'>
            {sent ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className='mt-1 text-muted-foreground'>
            {sent
              ? 'We sent a password reset link to your email'
              : 'Enter your email and we will send you a reset link'}
          </p>
        </div>

        <div className='rounded-xl border border-border bg-card p-6 shadow-lg'>
          {sent ? (
            <div className='space-y-4 text-center'>
              <div className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20'>
                <Mail className='h-8 w-8 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>
                  We sent a reset link to{' '}
                  <span className='font-medium text-foreground'>{email}</span>
                </p>
                <p className='mt-2 text-xs text-muted-foreground'>
                  Check your spam folder if you do not see it within a few
                  minutes.
                </p>
              </div>
              <button
                onClick={() => {
                  setSent(false)
                  setEmail('')
                  clearError()
                }}
                className='text-sm font-medium text-primary transition-colors hover:text-primary/80'
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form className='space-y-4' onSubmit={handleSubmit}>
              {error ? (
                <div
                  aria-live='polite'
                  className='flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive'
                  role='alert'
                >
                  <AlertCircle className='h-4 w-4 shrink-0' />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className='space-y-2'>
                <label htmlFor='forgot-email' className='text-sm font-medium'>
                  Email address
                </label>
                <input
                  id='forgot-email'
                  type='email'
                  autoComplete='email'
                  required
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value)
                    clearError()
                  }}
                  placeholder='you@company.com'
                  className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50'
                />
              </div>

              <button
                type='submit'
                disabled={isLoading || !email.trim()}
                className='flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          )}

          <div className='mt-6 text-center'>
            <Link
              href='/login'
              className='inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground'
            >
              <ArrowLeft className='h-3 w-3' />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </PremiumPageWrapper>
  )
}
