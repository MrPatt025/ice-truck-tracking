'use client';

import React, { useState, useCallback, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Snowflake, Loader2, AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper';
import { useAuthStore } from '@/stores/authStore';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const handleSubmit = useCallback(async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    if (!email.trim()) return;

    const success = await forgotPassword(email.trim());
    if (success) {
      setSent(true);
    }
  }, [email, forgotPassword, clearError]);

  return (
    <PremiumPageWrapper
      mode='glass'
      denseNoise
      contentClassName='mx-auto w-full max-w-[34rem] border-white/30 bg-slate-950/48 shadow-[0_40px_140px_-74px_rgba(16,185,129,0.95)]'
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4'>
            <Snowflake className='w-7 h-7 text-primary' />
          </div>
          <h1 className='text-2xl font-bold'>
            {sent ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className='text-muted-foreground mt-1'>
            {sent
              ? 'We sent a password reset link to your email'
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {/* Form / Success */}
        <div className='bg-card rounded-xl border border-border p-6 shadow-lg'>
          {sent ? (
            <div className='text-center space-y-4'>
              <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20'>
                <Mail className='w-8 h-8 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>
                  We sent a reset link to{' '}
                  <span className='font-medium text-foreground'>{email}</span>
                </p>
                <p className='text-xs text-muted-foreground mt-2'>
                  Check your spam folder if you don&apos;t see it within a few
                  minutes.
                </p>
              </div>
              <button
                onClick={() => {
                  setSent(false)
                  setEmail('')
                  clearError()
                }}
                className='text-sm text-primary hover:text-primary/80 font-medium transition-colors'
              >
                Try a different email
              </button>
            </div>
          ) : (
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
                <label htmlFor='forgot-email' className='text-sm font-medium'>
                  Email address
                </label>
                <input
                  id='forgot-email'
                  type='email'
                  autoComplete='email'
                  required
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    clearError()
                  }}
                  placeholder='you@company.com'
                  className='w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors'
                />
              </div>

              <button
                type='submit'
                disabled={isLoading || !email.trim()}
                className='w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
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
              className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
            >
              <ArrowLeft className='w-3 h-3' />
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </PremiumPageWrapper>
  )
}
