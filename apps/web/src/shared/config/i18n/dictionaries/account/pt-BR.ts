import type { accountEn } from './en'

export const accountPtBR: typeof accountEn = {
  profile: {
    title: 'Perfil',
    details: {
      title: 'Seus dados',
      description: 'Como você aparece no app e nos e-mails que ele envia.',
      name: 'Nome',
      email: 'E-mail'
    }
  },
  accountDeletion: {
    title: 'Excluir conta',
    description: 'Excluir sua conta não pode ser desfeito.',
    row: 'Excluir sua conta',
    rowDescription: 'Sua conta, suas formas de entrar e suas participações somem de vez.',
    open: 'Excluir conta',
    loading: 'Verificando o que excluir sua conta faria',
    unavailable: 'Não conseguimos verificar o que excluir sua conta faria. Verifique sua conexão e tente de novo.',
    blocked: {
      title: 'Só você é proprietário de {{name}}',
      description:
        'Ela tem outros membros. Torne um deles proprietário, ou exclua a organização, antes de excluir sua conta.',
      go: 'Abrir membros'
    },
    message: {
      account: 'Sua conta, suas formas de entrar e sua verificação em duas etapas são excluídas.',
      deleted: 'As organizações em que só você participa são excluídas também, com tudo o que há nelas: {{names}}.',
      left: 'Você sai destas organizações: {{names}}.',
      final: 'Isso não pode ser desfeito.'
    },
    request: {
      intro: 'Vamos enviar para {{email}} um link para confirmar.',
      submit: 'Enviar o link por e-mail',
      sent: 'Enviamos um link para {{email}}. Abra em até 1 hora, onde você estiver conectado, para excluir sua conta.'
    },
    confirm: {
      title: 'Excluir sua conta',
      description: 'O último passo: ao apertar o botão, sua conta deixa de existir.',
      submit: 'Excluir minha conta',
      expired: 'Este link expirou ou já foi usado. Peça um novo no seu perfil.',
      profile: 'Ir para o seu perfil'
    },
    errors: {
      blocked: 'Agora só você é proprietário de uma organização que compartilha. Seu perfil mostra o que fazer.'
    }
  },
  preferences: {
    title: 'Preferências',
    appearance: {
      title: 'Aparência',
      description: 'Salvo neste navegador.'
    },
    theme: {
      title: 'Tema',
      description: '"Sistema" segue o claro ou escuro do seu aparelho.',
      system: 'Sistema',
      light: 'Claro',
      dark: 'Escuro'
    },
    language: {
      title: 'Idioma',
      description: 'Salvo neste navegador.',
      screens: 'Idioma das telas',
      emails: 'Os e-mails continuam no idioma em que você criou a conta.'
    }
  },
  account: {
    title: 'Segurança',
    unavailable: 'Não conseguimos carregar a segurança da sua conta. Confira sua conexão e tente de novo.',
    signIn: {
      title: 'Formas de entrar',
      description: 'Como você acessa a sua conta.'
    },
    twoFactor: {
      title: 'Verificação em duas etapas',
      description: 'Uma segunda etapa quando você entra com a senha.'
    },
    badge: {
      on: 'Ativada',
      off: 'Desativada',
      notSetUp: 'Não configurada',
      linked: 'Vinculado',
      notLinked: 'Não vinculado'
    },
    password: {
      title: 'Senha',
      set: 'Você entra com seu e-mail e uma senha.',
      unset:
        'Sua conta não tem senha: você entra com o Google. Uma senha deixa você entrar também com o e-mail e ativar a verificação em duas etapas.',
      change: 'Alterar senha'
    },
    authenticator: {
      title: 'App autenticador',
      on: 'Entrar com a senha também pede um código do seu app.',
      off: 'Entrar pede só a sua senha. Ative para que uma senha roubada não baste: vai pedir também um código de um app no seu celular.',
      needsPassword:
        'Ela protege o login com senha, então precisa de uma senha antes. O Google protege os logins pelo Google.',
      turnOn: 'Ativar',
      turnOff: 'Desativar',
      enabled: 'A verificação em duas etapas está ativada.',
      enabledDone: 'Pronto: entrar com a senha agora também pede um código do seu app.',
      disabled: 'Pronto: entrar pede só a sua senha.',
      stepper: 'Ativando a verificação em duas etapas',
      done: 'concluída',
      steps: {
        confirm: 'Confirme que é você',
        connect: 'Conecte o app',
        save: 'Guarde os códigos'
      }
    },
    backupCodes: {
      title: 'Códigos de backup',
      description: 'Cada um faz você entrar uma vez se não puder usar o app.',
      unavailable: 'Disponíveis depois que a verificação em duas etapas estiver ativada.',
      newCodes: 'Gerar novos códigos',
      regenerated: 'Seus novos códigos de backup estão prontos. Os antigos não funcionam mais.',
      label: 'Códigos de backup',
      save: 'Guarde estes códigos de backup. Cada um faz você entrar uma vez se não puder usar o app. Eles só aparecem agora.',
      copy: 'Copiar',
      copied: 'Copiados.',
      copyFailed: 'Não foi possível copiar. Baixe os códigos, ou selecione e copie.',
      download: 'Baixar',
      file: 'Códigos de backup de {{email}} no {{app}}. Cada um faz você entrar uma vez.',
      saved: 'Já guardei'
    },
    google: {
      title: 'Google',
      linked: 'Você também pode entrar com sua conta Google. Pode desvincular e vincular de novo quando quiser.',
      unlinked: 'Vincule para entrar também com sua conta Google.',
      only: 'É como você entra, então fica vinculado até você criar uma senha.',
      unlinkedDone: 'O Google foi desvinculado. Você pode vincular de novo quando quiser.'
    }
  },
  changePassword: {
    current: 'Senha atual',
    next: 'Nova senha',
    submit: 'Trocar senha',
    signsOut: 'Trocar a senha encerra a sessão nos seus outros aparelhos.',
    changed: 'Sua senha foi trocada. Os outros aparelhos foram desconectados.'
  },
  createPassword: {
    why: 'Com uma senha, você também entra com seu e-mail e pode ativar a verificação em duas etapas.',
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
    turnOn: 'Ativar'
  },
  disableTwoFactor: {
    what: 'Entrar volta a pedir só a sua senha, e seus códigos de backup param de funcionar.',
    submit: 'Desativar a verificação em duas etapas'
  },
  regenerateBackupCodes: {
    what: 'Os novos códigos substituem os que você tem, que param de funcionar.',
    submit: 'Gerar novos códigos'
  },
  linkGoogle: {
    submit: 'Vincular o Google',
    errors: {
      cancelled: 'O Google não foi vinculado: você cancelou no Google.',
      otherEmail: 'Essa conta Google tem outro e-mail. Vincule a que usa {{email}}.',
      otherUser: 'Essa conta Google já entra em outra conta aqui.',
      interrupted: 'O vínculo com o Google não terminou. Tente de novo a partir desta página.',
      failed: 'Não foi possível vincular o Google. Tente de novo em instantes.'
    }
  },
  unlinkGoogle: {
    submit: 'Desvincular o Google',
    stale: 'Por segurança, entre de novo antes de desvincular o Google.',
    signInAgain: 'Entrar de novo'
  }
}
