// dashboard/src/app/layout.tsx
import './globals.css';
// Load MapLibre CSS locally via bundler to avoid CORB and external CDN issues
// maplibre-gl CSS removed after consolidating to TomTom map stack
import type { Metadata, Viewport } from 'next';
import type { JSX, ReactNode } from 'react';
import { Inter } from 'next/font/google';
import Providers from './providers';
import { AuthProvider } from '@/shared/auth/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
  applicationName:
    'Apollo ColdChain | Real-time Telemetry & Predictive Analytics Console',
  title:
    'Apollo ColdChain | Real-time Telemetry & Predictive Analytics Console',
  description:
    'Enterprise-grade IoT platform for ice truck tracking and advanced cold chain logistics monitoring. Utilizing Socket.IO for sub-second telemetry updates.',
  keywords: [
    'IoT',
    'Telematics',
    'Cold Chain',
    'Logistics',
    'Real-time Tracking',
    'Predictive Analytics',
    'TomTom',
    'Maplibre',
  ],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f17' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        {/* Client providers (React Query, Theme, ErrorBoundary) */}
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
