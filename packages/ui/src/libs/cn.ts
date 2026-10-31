import { type ClassValue, clsx } from 'clsx'

/**
 * Joins class names. A `class` passed to a component is added to the component's own, never a
 * replacement for it (ADR 0025): it places the component (`mt-4`, `mx-auto`), it does not restyle it.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
