import { accountEn } from '../dictionaries/account/en'
import { customersEn } from '../dictionaries/customers/en'
import { entryEn } from '../dictionaries/entry/en'
import { organizationsEn } from '../dictionaries/organizations/en'
import { shellEn } from '../dictionaries/shell/en'

export const en = {
  ...customersEn,
  ...shellEn,
  ...accountEn,
  ...organizationsEn,
  ...entryEn
}

/** The shape every language must have: the English dictionary. */
export type Messages = typeof en
