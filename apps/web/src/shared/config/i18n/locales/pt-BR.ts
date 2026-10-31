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
  },
  failure: {
    network: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
    rateLimited: 'Tentativas demais. Espere um minuto e tente de novo.',
    unexpected: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
    reference: 'Se continuar, informe ao suporte: {{reference}}'
  },
  auth: {
    name: 'Nome',
    email: 'E-mail',
    password: 'Senha',
    showPassword: 'Mostrar senha',
    newPasswordHint: 'Pelo menos {{min}} caracteres.',
    errors: {
      nameRequired: 'Informe seu nome.',
      emailInvalid: 'Informe um e-mail, como ana@exemplo.com.',
      passwordTooShort: 'Use pelo menos {{min}} caracteres.',
      passwordTooLong: 'Use no máximo {{max}} caracteres.',
      passwordCompromised: 'Esta senha já apareceu em um vazamento de dados. Escolha outra.'
    }
  },
  signUp: {
    title: 'Crie sua conta',
    description: 'Leva menos de um minuto.',
    submit: 'Criar conta',
    haveAccount: 'Já tem uma conta?',
    signIn: 'Entrar',
    checkEmail: {
      title: 'Confira seu e-mail',
      description: 'Confirme seu endereço para terminar.',
      sentTo: 'Enviamos um link para {{email}}.',
      notThere: 'Não chegou? Confira o spam ou envie de novo.',
      wrongAddress: 'Endereço errado?',
      useAnother: 'Usar outro e-mail'
    }
  },
  resendConfirmation: {
    send: 'Enviar de novo',
    sent: 'Enviamos de novo. Pode levar alguns minutos.'
  }
}
