import type { Messages } from './en'

export const ptBR: Messages = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Template de monorepo'
  },
  account: {
    title: 'Segurança da conta',
    unavailable: 'Não conseguimos carregar a segurança da sua conta. Confira sua conexão e tente de novo.',
    retry: 'Tentar de novo',
    password: {
      title: 'Senha',
      set: 'Você entra com seu e-mail e uma senha.',
      unset: 'Sua conta não tem senha: você entra com o Google.'
    },
    twoFactor: {
      title: 'Verificação em duas etapas',
      on: 'Ligada: entrar com a senha também pede um código do seu app autenticador.',
      off: 'Desligada: entrar pede só a sua senha.',
      needsPassword:
        'Ela protege a entrada com senha, então precisa de uma senha antes. O Google protege as entradas pelo Google.',
      why: 'Ligue para que uma senha roubada não baste: entrar também vai pedir um código de um app no seu celular.',
      enabled: 'A verificação em duas etapas está ligada.'
    },
    backupCodes: {
      label: 'Códigos de backup',
      save: 'Guarde estes códigos de backup. Cada um faz você entrar uma vez se não puder usar o app. Eles só aparecem agora.',
      copy: 'Copiar',
      copied: 'Copiados.',
      copyFailed: 'Não foi possível copiar. Baixe os códigos, ou selecione e copie.',
      download: 'Baixar',
      file: 'Códigos de backup de {{email}} no {{app}}. Cada um faz você entrar uma vez.',
      saved: 'Já guardei'
    }
  },
  changePassword: {
    current: 'Senha atual',
    next: 'Nova senha',
    submit: 'Trocar senha',
    signsOut: 'Trocar a senha encerra a sessão nos seus outros aparelhos.',
    changed: 'Sua senha foi trocada. Seus outros aparelhos saíram da conta.'
  },
  createPassword: {
    why: 'Com uma senha, você também entra com seu e-mail e pode ligar a verificação em duas etapas.',
    send: 'Criar uma senha',
    sent: 'Enviamos para {{email}} um link para criar sua senha. Ele vale por 1 hora.'
  },
  confirmPassword: {
    label: 'Sua senha',
    hint: 'Para confirmar que é você.'
  },
  enableTwoFactor: {
    setUp: 'Configurar',
    scan: 'Leia este QR code com um app autenticador, como Google Authenticator, Microsoft Authenticator ou 1Password.',
    qr: 'QR code para adicionar sua conta a um app autenticador',
    onThisPhone: 'Está neste celular?',
    openApp: 'Abra no seu app autenticador',
    key: 'Ou digite esta chave no app:',
    turnOn: 'Ligar'
  },
  appShell: {
    signedInAs: 'Entrou como {{name}}',
    signOut: 'Sair'
  },
  session: {
    unavailable: {
      title: 'Não conseguimos verificar sua entrada',
      description: 'Confira sua conexão e tente de novo.',
      retry: 'Tentar de novo'
    }
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
      sentTo: 'Enviamos um link para {{email}}.',
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
    google: {
      or: 'ou',
      continue: 'Continuar com o Google',
      errors: {
        cancelled: 'A entrada com o Google foi cancelada. Tente de novo ou entre com seu e-mail.',
        unverified: 'O Google ainda não confirmou este e-mail. Confirme no Google ou entre com seu e-mail.',
        notLinked:
          'Este e-mail já tem uma conta ainda não confirmada. Abra o link que enviamos para ele e tente o Google de novo.',
        interrupted: 'A entrada com o Google não terminou. Tente de novo a partir desta página.',
        failed: 'A entrada com o Google não funcionou. Tente de novo em instantes.'
      }
    }
  },
  forgotPassword: {
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
    askAgain: 'Pedir um novo link',
    done: {
      title: 'Senha trocada',
      description: 'Entre com sua nova senha.',
      signIn: 'Entrar'
    }
  },
  twoFactor: {
    title: 'Verificação em duas etapas',
    submit: 'Verificar',
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
      expired: 'Esta entrada expirou. Entre de novo para receber um novo código.',
      locked: 'Códigos errados demais. Por segurança, espere 15 minutos e entre de novo.'
    }
  },
  resendConfirmation: {
    send: 'Enviar de novo',
    sent: 'Enviamos de novo. Pode levar alguns minutos.'
  }
}
