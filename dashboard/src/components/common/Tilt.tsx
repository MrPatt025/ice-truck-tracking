'use client'

import React, { memo, useRef, useEffect } from 'react'

type TiltProps = Readonly<{
  children: React.ReactNode
  className?: string
}>

const Tilt = memo(function Tilt({ children, className = '' }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onMove = (e: MouseEvent) => {
      if (!isHovered.current) return

      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      // Target rotation values (0-10 degrees range, centered)
      const targetTiltX = (0.5 - y) * 10
      const targetTiltY = (x - 0.5) * 10

      // Apply transform with smooth easing
      el.style.transform = `perspective(1000px) rotateX(${targetTiltX}deg) rotateY(${targetTiltY}deg) translateZ(20px) scale3d(1.01, 1.01, 1.01)`
    }

    const onEnter = () => {
      if (el) {
        isHovered.current = true
        el.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.320, 1)'
      }
    }

    const onLeave = () => {
      if (el) {
        isHovered.current = false
        el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)`
      }
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`will-change-transform ${className}`}
      style={{ perspective: '1000px' }}
    >
      {children}
    </div>
  )
})

export default Tilt
