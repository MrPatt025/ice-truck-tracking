'use client'

import { memo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils'
import { useFocusTrap } from '../hooks/useA11y'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  className?: string
}

/**
 * Modal — Memoized to prevent re-renders from parent prop changes.
 * Only re-renders when isOpen, title, or size actually change.
 */
export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  className,
}: ModalProps) {
  const containerRef = useFocusTrap(isOpen)

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className='fixed inset-0 z-50 p-4'>
      <button
        type='button'
        className='absolute inset-0 h-full w-full bg-black/50'
        onClick={onClose}
        aria-label='Close modal backdrop'
      />
      <dialog
        ref={containerRef as React.Ref<HTMLDialogElement>}
        open
        className={cn(
          'relative mx-auto my-auto w-full rounded-lg border-0 bg-white shadow-xl',
          sizes[size],
          className
        )}
        onCancel={e => {
          e.preventDefault()
          onClose()
        }}
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div className='flex items-center justify-between p-6 border-b'>
            <h2 id='modal-title' className='text-xl font-semibold'>
              {title}
            </h2>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded'
              aria-label='Close modal'
              data-close
            >
              <svg
                className='w-6 h-6'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
        )}
        <div className='p-6'>{children}</div>
      </dialog>
    </div>,
    document.body
  )
})

Modal.displayName = 'Modal'


