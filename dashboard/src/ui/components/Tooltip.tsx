'use client'

import { memo, useState, useRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

/**
 * Tooltip — Memoized to prevent re-renders from parent prop changes.
 * Only re-renders when content, position, or delay props change.
 */
export const Tooltip = memo(function Tooltip({
  content,
  children,
  position = 'top',
  delay = 500,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipId = useId()

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
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isVisible) {
        hideTooltip()
      } else {
        showTooltip()
      }
    }
    if (e.key === 'Escape') {
      hideTooltip()
    }
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
      <button
        type='button'
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onTouchStart={showTooltip}
        onTouchEnd={hideTooltip}
        onKeyDown={handleTriggerKeyDown}
        className='inline-block border-0 bg-transparent p-0 text-inherit'
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </button>

      {isVisible &&
        createPortal(
          <div
            id={tooltipId}
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
})

Tooltip.displayName = 'Tooltip'


