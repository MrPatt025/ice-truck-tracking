import React from 'react'
import { cn } from '@/lib/utils'

export default function PremiumHeading({
  text,
  className,
}: Readonly<{ text: string; className?: string }>) {
  return (
    <h2
      className={cn(
        'text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400',
        className
      )}
    >
      {text}
    </h2>
  )
}
