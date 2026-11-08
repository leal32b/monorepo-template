import type { AccountDeletion } from '@repo/contracts'

/**
 * The names of the organizations that go with the account and of those it leaves (ADR 0049), each as one
 * list in the language ("Acme and Globex"), or `undefined` when there are none.
 */
export function deletionNames(
  plan: AccountDeletion,
  locale: string
): { deleted: string | undefined; left: string | undefined } {
  const names = (outcome: 'deleted' | 'left') => {
    const found = plan.organizations.filter((organization) => organization.outcome === outcome)
    return found.length === 0
      ? undefined
      : new Intl.ListFormat(locale, { type: 'conjunction' }).format(found.map((organization) => organization.name))
  }
  return { deleted: names('deleted'), left: names('left') }
}
