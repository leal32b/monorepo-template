import { accountPtBR } from '../dictionaries/account/pt-BR'
import { customersPtBR } from '../dictionaries/customers/pt-BR'
import { entryPtBR } from '../dictionaries/entry/pt-BR'
import { organizationsPtBR } from '../dictionaries/organizations/pt-BR'
import { publicPtBR } from '../dictionaries/public/pt-BR'
import { shellPtBR } from '../dictionaries/shell/pt-BR'
import type { Messages } from './en'

export const ptBR: Messages = {
  ...customersPtBR,
  ...shellPtBR,
  ...accountPtBR,
  ...organizationsPtBR,
  ...entryPtBR,
  ...publicPtBR
}
