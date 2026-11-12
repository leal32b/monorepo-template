import type { organizationsEn } from './en'

export const organizationsPtBR: typeof organizationsEn = {
  organizations: {
    create: {
      name: 'Nome da organização',
      submit: 'Criar organização',
      timeZone: 'Fuso horário',
      timeZoneHint: 'Datas e horários aparecem neste fuso para todos.',
      currency: 'Moeda',
      currencyHint: 'Novos valores usam esta moeda. Você pode alterar os dois depois.'
    },
    errors: {
      nameRequired: 'Digite um nome para a sua organização.',
      nameTooLong: 'Use no máximo {{max}} caracteres.',
      limitReached: 'Você participa do máximo de organizações permitido. Saia de uma para criar outra.',
      slugRequired: 'Digite um endereço.',
      slugInvalid: 'Use letras minúsculas, números e hifens simples, com até 48 caracteres.',
      slugReserved: 'Este endereço é reservado. Escolha outro.',
      slugTaken: 'Outra organização já usa este endereço. Escolha outro.',
      notAllowed: 'Você não tem mais permissão para isso. Peça a um proprietário da organização.',
      invalidTimeZone: 'Escolha um fuso horário da lista.',
      invalidCurrency: 'Escolha uma moeda da lista.'
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
    regional: {
      title: 'Horário e moeda',
      description: 'Como datas, horários e valores aparecem para todos nesta organização.',
      readOnly: 'Você pode ver estas configurações. Proprietários e administradores podem alterá-las.',
      timeZone: {
        title: 'Fuso horário',
        now: '{{zone}} · agora {{time}}',
        change: 'Alterar fuso horário',
        label: 'Fuso horário',
        hint: 'Datas e horários salvos continuam no mesmo momento e aparecem no novo fuso.',
        save: 'Salvar fuso horário',
        saved: 'Fuso horário salvo'
      },
      currency: {
        title: 'Moeda',
        example: '{{currency}} · {{amount}}',
        change: 'Alterar moeda',
        label: 'Moeda',
        hint: 'Novos valores usam esta moeda. Valores já salvos mantêm a moeda deles.',
        save: 'Salvar moeda',
        saved: 'Moeda salva'
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
      ac: 'Papéis',
      customer: 'Clientes'
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
      },
      customer: {
        read: 'Ver clientes',
        create: 'Adicionar clientes',
        update: 'Editar clientes',
        delete: 'Excluir clientes'
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
      description: 'Outra organização, com suas próprias pessoas e papéis.',
      unavailable: 'Não conseguimos verificar seus convites. Confira sua conexão e tente de novo.'
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
  }
}
