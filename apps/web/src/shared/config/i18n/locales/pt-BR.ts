import { accountPtBR } from '../dictionaries/account/pt-BR'
import { customersPtBR } from '../dictionaries/customers/pt-BR'
import { organizationsPtBR } from '../dictionaries/organizations/pt-BR'
import { shellPtBR } from '../dictionaries/shell/pt-BR'
import type { Messages } from './en'

export const ptBR: Messages = {
  ...customersPtBR,
  ...shellPtBR,
  ...accountPtBR,
  ...organizationsPtBR,
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
      passwordCompromised: 'Esta senha já apareceu em um vazamento de dados. Escolha outra.',
      passwordRequired: 'Informe sua senha.',
      passwordWrong: 'Esta não é a sua senha atual.'
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
      sentTo: 'Enviamos um link para',
      notThere: 'Não chegou? Confira o spam ou envie de novo.',
      wrongAddress: 'Endereço errado?',
      useAnother: 'Usar outro e-mail'
    }
  },
  signIn: {
    title: 'Entrar',
    description: 'Que bom ver você de novo.',
    submit: 'Entrar',
    noAccount: 'Ainda não tem conta?',
    forgot: 'Esqueceu a senha?',
    signUp: 'Criar conta',
    errors: {
      wrongCredentials: 'O e-mail ou a senha estão errados. Confira e tente de novo.',
      unconfirmed: 'Confirme seu e-mail primeiro: abra o link que enviamos no cadastro ou envie de novo.',
      linkExpired: 'Este link de confirmação expirou. Entre, e você poderá pedir um novo.'
    },
    accountDeleted: 'Sua conta foi excluída.',
    google: {
      or: 'ou',
      continue: 'Continuar com o Google',
      errors: {
        cancelled: 'O login com o Google foi cancelado. Tente de novo ou entre com seu e-mail.',
        unverified: 'O Google ainda não confirmou este e-mail. Confirme no Google ou entre com seu e-mail.',
        notLinked:
          'Este e-mail já tem uma conta ainda não confirmada. Abra o link que enviamos para ele e tente o Google de novo.',
        interrupted: 'O login com o Google não terminou. Tente de novo a partir desta página.',
        failed: 'O login com o Google não funcionou. Tente de novo em instantes.'
      }
    }
  },
  forgotPassword: {
    wait: 'Enviar o link de novo em {{seconds}} s',
    title: 'Redefina sua senha',
    description: 'Enviaremos um link por e-mail.',
    submit: 'Enviar link',
    sent: 'Se houver uma conta com {{email}}, enviamos um link para ela. Ele vale por 1 hora; confira o spam se não chegar.',
    remembered: 'Lembrou?',
    signIn: 'Entrar'
  },
  resetPassword: {
    title: 'Escolha uma nova senha',
    description: 'Isso encerra suas outras sessões.',
    password: 'Nova senha',
    submit: 'Trocar senha',
    expired: 'Este link expirou ou já foi usado. Cada link funciona uma vez, por 1 hora.',
    expiredTitle: 'Este link não vale mais',
    askAgain: 'Pedir um novo link',
    changedMind: 'Mudou de ideia?',
    signIn: 'Entrar',
    done: {
      title: 'Senha trocada',
      description: 'Entre com sua nova senha.',
      signIn: 'Entrar'
    }
  },
  twoFactor: {
    title: 'Verificação em duas etapas',
    submit: 'Verificar',
    notYou: 'Não é a sua conta?',
    signInAgain: 'Entrar de novo',
    app: {
      description: 'Abra seu app autenticador.',
      code: 'Código de 6 dígitos',
      other: 'Sem acesso ao app?',
      switch: 'Use um código de backup'
    },
    backup: {
      description: 'Use um dos códigos que você guardou.',
      code: 'Código de backup',
      other: 'Está com o app?',
      switch: 'Use o código do app'
    },
    errors: {
      codeInvalid: 'Digite os 6 dígitos que o app mostra.',
      codeWrong: 'Este código não está certo. Digite o que o app mostra agora.',
      backupInvalid: 'Digite um código de backup como você o guardou, por exemplo a8Kd2-Xm9Qz.',
      backupWrong: 'Este código de backup não está certo ou já foi usado. Cada um funciona uma vez.',
      expired: 'Este login expirou. Entre de novo para receber um novo código.',
      locked: 'Muitos códigos errados. Por segurança, espere 15 minutos e entre de novo.'
    }
  },
  entryLayout: {
    language: 'Idioma'
  },
  mail: {
    open: 'Abrir o {{provider}}',
    newTab: ' (abre em uma nova aba)'
  },
  resendConfirmation: {
    wait: 'Enviar de novo em {{seconds}} s',
    send: 'Enviar de novo',
    sent: 'Enviamos de novo. Pode levar alguns minutos.'
  }
}
