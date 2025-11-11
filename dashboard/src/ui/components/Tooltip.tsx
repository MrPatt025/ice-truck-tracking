'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type JSX,
} from 'react';
import clsx from 'clsx';

type Side = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipProps {
  /** เนื้อหา tooltip */
  content: ReactNode;
  /** องค์ประกอบที่ต้องการแสดง tooltip ครอบไว้ */
  children: ReactNode;
  /** ตำแหน่ง tooltip รอบๆ trigger */
  side?: Side;
  /** หน่วงเวลาการแสดง (ms) */
  delay?: number;
  /** ปิดการทำงาน */
  disabled?: boolean;
  /** class เพิ่มเติมให้กับกล่อง tooltip */
  className?: string;
}

/**
 * Tooltip ที่คำนึงถึง A11y:
 * - ใช้ role="tooltip", aria-describedby
 * - เปิดด้วย hover/focus ปิดด้วย blur/leave/Escape
 * - ไม่มี dependency ภายนอก / ไม่มี implicit any
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 200,
  disabled = false,
  className,
}: TooltipProps): JSX.Element {
  const id = useId();
  const [open, setOpen] = useState(false);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  const clearTimers = () => {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const scheduleOpen = () => {
    if (disabled) return;
    clearTimers();
    showTimer.current = window.setTimeout(() => setOpen(true), delay);
  };

  const scheduleClose = () => {
    clearTimers();
    // ปิดทันทีให้รู้สึก responsive
    hideTimer.current = window.setTimeout(() => setOpen(false), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      (wrapperRef.current as HTMLSpanElement | null)?.blur?.();
    }
  };

  const posClass = (s: Side) => {
    switch (s) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 translate-x-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 translate-y-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 -translate-x-2';
      default:
        return '';
    }
  };

  const arrowClass = (s: Side) => {
    // ลูกศรเล็กๆ ด้วย border
    const base = 'absolute w-0 h-0 border-4';
    switch (s) {
      case 'top':
        return clsx(
          base,
          'left-1/2 -translate-x-1/2 top-full border-transparent border-t-neutral-900/90',
        );
      case 'right':
        return clsx(
          base,
          'top-1/2 -translate-y-1/2 left-0 -translate-x-full border-transparent border-r-neutral-900/90',
        );
      case 'bottom':
        return clsx(
          base,
          'left-1/2 -translate-x-1/2 bottom-full border-transparent border-b-neutral-900/90',
        );
      case 'left':
        return clsx(
          base,
          'top-1/2 -translate-y-1/2 right-0 translate-x-full border-transparent border-l-neutral-900/90',
        );
      default:
        return base;
    }
  };

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex items-center"
      role="group"
      aria-describedby={open && !disabled ? id : undefined}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={scheduleOpen}
      onBlur={scheduleClose}
      onKeyDown={onKeyDown}
    >
      {children}

      {/* Tooltip bubble */}
      {!disabled && (
        <span
          id={id}
          role="tooltip"
          className={clsx(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium',
            'bg-neutral-900/90 text-white shadow-lg backdrop-blur',
            // animation
            'transition-opacity transition-transform duration-150 ease-out',
            open ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
            posClass(side),
            className,
          )}
          aria-hidden={!open ? 'true' : 'false'}
        >
          {content}
          {/* Arrow */}
          <span className={arrowClass(side)} />
        </span>
      )}
    </span>
  );
}

export default Tooltip;
