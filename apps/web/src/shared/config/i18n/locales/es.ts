import { accountEs } from '../dictionaries/account/es'
import { customersEs } from '../dictionaries/customers/es'
import { entryEs } from '../dictionaries/entry/es'
import { organizationsEs } from '../dictionaries/organizations/es'
import { shellEs } from '../dictionaries/shell/es'
import type { Messages } from './en'

export const es: Messages = {
  ...customersEs,
  ...shellEs,
  ...accountEs,
  ...organizationsEs,
  ...entryEs
}
