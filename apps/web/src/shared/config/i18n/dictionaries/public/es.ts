import type { publicEn } from './en'

export const publicEs: typeof publicEn = {
  publicPage: {
    title: 'Hazte cliente',
    description: 'Deja tu nombre y una forma de contactarte.',
    notFound: {
      title: 'No hay ninguna página en esta dirección',
      description: 'Revisa el enlace con quien te lo dio: puede faltar una letra, o la página puede haberse movido.'
    },
    unavailable: 'No se pudo abrir esta página'
  },
  registration: {
    name: 'Tu nombre',
    contact: 'Cómo contactarte',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    contactHint: 'Basta con un correo o un teléfono.',
    submit: 'Enviar mis datos',
    received: '{{organization}} recibió tus datos. Si necesita algo más, te contactará.',
    errors: {
      nameRequired: 'Escribe tu nombre.',
      nameTooLong: 'Usa hasta {{max}} caracteres.',
      emailInvalid: 'Escribe una dirección de correo, como ada@example.com.',
      phoneTooLong: 'Usa hasta {{max}} caracteres.',
      contactRequired: 'Escribe un correo o un teléfono, para que puedan contactarte.'
    }
  }
}
