import type { Metadata } from 'next'
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'

export const metadata: Metadata = {
  title: 'Sign In | Ice Truck Tracking',
  description:
    'Sign in to your Ice Truck Tracking account to monitor your fleet in real-time.',
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <PremiumPageWrapper mode="glass" className='min-h-screen flex items-center justify-center p-4' contentClassName='w-full max-w-md'>
      {children}
    </PremiumPageWrapper>
  )
}
