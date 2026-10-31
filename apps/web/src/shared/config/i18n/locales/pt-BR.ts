import type { Messages } from './en'

export const ptBR: Messages = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Template de monorepo'
  },
  apiStatus: {
    checking: 'Verificando a API…',
    up: 'A API está no ar: {{service}} às {{timestamp}}',
    degraded: 'A API está no ar, mas o banco de dados não responde.',
    unreachable: 'Não consegui falar com a API.',
    unexpected: 'A API respondeu algo inesperado.',
    error: 'A API respondeu com erro.',
    errorWithCode: 'A API respondeu com erro ({{code}}).',
    unknown: 'Algo deu errado.',
    checkAgain: 'Verificar de novo'
  }
}
