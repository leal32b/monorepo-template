import type { publicEn } from './en'

export const publicPtBR: typeof publicEn = {
  publicPage: {
    title: 'Seja cliente',
    description: 'Deixe seu nome e um jeito de falar com você.',
    notFound: {
      title: 'Não há página neste endereço',
      description: 'Confira o link com quem o passou para você: pode faltar uma letra, ou a página pode ter mudado.'
    },
    unavailable: 'Não foi possível abrir esta página.'
  },
  registration: {
    name: 'Seu nome',
    contact: 'Como {{organization}} pode falar com você?',
    email: 'E-mail',
    phone: 'Telefone',
    contactHint: 'Basta um e-mail ou um telefone.',
    submit: 'Enviar meus dados',
    received: '{{organization}} recebeu seus dados. Se precisar de mais alguma coisa, vai falar com você.',
    errors: {
      nameRequired: 'Informe seu nome.',
      nameTooLong: 'Use até {{max}} caracteres.',
      emailInvalid: 'Informe um e-mail, como ana@exemplo.com.',
      phoneTooLong: 'Use até {{max}} caracteres.',
      contactRequired: 'Informe um e-mail ou um telefone, para que possam falar com você.'
    }
  }
}
