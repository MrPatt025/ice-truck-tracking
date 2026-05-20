import type { Metadata } from 'next'

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
  return children
}
