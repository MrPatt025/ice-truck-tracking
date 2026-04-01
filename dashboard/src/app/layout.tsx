import './globals.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Orbitron, Space_Grotesk } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import TransitionLayoutGroup from '@/components/TransitionLayoutGroup'
import ClientSharedCanvasHost from '@/components/ClientSharedCanvasHost'
import { GlobalErrorBoundary } from '@/components/common/GlobalErrorBoundary'

const bodyFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

const displayFont = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'Ice Truck Tracking Dashboard',
  description: 'Real-time ice truck monitoring and analytics platform',
  manifest: '/manifest.json',
  applicationName: 'Ice Truck Tracking',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ice Truck Tracking',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: '#020617',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        {/* DNS prefetch for external critical resources */}
        <link rel='dns-prefetch' href='https://api.mapbox.com' />
        <link rel='dns-prefetch' href='https://cdn.jsdelivr.net' />
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased relative isolate`}>
        <ThemeProvider>
          <GlobalErrorBoundary>
            <div
              id='webgl-background-layer'
              className='pointer-events-none fixed inset-0 -z-10'
              aria-hidden='true'
            >
              <ClientSharedCanvasHost />
            </div>
            <div id='ui-overlay' className='relative z-10'>
              <TransitionLayoutGroup>{children}</TransitionLayoutGroup>
            </div>
          </GlobalErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}


