import type { Hex } from './contrast'

/** The raw palette. Only the themes below use it; components and apps use roles. */
const primitives = {
  white: '#ffffff',
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'slate-950': '#020617',
  'blue-400': '#60a5fa',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'red-400': '#f87171',
  'red-700': '#b91c1c'
} as const satisfies Record<string, Hex>

type Primitive = keyof typeof primitives

/** What a colour is for. Each role is a CSS variable (`--ds-primary`) and a colour utility (`bg-primary`). */
export const roles = [
  'background',
  'foreground',
  'muted-foreground',
  'border',
  'ring',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'destructive',
  'destructive-foreground',
  'qr',
  'qr-foreground'
] as const

export type Role = (typeof roles)[number]

/** A theme names a primitive for every role, so no role can hold a colour of its own. */
const themes = {
  light: {
    background: 'white',
    foreground: 'slate-900',
    'muted-foreground': 'slate-600',
    border: 'slate-500',
    ring: 'blue-600',
    primary: 'blue-700',
    'primary-foreground': 'white',
    secondary: 'slate-100',
    'secondary-foreground': 'slate-900',
    destructive: 'red-700',
    'destructive-foreground': 'white',
    // A QR code stays dark on light in both themes: not every scanner reads one the other way round.
    qr: 'white',
    'qr-foreground': 'slate-950'
  },
  dark: {
    background: 'slate-950',
    foreground: 'slate-50',
    'muted-foreground': 'slate-400',
    border: 'slate-500',
    ring: 'blue-400',
    primary: 'blue-400',
    'primary-foreground': 'slate-950',
    secondary: 'slate-800',
    'secondary-foreground': 'slate-50',
    destructive: 'red-400',
    'destructive-foreground': 'slate-950',
    qr: 'white',
    'qr-foreground': 'slate-950'
  }
} as const satisfies Record<string, Record<Role, Primitive>>

export type ThemeName = keyof typeof themes

/** The colour a role has in a theme. */
export function color(theme: ThemeName, role: Role): Hex {
  return primitives[themes[theme][role]]
}
