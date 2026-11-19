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
  }
}
