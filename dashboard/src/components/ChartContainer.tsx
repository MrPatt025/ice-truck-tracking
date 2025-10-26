'use client';

import type { JSX } from 'react';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

type Size = { width: number; height: number };
type RenderProp = (size: Size) => ReactNode;

type ChartContainerProps = PropsWithChildren<{
  /** ความสูงขั้นต่ำของคอนเทนเนอร์ เพื่อให้กราฟมีพื้นที่คำนวนขนาด (เช่น 256 หรือ '20rem') */
  minHeight?: number | string;
  /** เติมคลาสเสริมได้ตามต้องการ */
  className?: string;
  /** สไตล์เพิ่มเติม (จะถูก merge เข้าไปพร้อม minHeight) */
  style?: CSSProperties;
  /** เกณฑ์ความกว้าง/สูงขั้นต่ำเพื่อถือว่า "พร้อมเรนเดอร์" (px) */
  readyThreshold?: number;
  /** รองรับ children เป็น render-prop เพื่อรับขนาดวัดจริง */
  children?: ReactNode | RenderProp;
}>;

/**
 * รอให้มีขนาดจริง (width/height > threshold) ก่อนเรนเดอร์ children
 * - ปลอดภัยกับ SSR (useEffect จึงไม่ยุ่งตอน SSR)
 * - ใช้ ResizeObserver ถ้ามี, fallback เป็น window.resize
 * - ลด re-render ด้วยการเช็คเปลี่ยนแปลงมากกว่า 0.5px
 * - คืนขนาดจริงให้ children ได้แบบ render-prop
 */
export default function ChartContainer({
  children,
  className,
  style,
  minHeight = 256,
  readyThreshold = 8,
}: ChartContainerProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;

    const commit = (width: number, height: number) => {
      // ลด re-render: อัพเดตเมื่อต่างเกิน 0.5px
      setSize((prev) => {
        if (
          Math.abs(prev.width - width) < 0.5 &&
          Math.abs(prev.height - height) < 0.5
        ) {
          return prev;
        }
        return { width, height };
      });
    };

    const measureNow = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // ใช้ clientWidth/Height เพื่อลดผล border/scrollbar
        const w = el.clientWidth;
        const h = el.clientHeight;
        commit(w, h);
      });
    };

    let cleanup: () => void = () => {};
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => commit(width, height));
      });
      ro.observe(el);
      cleanup = () => ro.disconnect();
    } else {
      measureNow();
      window.addEventListener('resize', measureNow, { passive: true });
      cleanup = () => window.removeEventListener('resize', measureNow);
    }

    // วัดครั้งแรกหลัง mount
    measureNow();

    return () => {
      cleanup();
      cancelAnimationFrame(raf);
    };
  }, []);

  const ready =
    mounted && size.width > readyThreshold && size.height > readyThreshold;

  const mergedStyle: CSSProperties = {
    minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
    ...style,
  };

  return (
    <div
      ref={ref}
      data-chart-container="1"
      data-ready={ready ? '1' : '0'}
      aria-busy={!ready}
      className={twMerge(
        // สำคัญ: ให้คอนเทนเนอร์ยืดเต็ม, ไม่โดนบีบใน flex/grid
        'relative w-full h-full min-w-0 overflow-hidden',
        clsx(className),
      )}
      style={mergedStyle}
    >
      {ready ? (
        typeof children === 'function' ? (
          (children as RenderProp)(size)
        ) : (
          children
        )
      ) : (
        // skeleton เบา ๆ ระหว่างรอขนาดที่ใช้ได้
        <div
          className="absolute inset-0 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 animate-pulse"
          role="progressbar"
          aria-label="Loading chart layout"
          aria-valuetext="Loading chart layout"
        />
      )}
    </div>
  );
}
