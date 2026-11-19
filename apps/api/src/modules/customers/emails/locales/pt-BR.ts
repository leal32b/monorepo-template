import type { CustomersEmailTexts } from './en'

export const ptBR: CustomersEmailTexts = {
  customerRegistered: {
    subject: 'Novo cliente: {name}',
    body: '{name} se cadastrou como cliente de {organization} pela página pública em {day}. Os dados estão na lista de clientes, marcados como criados por um visitante.',
    action: 'Ver clientes',
    footer:
      'Você recebe este email porque é dono de {organization}. Se não conhece essa pessoa, arquive ou exclua o cliente.'
  }
}
