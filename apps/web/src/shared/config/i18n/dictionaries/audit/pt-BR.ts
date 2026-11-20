import type { auditEn } from './en'

export const auditPtBR: typeof auditEn = {
  activity: {
    title: 'Atividade',
    unavailable: 'Não conseguimos carregar a atividade. Confira sua conexão e tente de novo.',
    noAccess: {
      title: 'Você não pode ver a atividade aqui',
      description: 'Seu papel em {{name}} não a inclui. Peça a um proprietário ou a um administrador.'
    },
    section: {
      title: 'Mudanças recentes',
      description: 'Quem mudou o quê em {{name}}, das mais novas às mais antigas. Guardadas por um ano.'
    },
    empty: {
      title: 'Nada mudou ainda',
      description: 'Quando alguém adicionar ou mudar um registro, isso aparece aqui com quem fez e quando.'
    },
    actors: {
      formerMember: 'Alguém que não é mais membro',
      visitor: 'Uma visita, pela sua página pública',
      system: 'O sistema'
    },
    entries: {
      organization: {
        'export-requested': 'Pediu uma exportação dos dados',
        'logo-changed': 'Trocou o logo',
        'logo-removed': 'Removeu o logo'
      },
      customer: {
        created: 'Adicionou um cliente',
        updated: 'Editou um cliente',
        archived: 'Arquivou um cliente',
        restored: 'Restaurou um cliente',
        deleted: 'Excluiu um cliente'
      },
      subscription: {
        'checkout-started': 'Começou a assinar um plano',
        'checkout-abandoned': 'Desistiu de uma assinatura que não foi paga',
        activated: 'Começou o plano pago',
        renewed: 'Recebeu o pagamento de um novo período',
        'upgrade-started': 'Começou a mudança para um plano maior, aguardando o pagamento',
        'upgrade-abandoned': 'Desistiu de uma mudança de plano que não foi paga',
        'plan-changed': 'Mudou o plano',
        'downgrade-scheduled': 'Agendou um plano menor para o próximo período',
        'downgrade-withdrawn': 'Desfez a mudança para um plano menor',
        'payment-failed': 'Registrou um pagamento como atrasado',
        'payment-recovered': 'Recebeu o pagamento atrasado',
        'cancellation-scheduled': 'Agendou o fim do plano',
        'cancellation-withdrawn': 'Desfez o fim do plano',
        cancelled: 'Encerrou o plano'
      }
    },
    changed: '{{what}}: {{fields}}',
    fields: {
      organization: {},
      customer: { name: 'nome', email: 'e-mail', phone: 'telefone', company: 'empresa', notes: 'anotações' },
      subscription: {
        status: 'situação',
        plan: 'plano',
        nextPlan: 'próximo plano',
        periodStartsAt: 'início do período',
        paidThrough: 'pago até',
        pastDueSince: 'atrasado desde',
        cancelAtPeriodEnd: 'fim do plano',
        checkout: 'pagamento em andamento'
      }
    },
    pager: {
      label: 'Páginas da atividade',
      previous: 'Mais novas',
      next: 'Mais antigas',
      page: 'Página {{page}}'
    }
  }
}
