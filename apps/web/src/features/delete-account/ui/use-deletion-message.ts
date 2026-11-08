import type { AccountDeletion } from '@repo/contracts'
import { useI18n } from '#shared/config'
import { deletionNames } from '../model/deletion-names'

/** What deleting the account does, said the same way on both screens before it happens (ADR 0049). */
export function useDeletionMessage(): (plan: AccountDeletion) => string {
  const { t, locale } = useI18n()
  return (plan) => {
    const { deleted, left } = deletionNames(plan, locale())
    return [
      t('accountDeletion.message.account'),
      deleted && t('accountDeletion.message.deleted', { names: deleted }),
      left && t('accountDeletion.message.left', { names: left }),
      t('accountDeletion.message.final')
    ]
      .filter(Boolean)
      .join(' ')
  }
}
