import type { Messages } from './en'

export const ptBR: Messages = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Início',
    empty: {
      title: 'Nada por aqui ainda',
      description: 'O que {{name}} fizer vai aparecer aqui.'
    },
    gettingStarted: {
      title: 'Primeiros passos',
      description: 'Alguns passos para configurar {{name}}.',
      invite: {
        title: 'Convidar pessoas',
        description: 'Chame sua equipe para {{name}}.',
        go: 'Convidar pessoas'
      }
    }
  },
  profile: {
    title: 'Perfil',
    details: {
      title: 'Seus dados',
      description: 'Como você aparece no app e nos e-mails que ele envia.',
      name: 'Nome',
      email: 'E-mail'
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
  /** Words that buttons share across screens. */
  actions: {
    cancel: 'Cancelar',
    retry: 'Tentar de novo'
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
  },
  notFound: {
    title: 'Página não encontrada',
    description: 'O endereço pode estar errado, ou a página pode ter mudado.',
    home: 'Ir para o início'
  },
  appShell: {
    loading: 'Carregando…',
    search: 'Buscar',
    palette: {
      title: 'Paleta de comandos',
      placeholder: 'Busque telas e ações…',
      empty: 'Nada encontrado. Tente outra palavra.',
      go: 'Ir para',
      actions: 'Ações',
      theme: {
        system: 'Usar o tema do sistema',
        light: 'Usar o tema claro',
        dark: 'Usar o tema escuro'
      },
      keywords: {
        profile: 'conta nome e-mail',
        security: 'senha duas etapas verificação autenticador códigos backup google',
        preferences: 'aparência tema idioma',
        theme: 'aparência cor escuro claro',
        signOut: 'sair logout desconectar'
      }
    },
    openMenu: 'Abrir o menu',
    closeMenu: 'Fechar o menu',
    menu: 'Menu',
    breadcrumb: 'Você está em',
    nav: {
      main: 'Principal',
      home: 'Início',
      settings: 'Configurações',
      back: 'Voltar ao app',
      account: 'Sua conta',
      profile: 'Perfil',
      security: 'Segurança',
      preferences: 'Preferências',
      organization: 'Organização',
      general: 'Geral',
      members: 'Membros',
      roles: 'Papéis'
    },
    account: {
      settings: 'Configurações',
      signOut: 'Sair'
    },
    organizations: {
      label: 'Suas organizações',
      create: 'Criar organização'
    },
    status: {
      title: 'Status do serviço',
      button: 'Status do serviço: {{state}}',
      close: 'Fechar',
      checkAgain: 'Verificar de novo',
      checkedAt: 'Verificado às {{time}}',
      reference: 'Se continuar acontecendo, avise o suporte: {{reference}}',
      state: {
        checking: 'Verificando o serviço…',
        ok: 'Tudo funcionando normalmente',
        degraded: 'Alguns recursos não estão funcionando',
        unreachable: 'Não foi possível falar com o serviço',
        unexpected: 'O serviço não está funcionando como deveria',
        error: 'O serviço teve um problema'
      }
    }
  },
  organizations: {
    create: {
      name: 'Nome da organização',
      submit: 'Criar organização'
    },
    errors: {
      nameRequired: 'Digite um nome para a sua organização.',
      nameTooLong: 'Use no máximo {{max}} caracteres.',
      limitReached: 'Você participa do máximo de organizações permitido. Saia de uma para criar outra.',
      slugRequired: 'Digite um endereço.',
      slugInvalid: 'Use letras minúsculas, números e hifens simples, com até 48 caracteres.',
      slugReserved: 'Este endereço é reservado. Escolha outro.',
      slugTaken: 'Outra organização já usa este endereço. Escolha outro.',
      notAllowed: 'Você não tem mais permissão para isso. Peça a um proprietário da organização.'
    },
    unavailable: {
      title: 'Não conseguimos carregar suas organizações',
      description: 'Confira sua conexão e tente de novo.'
    }
  },
  invitations: {
    expires: 'Expira em {{date}}',
    open: 'Ver convite',
    errors: {
      full: 'Esta organização atingiu o limite de membros. Peça a um proprietário que abra espaço.'
    }
  },
  organizationGeneral: {
    title: 'Geral',
    details: {
      title: 'Organização',
      description: 'Como sua equipe vê e encontra esta organização.',
      readOnly: 'Você pode ver estes dados. Proprietários e administradores podem alterá-los.',
      name: {
        title: 'Nome',
        change: 'Renomear',
        label: 'Nome da organização',
        save: 'Salvar nome',
        saved: 'Nome salvo'
      },
      address: {
        title: 'Endereço',
        change: 'Alterar endereço',
        label: 'Endereço',
        warning: 'Favoritos e links que usam o endereço atual deixam de funcionar quando você o altera.',
        save: 'Salvar endereço',
        saved: 'Endereço salvo'
      }
    },
    delete: {
      title: 'Excluir organização',
      description: 'Para todos os membros, isso remove a organização e tudo o que ela contém.',
      row: 'Excluir esta organização',
      rowDescription: 'Isso não pode ser desfeito.',
      open: 'Excluir organização',
      warning: 'Isso remove {{name}} e tudo o que há nela, para todos os membros. Não pode ser desfeito.',
      label: 'Digite o nome da organização para confirmar',
      mismatch: 'O nome não confere. Digite-o exatamente como aparece: {{name}}',
      submit: 'Excluir organização',
      onlyOwner: 'Apenas um proprietário pode excluir a organização.'
    }
  },
  organizationMembers: {
    title: 'Membros',
    unavailable: 'Não conseguimos carregar os membros. Verifique sua conexão e tente de novo.',
    section: {
      title: 'Pessoas',
      description: 'Todas as pessoas que podem abrir {{name}}.',
      readOnly: 'Todas as pessoas que podem abrir {{name}}. Proprietários e administradores gerenciam quem está aqui.'
    },
    you: 'Você',
    roles: {
      owner: 'Proprietário',
      admin: 'Administrador',
      member: 'Membro'
    },
    actions: {
      changeRole: 'Alterar papel',
      remove: 'Remover',
      leave: 'Sair da organização'
    },
    notes: {
      lastOwner:
        'Ninguém mais é proprietário desta organização. Torne outra pessoa proprietária antes de alterar este papel ou sair.',
      outranks: 'Esta pessoa tem permissões que você não tem, então você não pode alterá-la nem removê-la.'
    },
    changeRole: {
      label: 'Papel',
      cannotGive: 'Um papel marcado aqui tem uma permissão que você não tem, então você não pode concedê-lo.',
      locked: '{{role}} (você não pode conceder este papel)',
      save: 'Salvar papel',
      saved: 'Papel alterado para {{role}}'
    },
    remove: {
      warning: 'Remover {{name}} de {{organization}}? A pessoa perde o acesso na hora.',
      submit: 'Remover membro',
      removed: 'Pessoa removida: {{name}}'
    },
    leave: {
      warning: 'Sair de {{organization}}? Você perde o acesso na hora e precisará de um novo convite para voltar.',
      submit: 'Sair da organização'
    },
    errors: {
      notAllowed: 'Você não pode fazer isso com esta pessoa. Seu papel pode ter mudado.',
      lastOwner: 'A organização precisa de um proprietário. Torne outra pessoa proprietária primeiro.',
      gone: 'Esta pessoa não é mais membro. A lista foi atualizada.'
    }
  },
  organizationRoles: {
    title: 'Papéis',
    unavailable: 'Não conseguimos carregar os papéis. Verifique sua conexão e tente de novo.',
    builtIn: {
      title: 'Papéis nativos',
      description: 'Toda organização tem estes três. Eles não podem ser alterados.',
      badge: 'Nativo',
      readOnly: 'Os papéis nativos não podem ser alterados.'
    },
    custom: {
      title: 'Papéis de {{name}}',
      description: 'Papéis próprios reúnem permissões para dar a membros e convites.',
      create: {
        title: 'Criar papel',
        description: 'Escolha o que as pessoas que o têm podem fazer.',
        open: 'Criar papel'
      }
    },
    summary: '{{count}} de {{total}} permissões',
    actions: {
      view: 'Ver permissões',
      edit: 'Editar',
      delete: 'Excluir'
    },
    notes: {
      heldBy: 'Quem tem: {{who}}. Dê outro papel a essas pessoas antes de renomear ou excluir este papel.',
      more: '+{{count}} outros',
      invited: '{{email}} (convidado)',
      exceeds: 'Este papel tem permissões que você não tem, então você só pode vê-lo.'
    },
    resources: {
      organization: 'Organização',
      member: 'Membros',
      invitation: 'Convites',
      ac: 'Papéis'
    },
    permissions: {
      organization: {
        update: 'Alterar o nome e o endereço',
        delete: 'Excluir a organização'
      },
      member: {
        create: 'Adicionar membros',
        update: 'Alterar os papéis dos membros',
        delete: 'Remover membros'
      },
      invitation: {
        create: 'Convidar pessoas',
        cancel: 'Cancelar convites'
      },
      ac: {
        create: 'Criar papéis',
        read: 'Ver papéis',
        update: 'Editar papéis',
        delete: 'Excluir papéis'
      }
    },
    form: {
      name: 'Nome do papel',
      nameHint: 'Letras minúsculas, números e hifens simples, com até 32 caracteres.',
      permissions: 'Permissões',
      notHeld: 'Você não tem esta permissão.',
      ownerOnly: 'Só o papel de proprietário tem esta permissão.',
      renameLocked:
        'Há membros ou convites com este papel, então ele não pode ser renomeado. As permissões podem mudar.',
      create: 'Criar papel',
      save: 'Salvar papel',
      close: 'Fechar',
      created: 'Papel {{role}} criado',
      saved: 'Papel {{role}} salvo'
    },
    remove: {
      warning: 'Excluir o papel {{role}}? Ninguém o tem, então ninguém perde acesso.',
      submit: 'Excluir papel',
      deleted: 'Papel {{role}} excluído'
    },
    errors: {
      nameRequired: 'Digite um nome para o papel.',
      nameInvalid: 'Use letras minúsculas, números e hifens simples, com até 32 caracteres.',
      nameBuiltIn: 'Proprietário, administrador e membro são papéis nativos. Escolha outro nome.',
      nameTaken: 'Esta organização já tem um papel com este nome. Escolha outro.',
      noPermission: 'Escolha pelo menos uma permissão.',
      tooMany: 'Esta organização tem o máximo de papéis permitido. Exclua um para criar outro.',
      notAllowed: 'Você não pode fazer isso com este papel. Seu papel pode ter mudado.',
      inUse: 'Agora há membros ou convites com este papel. Dê outro papel a eles primeiro.',
      gone: 'Este papel não existe mais. A lista foi atualizada.'
    }
  },
  organizationInvitations: {
    section: {
      title: 'Convites',
      description: 'Pessoas convidadas para {{name}} que ainda não responderam.',
      empty: 'Nenhum convite pendente.'
    },
    unavailable: 'Não conseguimos carregar os convites. Verifique sua conexão e tente de novo.',
    invite: {
      title: 'Convidar pessoas',
      description: 'Elas recebem um e-mail com um link para entrar em {{name}}.',
      open: 'Convidar pessoas'
    },
    form: {
      email: 'E-mail',
      role: 'Papel',
      cannotGive: 'Um papel marcado aqui tem uma permissão que você não tem, então você não pode concedê-lo.',
      locked: '{{role}} (você não pode conceder este papel)',
      send: 'Enviar convite',
      sent: 'Convite enviado para {{email}}'
    },
    row: {
      resend: 'Reenviar',
      resent: 'Convite enviado de novo para {{email}}',
      revoke: 'Revogar',
      revoked: 'Convite para {{email}} revogado'
    },
    errors: {
      alreadyMember: 'Esta pessoa já é membro.',
      notAllowed: 'Você não pode convidar com este papel. Seu papel pode ter mudado.',
      limit: 'Esta organização tem o máximo de convites pendentes permitido. Revogue um para enviar outro.',
      tooMany: 'Você enviou muitos convites em pouco tempo. Espere um minuto e tente de novo.',
      gone: 'Este convite não está mais pendente. A lista foi atualizada.'
    }
  },
  invitation: {
    pending: {
      title: 'Convite para {{organization}}',
      description: '{{inviter}} convidou você. O convite vale até {{date}}.',
      accept: 'Aceitar convite',
      decline: 'Recusar'
    },
    signedInAs: 'Você entrou como {{email}}.',
    switchAccount: 'Usar outra conta',
    accepted: {
      title: 'Você está em {{organization}}',
      description: 'Você já aceitou este convite.',
      open: 'Abrir {{organization}}'
    },
    used: {
      title: 'Este convite já foi usado',
      description: 'Você entrou em {{organization}} com ele e não é mais membro. Peça a {{inviter}} um novo convite.'
    },
    expired: {
      title: 'Este convite expirou',
      description: 'Convites valem 7 dias. Peça a {{inviter}} para enviar um novo.'
    },
    declined: {
      title: 'Você recusou este convite',
      description: 'Mudou de ideia? Peça a {{inviter}} um novo convite.'
    },
    withdrawn: {
      title: 'Este convite foi revogado',
      description:
        '{{inviter}} pode ter enviado um mais novo: procure o e-mail mais recente sobre {{organization}}. Se não houver, fale com {{inviter}}.'
    },
    notFound: {
      title: 'Não encontramos este convite',
      description:
        'O link pode estar incompleto. Abra-o de novo pelo e-mail, ou peça a quem convidou você um novo convite.'
    },
    otherAccount: {
      title: 'Este convite é para outro endereço',
      description: 'Você entrou como {{email}}. Entre com o endereço para o qual o convite foi enviado.',
      switch: 'Entrar com outra conta'
    },
    unavailable: {
      title: 'Não conseguimos abrir este convite',
      description: 'Verifique sua conexão e tente de novo.'
    },
    continue: 'Continuar para o app'
  },
  onboarding: {
    title: 'Dê um nome à sua organização',
    description: 'Sua equipe trabalha junta em uma organização.',
    another: {
      title: 'Criar organização',
      description: 'Outra organização, com suas próprias pessoas e papéis.'
    },
    invited: {
      title: 'Há convites para você',
      description: 'Participe de uma equipe que já trabalha junta, ou crie a sua própria organização.',
      invitations: 'Convites',
      own: 'Ou crie a sua própria organização'
    },
    unavailable: {
      title: 'Não conseguimos verificar seus convites',
      description: 'Confira sua conexão e tente de novo.'
    }
  },
  session: {
    unavailable: {
      title: 'Não conseguimos verificar seu login',
      description: 'Confira sua conexão e tente de novo.'
    }
  },
  failure: {
    network: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
    rateLimited: 'Muitas tentativas. Espere um minuto e tente de novo.',
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
  serviceNotice: {
    title: 'O serviço está com problemas',
    hint: 'Entrar ou criar uma conta pode não funcionar. Tente de novo em alguns minutos.'
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
