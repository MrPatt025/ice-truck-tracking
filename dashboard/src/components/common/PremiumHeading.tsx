import React from 'react'
import { cn } from '@/lib/utils'

export const cinematicHeadingClass =
  'text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-100 to-slate-400'

export default function PremiumHeading({
  text,
  className,
}: Readonly<{ text: string; className?: string }>) {
  return <h2 className={cn(cinematicHeadingClass, className)}>{text}</h2>
}
