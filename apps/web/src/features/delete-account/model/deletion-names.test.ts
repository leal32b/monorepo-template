import type { AccountDeletion } from '@repo/contracts'
import { deletionNames } from './deletion-names'

const organization = (name: string, outcome: AccountDeletion['organizations'][number]['outcome']) => ({
  id: name,
  name,
  slug: name.toLowerCase(),
  outcome
})

describe('deletionNames', () => {
  it('has no names when the user is in no organization, nor for one that blocks', () => {
    expect(deletionNames({ organizations: [organization('Shared', 'blocked')] }, 'en')).toEqual({
      deleted: undefined,
      left: undefined
    })
  })

  it('lists the organizations that go and the ones left, in the language', () => {
    const plan = {
      organizations: [organization('Alone', 'deleted'), organization('Solo', 'deleted'), organization('Shared', 'left')]
    }

    expect(deletionNames(plan, 'en')).toEqual({ deleted: 'Alone and Solo', left: 'Shared' })
    expect(deletionNames(plan, 'pt-BR').deleted).toBe('Alone e Solo')
  })
})
