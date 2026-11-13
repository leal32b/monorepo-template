import type { billingEn } from './en'

export const billingPtBR: typeof billingEn = {
  billing: {
    title: 'Plano e cobrança',
    unavailable: 'Não foi possível carregar o plano. Verifique sua conexão e tente de novo.',
    plans: { basic: 'Básico', pro: 'Pro' },
    trial: 'Teste',
    price: '{{price}} por mês',
    limits: {
      'customers.max': { some: 'Até {{count}} clientes ativos', none: 'Clientes sem limite' }
    },
    capabilities: { 'activity-log': 'Registro de atividade' },
    actions: {
      plans: 'Ver planos',
      pay: 'Pagar agora',
      keep: 'Manter o plano',
      open: 'Abrir o pagamento',
      continue: 'Continuar para o pagamento'
    },
    current: {
      title: 'Seu plano',
      description: 'O que {{name}} paga, e até quando.',
      memberDescription: 'Só um proprietário de {{name}} pode escolher, mudar ou pagar o plano.',
      badges: { trial: 'Teste', active: 'Ativo', late: 'Pagamento atrasado', readOnly: 'Somente leitura' },
      trial: 'Teste gratuito até {{date}} ({{days}}).',
      trialEnded: 'O teste terminou em {{date}}.',
      paid: '{{price}}. Pago até {{date}}.',
      late: '{{price}}. O pagamento com vencimento em {{due}} não foi recebido.',
      ended: 'O plano terminou em {{date}}.',
      endedUndated: 'O plano terminou.'
    },
    checkout: {
      upgrade: 'Mudar para o {{plan}}',
      subscription: 'Assinar o {{plan}}',
      waiting:
        'Aguardando o pagamento de {{amount}}. O {{plan}} começa assim que ele for confirmado: cartão em segundos, Pix em minutos, boleto em até três dias úteis.',
      cancelUpgrade: 'Cancelar a mudança',
      cancelSubscription: 'Cancelar o pagamento',
      cancelled: {
        upgrade: 'A mudança para o {{plan}} foi cancelada. Você continua no {{current}}, e nada foi cobrado.',
        subscription: 'O pagamento do {{plan}} foi cancelado. Nada foi cobrado.'
      }
    },
    downgrade: {
      title: 'Muda para o {{plan}} em {{date}}',
      description: 'Você mantém o {{current}} até lá. Nada é reembolsado.',
      keep: 'Manter o {{plan}}',
      kept: 'Você mantém o {{plan}}. Nada muda.'
    },
    end: {
      title: 'Termina em {{date}}',
      description: 'Depois disso, a organização fica somente leitura. Nada é apagado.',
      kept: 'Seu plano continua. Nada muda.'
    },
    late: {
      title: 'Pagamento atrasado',
      pastDue: 'Pague até {{until}} para continuar editando. Nada é apagado.',
      readOnly: 'A organização está somente leitura desde {{until}}. Pague para editar de novo. Nada foi apagado.'
    },
    cancel: {
      action: 'Cancelar o plano',
      description: 'O plano termina quando o período pago acabar.',
      message:
        'Seu plano continua pago até {{date}}. Depois disso, a organização fica somente leitura: nada é apagado, e você pode manter o plano até lá.',
      messageUndated:
        'O plano termina quando o período pago acabar. Depois disso, a organização fica somente leitura: nada é apagado, e você pode manter o plano até lá.',
      done: 'Seu plano termina quando o período pago acabar. Você pode mantê-lo até lá.'
    },
    reference: 'Referência para o suporte',
    managers: {
      title: 'Quem cuida do plano',
      unknown: 'Um proprietário de {{name}}'
    },
    catalogue: {
      title: 'Planos',
      description: 'Escolha o plano que serve para {{name}}. Os preços são por mês.',
      memberDescription: 'O que cada plano inclui.',
      current: 'Plano atual',
      choose: 'Escolher o {{plan}}',
      notes: {
        late: 'Pague primeiro o que está atrasado.',
        ending: 'Mantenha o plano primeiro, depois mude.',
        open: 'Pague ou cancele primeiro o pagamento aberto.'
      },
      subscribe: 'Você paga {{price}} agora e depois todo mês. O {{plan}} começa assim que o pagamento for confirmado.',
      upgrade:
        'Você paga {{amount}} agora pelo restante do período ({{days}}); a partir de {{date}}, {{price}} por mês. O {{plan}} começa assim que o pagamento for confirmado.',
      freeUpgrade:
        'O {{plan}} começa agora. Não há nada a pagar pelo restante do período ({{days}}); a partir de {{date}}, custa {{price}} por mês.',
      downgrade:
        'O {{plan}} começa em {{date}}, quando o período pago acabar. Você mantém o {{current}} até lá, e nada é reembolsado.',
      method: 'Como pagar',
      methodHint: 'Cartão é confirmado em segundos, Pix em minutos, boleto em até três dias úteis.',
      methods: { card: 'Cartão', pix: 'Pix', boleto: 'Boleto' },
      change: 'Mudar para o {{plan}}',
      changed: 'Agora você está no {{plan}}.',
      scheduled: 'O {{plan}} começa em {{date}}.'
    },
    returned: {
      waiting: 'Confirmando seu pagamento com o provedor…',
      confirmed: 'Seu pagamento foi confirmado. Você está no {{plan}}.',
      late: 'O provedor ainda não confirmou o pagamento. Boleto ou Pix podem demorar: o {{plan}} começa assim que a confirmação chegar, e você pode continuar trabalhando.',
      notPaid: {
        upgrade: 'A mudança para o {{plan}} não foi paga. Você continua no {{current}}, e nada foi cobrado.',
        subscription: 'O pagamento do {{plan}} não foi concluído. Nada foi cobrado.'
      },
      cancelled: 'Pagamento não concluído. Nada foi cobrado.'
    },
    errors: {
      changed:
        'O plano mudou desde que esta página foi lida. Ela mostra o mais recente agora: confira e tente de novo.',
      checkoutOpen: 'Já há um pagamento aberto para outro plano. Pague ou cancele esse pagamento primeiro.',
      checkoutPaid: 'Este pagamento já foi feito. O plano muda assim que o provedor confirmar.',
      notActive: 'Ainda não há um plano pago para mudar. Escolha um plano primeiro.',
      cancellationScheduled: 'O plano está programado para terminar. Mantenha o plano primeiro, depois mude.',
      paymentOverdue: 'Há um pagamento atrasado. Pague primeiro, depois mude o plano.',
      wrongDirection:
        'O plano mudou desde que esta página foi lida, e esta escolha agora funciona de outro jeito. Escolha de novo.',
      unavailable: 'O provedor de pagamento não está respondendo. Nada foi alterado: tente de novo em instantes.',
      notAllowed: 'Só um proprietário pode cuidar do plano.'
    },
    refusals: {
      limits: {
        'customers.max': {
          owner:
            'Seu plano permite {{limit}} clientes ativos. Escolha um plano maior, ou arquive os clientes que você não atende mais.',
          upgrading:
            'Seu plano permite {{limit}} clientes ativos. A mudança para o {{plan}} começa quando o pagamento for confirmado.',
          member:
            'O plano desta organização permite {{limit}} clientes ativos. Arquivar os clientes que não são mais atendidos abre espaço; um proprietário pode escolher um plano maior.'
        }
      },
      capabilities: {
        'activity-log': {
          title: 'O registro de atividade não está no seu plano',
          description:
            'Ele vem com o {{plans}}. A atividade é registrada em todos os planos e aparece aqui quando o plano a incluir.'
        }
      },
      capabilityMember: 'Um proprietário pode mudar o plano.',
      readOnly: {
        owner: 'A organização está somente leitura até que um plano seja pago. Nada foi apagado.',
        member: 'Esta organização está somente leitura até que um proprietário pague. Você ainda pode ver tudo.',
        note: 'Somente leitura até que o plano seja pago'
      }
    },
    notice: {
      owner: {
        trialEnding:
          'Seu teste termina em {{date}}. Escolha um plano para continuar adicionando e alterando registros. Nada é apagado.',
        trialEnded:
          'Seu teste terminou em {{date}}. A organização está somente leitura: todos podem ver e excluir, ninguém pode adicionar nem alterar. Escolha um plano para editar de novo. Nada foi apagado.',
        endScheduled: 'Seu plano termina em {{date}}. Depois disso, a organização fica somente leitura.',
        pastDue:
          'Não recebemos o pagamento com vencimento em {{due}}. Pague até {{until}} para continuar editando. Nada é apagado.',
        pastDueReadOnly:
          'A organização está somente leitura desde {{until}} porque o pagamento com vencimento em {{due}} não foi recebido. Pague para editar de novo. Nada foi apagado.',
        ended:
          'Seu plano terminou em {{date}}. A organização está somente leitura. Escolha um plano para editar de novo. Nada foi apagado.',
        endedUndated:
          'Seu plano terminou. A organização está somente leitura. Escolha um plano para editar de novo. Nada foi apagado.'
      },
      member: {
        trialEnding:
          'O teste desta organização termina em {{date}}. Depois disso, ela fica somente leitura até que um proprietário escolha um plano.',
        trialEnded:
          'Esta organização está somente leitura desde {{date}}, até que um proprietário escolha um plano. Você ainda pode ver tudo.',
        endScheduled: 'O plano desta organização termina em {{date}}. Depois disso, ela fica somente leitura.',
        pastDue:
          'O pagamento desta organização está atrasado. A partir de {{until}}, ela fica somente leitura até que um proprietário pague.',
        pastDueReadOnly:
          'Esta organização está somente leitura desde {{until}}, até que um proprietário pague. Você ainda pode ver tudo.',
        ended:
          'Esta organização está somente leitura desde {{date}}, até que um proprietário escolha um plano. Você ainda pode ver tudo.',
        endedUndated:
          'Esta organização está somente leitura até que um proprietário escolha um plano. Você ainda pode ver tudo.'
      }
    }
  }
}
