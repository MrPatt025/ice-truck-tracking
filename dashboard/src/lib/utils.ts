import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely — the `cn` utility used by shadcn/ui */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
