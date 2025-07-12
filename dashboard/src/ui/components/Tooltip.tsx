'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 500,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const scrollX = window.pageXOffset
        const scrollY = window.pageYOffset

        let x = rect.left + scrollX + rect.width / 2
        let y = rect.top + scrollY

        switch (position) {
          case 'top':
            y -= 8
            break
          case 'bottom':
            y += rect.height + 8
            break
          case 'left':
            x = rect.left + scrollX - 8
            y += rect.height / 2
            break
          case 'right':
            x = rect.right + scrollX + 8
            y += rect.height / 2
            break
        }

        setTooltipPosition({ x, y })
        setIsVisible(true)
      }
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const positionClasses = {
    top: 'mb-2 -translate-x-1/2',
    bottom: 'mt-2 -translate-x-1/2',
    left: 'mr-2 -translate-y-1/2',
    right: 'ml-2 -translate-y-1/2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right:
      'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className='inline-block'
      >
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            className={cn(
              'absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg pointer-events-none',
              positionClasses[position],
              className
            )}
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
            }}
            role='tooltip'
          >
            {content}
            <div
              className={cn(
                'absolute w-0 h-0 border-4',
                arrowClasses[position]
              )}
            />
          </div>,
          document.body
        )}
    </>
  )
}
