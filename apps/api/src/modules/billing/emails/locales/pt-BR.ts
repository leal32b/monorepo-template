import type { BillingEmailTexts } from './en'

export const ptBR: BillingEmailTexts = {
  trialEnding: {
    subject: 'O período de teste de {organization} termina em {days} dias',
    body: 'O período de teste de {organization} termina em {trialEnds}. Escolha um plano para continuar adicionando e alterando registros; depois desse dia a organização fica somente leitura até um plano ser escolhido. Nada é excluído.',
    action: 'Ver planos',
    footer: 'Você recebe este email porque é dono de {organization}. Se já escolheu um plano, ignore-o.'
  },
  paymentFailed: {
    subject: 'Não recebemos o pagamento de {organization}',
    body: 'Não recebemos o pagamento de {organization} com vencimento em {dueDay}. Pague até {payBy} para continuar adicionando e alterando registros; depois desse dia a organização fica somente leitura até o pagamento. Nada é excluído.',
    action: 'Pagar agora',
    footer:
      'Se acabou de pagar, ignore este email: um boleto pode levar até 3 dias úteis para compensar. Você recebe este email porque é dono de {organization}.'
  }
}
