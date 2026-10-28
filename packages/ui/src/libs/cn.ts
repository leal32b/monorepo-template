import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Joins class names; when two utilities set the same property, the later one wins, so a `class`
 * passed to a component overrides the component's own: `cn(variants(...), props.class)`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
