import { accountEn } from '../dictionaries/account/en'
import { auditEn } from '../dictionaries/audit/en'
import { customersEn } from '../dictionaries/customers/en'
import { entryEn } from '../dictionaries/entry/en'
import { organizationsEn } from '../dictionaries/organizations/en'
import { publicEn } from '../dictionaries/public/en'
import { shellEn } from '../dictionaries/shell/en'

export const en = {
  ...customersEn,
  ...shellEn,
  ...accountEn,
  ...organizationsEn,
  ...entryEn,
  ...publicEn,
  ...auditEn
}

/** The shape every language must have: the English dictionary. */
export type Messages = typeof en
