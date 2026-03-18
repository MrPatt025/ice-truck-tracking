'use client'

import React from 'react'
import { LayoutGroup } from 'framer-motion'

export default function TransitionLayoutGroup({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <LayoutGroup id='ui-shared-transition'>{children}</LayoutGroup>
}
