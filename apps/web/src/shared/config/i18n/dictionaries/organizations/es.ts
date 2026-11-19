import type { organizationsEn } from './en'

export const organizationsEs: typeof organizationsEn = {
  organizations: {
    create: {
      name: 'Nombre de la organización',
      submit: 'Crear organización',
      timeZone: 'Zona horaria',
      timeZoneHint: 'Las fechas y horas se muestran en esta zona para todos.',
      currency: 'Moneda',
      currencyHint: 'Los importes nuevos usan esta moneda. Puedes cambiar ambas después.'
    },
    errors: {
      nameRequired: 'Escribe un nombre para tu organización.',
      nameTooLong: 'Usa como máximo {{max}} caracteres.',
      limitReached: 'Perteneces al máximo de organizaciones permitido. Sal de una para crear otra.',
      slugRequired: 'Escribe una dirección.',
      slugInvalid: 'Usa letras minúsculas, números y guiones simples, hasta 48 caracteres.',
      slugReserved: 'Esta dirección está reservada. Elige otra.',
      slugTaken: 'Otra organización ya usa esta dirección. Elige otra.',
      notAllowed: 'Ya no tienes permiso para hacerlo. Pídeselo a un propietario de la organización.',
      invalidTimeZone: 'Elige una zona horaria de la lista.',
      invalidCurrency: 'Elige una moneda de la lista.'
    },
    unavailable: {
      title: 'No pudimos cargar tus organizaciones',
      description: 'Revisa tu conexión y vuelve a intentarlo.'
    }
  }
}
