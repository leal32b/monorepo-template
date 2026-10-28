import { cn } from './cn'

describe('cn', () => {
  it("lets a later utility for the same property win, so a passed class overrides the component's", () => {
    expect(cn('h-9 px-4', 'px-6')).toBe('h-9 px-6')
    expect(cn('bg-primary hover:bg-primary/90', 'bg-destructive')).toBe('hover:bg-primary/90 bg-destructive')
  })

  it('tells the role colours apart from the font sizes', () => {
    expect(cn('text-sm text-primary-foreground', 'text-foreground')).toBe('text-sm text-foreground')
    expect(cn('text-muted-foreground', 'text-base')).toBe('text-muted-foreground text-base')
  })

  it('drops falsy values', () => {
    expect(cn('px-4', false, undefined, null, 'h-9')).toBe('px-4 h-9')
  })
})
