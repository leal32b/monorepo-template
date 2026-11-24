import type { subscriptionEn } from './en'

export const subscriptionPtBR: typeof subscriptionEn = {
  subscription: {
    plans: { basic: 'Básico', pro: 'Pro' },
    trial: 'Teste',
    actions: { plans: 'Ver planos', pay: 'Pagar agora', keep: 'Manter o plano' },
    limitReached: {
      'customers.max': {
        owner:
          'Seu plano permite {{limit}} clientes ativos. Escolha um plano maior, ou arquive os clientes que você não atende mais.',
        upgrading:
          'Seu plano permite {{limit}} clientes ativos. A mudança para o {{plan}} começa quando o pagamento for confirmado.',
        member:
          'O plano desta organização permite {{limit}} clientes ativos. Arquivar os clientes que não são mais atendidos abre espaço; um proprietário pode escolher um plano maior.'
      }
    },
    readOnly: {
      owner: 'A organização está somente leitura até que um plano seja pago. Nada foi apagado.',
      member: 'Esta organização está somente leitura até que um proprietário pague. Você ainda pode ver tudo.',
      note: 'Somente leitura até que o plano seja pago'
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
