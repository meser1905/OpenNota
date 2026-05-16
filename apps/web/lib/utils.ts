import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats a numeric average for display, or a dash when there is none. */
export function formatAverage(value: number, hasGrades: boolean): string {
  return hasGrades ? value.toFixed(2) : '-';
}
