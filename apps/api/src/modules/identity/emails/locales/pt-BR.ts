import type { EmailTexts } from './en'

export const ptBR: EmailTexts = {
  confirmEmail: {
    subject: 'Confirme seu e-mail',
    body: 'Confirme seu endereço de e-mail para terminar de criar sua conta.',
    action: 'Confirmar e-mail',
    footer: 'O link expira em 1 hora. Se você não criou uma conta, ignore este e-mail.'
  },
  resetPassword: {
    subject: 'Redefina sua senha',
    body: 'Recebemos um pedido para redefinir a senha da sua conta. Escolha uma nova senha pelo link abaixo.',
    action: 'Escolher uma nova senha',
    footer: 'O link expira em 1 hora. Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.'
  },
  alreadyRegistered: {
    subject: 'Alguém tentou se cadastrar com seu e-mail',
    body: 'Alguém tentou criar uma conta com este endereço de e-mail, que já tem uma. Se foi você, entre na sua conta ou redefina a senha.',
    action: 'Entrar',
    footer: 'Se não foi você, ignore este e-mail: nada mudou na sua conta.'
  }
}
