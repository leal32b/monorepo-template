import type { BillingEmailTexts } from './en'

export const es: BillingEmailTexts = {
  trialEnding: {
    subject: 'La prueba de {organization} termina en {days} días',
    body: 'La prueba de {organization} termina el {trialEnds}. Elige un plan para seguir añadiendo y cambiando registros; después de ese día la organización queda en solo lectura hasta que se elija un plan. No se elimina nada.',
    action: 'Ver planes',
    footer: 'Recibes este correo porque eres propietario de {organization}. Si ya elegiste un plan, ignóralo.'
  },
  paymentFailed: {
    subject: 'No hemos recibido el pago de {organization}',
    body: 'No hemos recibido el pago de {organization} con vencimiento el {dueDay}. Paga antes del {payBy} para seguir añadiendo y cambiando registros; después de ese día la organización queda en solo lectura hasta el pago. No se elimina nada.',
    action: 'Pagar ahora',
    footer:
      'Si acabas de pagar, ignora este correo: un boleto puede tardar hasta 3 días hábiles en acreditarse. Recibes este correo porque eres propietario de {organization}.'
  }
}
