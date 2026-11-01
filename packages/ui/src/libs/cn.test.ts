import { cn } from './cn'

describe('cn', () => {
  it('joins class names, keeping every one: it does not resolve conflicts between utilities', () => {
    expect(cn('h-9 px-4', 'px-6')).toBe('h-9 px-4 px-6')
    expect(cn('text-sm text-primary-foreground', 'text-foreground')).toBe(
      'text-sm text-primary-foreground text-foreground'
    )
  })

  it('drops falsy values', () => {
    expect(cn('px-4', false, undefined, null, 'h-9')).toBe('px-4 h-9')
  })
})
