// /app/layout.tsx

import './globals.css';

import { Inter } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import MapLibreBoot from '@/components/MapLibreBoot';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>

        {/* This component handles loading the MapLibre script and exposing it globally */}
        <MapLibreBoot />
      </body>
    </html>
  );
}
