'use client'

import React from 'react'
import { LayoutGroup, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function TransitionLayoutGroup({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()

  return (
    <LayoutGroup id='ui-shared-transition'>
      <AnimatePresence mode='wait' initial={false}>
        <div key={pathname} className='w-full h-full'>
          {children}
        </div>
      </AnimatePresence>
    </LayoutGroup>
  )
}
