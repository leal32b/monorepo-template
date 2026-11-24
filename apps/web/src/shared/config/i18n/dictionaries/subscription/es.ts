import type { subscriptionEn } from './en'

export const subscriptionEs: typeof subscriptionEn = {
  subscription: {
    plans: { basic: 'Básico', pro: 'Pro' },
    trial: 'Prueba',
    actions: { plans: 'Ver planes', pay: 'Pagar ahora', keep: 'Mantener el plan' },
    limitReached: {
      'customers.max': {
        owner:
          'Tu plan permite {{limit}} clientes activos. Elige un plan mayor, o archiva los clientes que ya no atiendes.',
        upgrading:
          'Tu plan permite {{limit}} clientes activos. El cambio a {{plan}} empieza cuando se confirme su pago.',
        member:
          'El plan de esta organización permite {{limit}} clientes activos. Archivar los clientes que ya no se atienden libera espacio; un propietario puede elegir un plan mayor.'
      }
    },
    readOnly: {
      owner: 'La organización es de solo lectura hasta que se pague un plan. No se eliminó nada.',
      member: 'Esta organización es de solo lectura hasta que un propietario pague. Todavía puedes verlo todo.',
      note: 'Solo lectura hasta que se pague el plan'
    },
    notice: {
      owner: {
        trialEnding:
          'Tu prueba termina el {{date}}. Elige un plan para seguir agregando y cambiando registros. No se elimina nada.',
        trialEnded:
          'Tu prueba terminó el {{date}}. La organización es de solo lectura: todos pueden ver y eliminar, nadie puede agregar ni cambiar. Elige un plan para volver a editar. No se eliminó nada.',
        endScheduled: 'Tu plan termina el {{date}}. Después la organización queda de solo lectura.',
        pastDue:
          'No recibimos el pago con vencimiento el {{due}}. Paga antes del {{until}} para seguir editando. No se elimina nada.',
        pastDueReadOnly:
          'La organización es de solo lectura desde el {{until}} porque no se recibió el pago con vencimiento el {{due}}. Paga para volver a editar. No se eliminó nada.',
        ended:
          'Tu plan terminó el {{date}}. La organización es de solo lectura. Elige un plan para volver a editar. No se eliminó nada.',
        endedUndated:
          'Tu plan terminó. La organización es de solo lectura. Elige un plan para volver a editar. No se eliminó nada.'
      },
      member: {
        trialEnding:
          'La prueba de esta organización termina el {{date}}. Después queda de solo lectura hasta que un propietario elija un plan.',
        trialEnded:
          'Esta organización es de solo lectura desde el {{date}}, hasta que un propietario elija un plan. Todavía puedes verlo todo.',
        endScheduled: 'El plan de esta organización termina el {{date}}. Después queda de solo lectura.',
        pastDue:
          'El pago de esta organización está atrasado. Desde el {{until}} es de solo lectura hasta que un propietario pague.',
        pastDueReadOnly:
          'Esta organización es de solo lectura desde el {{until}}, hasta que un propietario pague. Todavía puedes verlo todo.',
        ended:
          'Esta organización es de solo lectura desde el {{date}}, hasta que un propietario elija un plan. Todavía puedes verlo todo.',
        endedUndated:
          'Esta organización es de solo lectura hasta que un propietario elija un plan. Todavía puedes verlo todo.'
      }
    }
  }
}
