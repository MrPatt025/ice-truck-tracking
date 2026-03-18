import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import TransitionLayoutGroup from '@/components/TransitionLayoutGroup'
import ClientSharedCanvasHost from '@/components/ClientSharedCanvasHost'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={`${inter.className} relative isolate`}>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  )
}


