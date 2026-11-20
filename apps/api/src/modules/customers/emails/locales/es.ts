import type { CustomersEmailTexts } from './en'

export const es: CustomersEmailTexts = {
  customerRegistered: {
    subject: 'Nuevo cliente: {name}',
    body: '{name} se registró como cliente de {organization} en su página pública el {day}. Sus datos están en la lista de clientes, marcados como creados por un visitante.',
    action: 'Ver clientes',
    footer:
      'Recibes este correo porque eres propietario de {organization}. Si no conoces a esta persona, archiva o elimina el cliente.'
  }
}
