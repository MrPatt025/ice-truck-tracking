import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, helperText, leftIcon, rightIcon, id, ...props },
  ref,
) {
  const reactId = useId();
  const safeId = (id ?? `input-${reactId}`).replace(/[:]/g, '');
  const describedBy = error
    ? `${safeId}-error`
    : helperText
      ? `${safeId}-helper`
      : undefined;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={safeId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={safeId}
          className={cn(
            'block w-full rounded-md border bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm',
            'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
            'dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder-slate-500',
            error &&
              'border-rose-300 focus:ring-rose-500 focus:border-rose-500 dark:border-rose-500',
            leftIcon ? 'pl-10' : undefined,
            rightIcon ? 'pr-10' : undefined,
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          aria-errormessage={error ? `${safeId}-error` : undefined}
          {...props}
        />

        {rightIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            {rightIcon}
          </span>
        )}
      </div>

      {error ? (
        <p
          id={`${safeId}-error`}
          className="text-sm text-rose-600"
          role="alert"
        >
          {error}
        </p>
      ) : helperText ? (
        <p id={`${safeId}-helper`} className="text-sm text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
