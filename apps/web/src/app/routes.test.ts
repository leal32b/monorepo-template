import { reservedSlugs } from '@repo/contracts'
import type { RouteDefinition } from '@solidjs/router'
import { opensOnEntryScreen, routes, tenantPath } from './routes'

/** The first segment of every path the app answers outside a tenant, nested routes included. */
function firstSegments(definitions: RouteDefinition[], prefix = ''): string[] {
  return definitions.flatMap((definition) => {
    const path = `${prefix}${definition.path === '/' ? '' : (definition.path as string)}`
    const own = path.split('/')[1]
    const nested = definition.children ? firstSegments([definition.children].flat(), path) : []
    return [...(own === undefined || own === '' ? [] : [own]), ...nested]
  })
}

describe('routes (ADR 0034)', () => {
  it('reserves every word a route of its own uses, so no organization slug can shadow it', () => {
    const words = firstSegments(routes).filter((word) => `/${word}` !== tenantPath && !word.startsWith('*'))

    expect(words.length).toBeGreaterThan(5)
    for (const word of new Set(words)) expect(reservedSlugs).toContain(word)
  })
})

describe('opensOnEntryScreen (ADR 0038)', () => {
  it('names the entry screens, the only ones that wait for the sign-in options to paint', () => {
    for (const path of ['/signup', '/login', '/login/', '/login/two-factor', '/forgot-password', '/reset-password']) {
      expect(opensOnEntryScreen(path)).toBe(true)
    }
    for (const path of ['/', '/acme', '/acme/settings/members', '/settings/profile', '/onboarding', '/nowhere']) {
      expect(opensOnEntryScreen(path)).toBe(false)
    }
  })
})
