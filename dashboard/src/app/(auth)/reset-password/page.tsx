'use client';

import React, { useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Snowflake, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    if (!token) {
      setValidationError('Invalid reset token. Please request a new reset link.');
      return;
    }

    const ok = await resetPassword(token, password);
    if (ok) {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    }
  }, [password, confirmPassword, token, resetPassword, clearError, router]);

  const displayError = validationError || error;

  return (
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
          {success ? 'Password reset!' : 'Set new password'}
        </h1>
        <p className='text-muted-foreground mt-1'>
          {success
            ? 'Redirecting you to sign in...'
            : 'Enter your new password below'}
        </p>
      </div>

      {/* Form / Success */}
      <div className='bg-card rounded-xl border border-border p-6 shadow-lg'>
        {success ? (
          <div className='text-center space-y-4'>
            <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20'>
              <CheckCircle className='w-8 h-8 text-green-600 dark:text-green-400' />
            </div>
            <p className='text-sm text-muted-foreground'>
              Your password has been reset successfully. Redirecting...
            </p>
            <Link
              href='/login'
              className='inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors'
            >
              Sign in now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-4'>
            {displayError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className='flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm'
                role='alert'
              >
                <AlertCircle className='w-4 h-4 shrink-0' />
                <span>{displayError}</span>
              </motion.div>
            )}

            <div className='space-y-2'>
              <label htmlFor='new-password' className='text-sm font-medium'>
                New password
              </label>
              <div className='relative'>
                <input
                  id='new-password'
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='new-password'
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    setValidationError('')
                  }}
                  placeholder='Min. 8 characters'
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

            <div className='space-y-2'>
              <label
                htmlFor='confirm-new-password'
                className='text-sm font-medium'
              >
                Confirm new password
              </label>
              <div className='relative'>
                <input
                  id='confirm-new-password'
                  type='password'
                  autoComplete='new-password'
                  required
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value)
                    setValidationError('')
                  }}
                  placeholder='Repeat new password'
                  className='w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors'
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500' />
                )}
              </div>
            </div>

            <button
              type='submit'
              disabled={isLoading || !password || !confirmPassword}
              className='w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
            >
              {isLoading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Resetting...
                </>
              ) : (
                'Reset password'
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
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[200px]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
