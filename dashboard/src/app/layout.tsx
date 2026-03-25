import './globals.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Orbitron, Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import TransitionLayoutGroup from '@/components/TransitionLayoutGroup'
import ClientSharedCanvasHost from '@/components/ClientSharedCanvasHost'
import { GlobalErrorBoundary } from '@/components/common/GlobalErrorBoundary'

const bodyFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const displayFont = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata = {
  title: ' Ice Truck Tracking Dashboard',
  description: 'Real-time ice truck monitoring and analytics platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable} relative isolate`}>
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


