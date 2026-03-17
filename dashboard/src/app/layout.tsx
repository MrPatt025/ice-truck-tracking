import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import SharedCanvasHost from '@/components/SharedCanvasHost'

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
      <body className={inter.className}>
        <ThemeProvider>
          <SharedCanvasHost />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}


