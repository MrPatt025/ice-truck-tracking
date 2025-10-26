import { forwardRef } from 'react';
import type { HTMLAttributes, ComponentPropsWithoutRef } from 'react';

import { cn } from '../utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'default', padding = 'md', children, ...props },
  ref,
) {
  const variants: Record<NonNullable<CardProps['variant']>, string> = {
    default:
      'bg-white text-slate-900 border border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800',
    elevated:
      'bg-white text-slate-900 shadow-lg dark:bg-slate-900 dark:text-slate-100',
    outlined:
      'bg-transparent text-slate-900 border-2 border-slate-300 dark:text-slate-100 dark:border-slate-700',
  };

  const paddings: Record<NonNullable<CardProps['padding']>, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl ring-1 ring-black/5 dark:ring-white/5',
        variants[variant],
        paddings[padding],
        className,
      )}
      data-variant={variant}
      data-padding={padding}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5 pb-4', className)}
        {...props}
      />
    );
  },
);
CardHeader.displayName = 'CardHeader';

type CardTitleProps = ComponentPropsWithoutRef<'h3'>;
const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-base font-semibold leading-none tracking-tight',
          className,
        )}
        {...props}
      />
    );
  },
);
CardTitle.displayName = 'CardTitle';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('pt-2', className)} {...props} />;
  },
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
