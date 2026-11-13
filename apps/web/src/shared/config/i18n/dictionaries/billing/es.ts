import type { billingEn } from './en'

export const billingEs: typeof billingEn = {
  billing: {
    title: 'Plan y facturación',
    unavailable: 'No pudimos cargar el plan. Revisa tu conexión y vuelve a intentarlo.',
    plans: { basic: 'Básico', pro: 'Pro' },
    trial: 'Prueba',
    price: '{{price}} al mes',
    limits: {
      'customers.max': { some: 'Hasta {{count}} clientes activos', none: 'Clientes sin límite' }
    },
    capabilities: { 'activity-log': 'Registro de actividad' },
    actions: {
      plans: 'Ver planes',
      pay: 'Pagar ahora',
      keep: 'Mantener el plan',
      open: 'Abrir el pago',
      continue: 'Continuar al pago'
    },
    current: {
      title: 'Tu plan',
      memberTitle: 'Plan de {{name}}',
      description: 'Lo que {{name}} paga, y hasta cuándo.',
      memberDescription: 'Solo un propietario de {{name}} puede elegir, cambiar o pagar el plan.',
      badges: { trial: 'Prueba', active: 'Activo', late: 'Pago atrasado', readOnly: 'Solo lectura' },
      trial: 'Prueba gratuita hasta el {{date}} ({{days}}).',
      trialEnded: 'La prueba terminó el {{date}}.',
      paid: '{{price}}. Pagado hasta el {{date}}.',
      late: '{{price}}. No se recibió el pago con vencimiento el {{due}}.',
      ended: 'El plan terminó el {{date}}.',
      endedUndated: 'El plan terminó.'
    },
    checkout: {
      upgrade: 'Cambiar a {{plan}}',
      subscription: 'Suscribirse a {{plan}}',
      waiting:
        'Esperando el pago de {{amount}}. {{plan}} empieza en cuanto se confirme: una tarjeta en segundos, Pix en minutos, un boleto en hasta tres días hábiles.',
      cancelUpgrade: 'Cancelar el cambio',
      cancelSubscription: 'Cancelar el pago',
      cancelled: {
        upgrade: 'El cambio a {{plan}} se canceló. Sigues en {{current}}, y no se cobró nada.',
        subscription: 'El pago de {{plan}} se canceló. No se cobró nada.'
      }
    },
    downgrade: {
      title: 'Cambia a {{plan}} el {{date}}',
      description: 'Mantienes {{current}} hasta entonces. No se reembolsa nada.',
      keep: 'Mantener {{plan}}',
      kept: 'Mantienes {{plan}}. Nada cambia.'
    },
    end: {
      title: 'Termina el {{date}}',
      description: 'Después la organización queda de solo lectura. No se elimina nada.',
      kept: 'Tu plan continúa. Nada cambia.'
    },
    late: {
      title: 'Pago atrasado',
      checkout:
        'El proveedor no tiene una página para el pago atrasado, así que una nueva suscripción a {{plan}} lo reemplaza: pagas {{price}} ahora y luego cada mes.',
      pastDue: 'Paga antes del {{until}} para seguir editando. No se elimina nada.',
      readOnly: 'La organización es de solo lectura desde el {{until}}. Paga para volver a editar. No se eliminó nada.'
    },
    cancel: {
      action: 'Cancelar el plan',
      description: 'El plan termina cuando acaba el período pagado.',
      message:
        'Tu plan sigue pagado hasta el {{date}}. Después la organización queda de solo lectura: no se elimina nada, y puedes mantener el plan hasta entonces.',
      messageUndated:
        'El plan termina cuando acaba el período pagado. Después la organización queda de solo lectura: no se elimina nada, y puedes mantener el plan hasta entonces.',
      done: 'Tu plan termina cuando acaba el período pagado. Puedes mantenerlo hasta entonces.'
    },
    reference: 'Referencia para soporte',
    managers: {
      title: 'Quién gestiona el plan',
      unknown: 'Un propietario de {{name}}'
    },
    catalogue: {
      title: 'Planes',
      description: 'Elige el plan que le sirve a {{name}}. Los precios son mensuales.',
      memberDescription: 'Lo que incluye cada plan.',
      current: 'Plan actual',
      choose: 'Elegir {{plan}}',
      notes: {
        late: 'Paga primero lo atrasado.',
        ending: 'Mantén el plan primero, luego cámbialo.',
        open: 'Paga o cancela primero el pago abierto.'
      },
      subscribe: 'Pagas {{price}} ahora y luego cada mes. {{plan}} empieza en cuanto se confirme el pago.',
      upgrade:
        'Pagas {{amount}} ahora por lo que queda del período ({{days}}); desde el {{date}}, {{price}} al mes. {{plan}} empieza en cuanto se confirme el pago.',
      freeUpgrade:
        '{{plan}} empieza ahora. No hay nada que pagar por lo que queda del período ({{days}}); desde el {{date}} cuesta {{price}} al mes.',
      downgrade:
        '{{plan}} empieza el {{date}}, cuando acaba el período pagado. Mantienes {{current}} hasta entonces, y no se reembolsa nada.',
      method: 'Cómo pagar',
      methodHint: 'Una tarjeta se confirma en segundos, Pix en minutos, un boleto en hasta tres días hábiles.',
      methods: { card: 'Tarjeta', pix: 'Pix', boleto: 'Boleto' },
      change: 'Cambiar a {{plan}}',
      changed: 'Ahora estás en {{plan}}.',
      scheduled: '{{plan}} empieza el {{date}}.'
    },
    returned: {
      waiting: 'Confirmando tu pago con el proveedor…',
      confirmed: 'Tu pago se confirmó. Estás en {{plan}}.',
      late: 'El proveedor aún no confirmó el pago. Un boleto o Pix puede tardar: {{plan}} empieza en cuanto llegue la confirmación, y puedes seguir trabajando.',
      notPaid: {
        upgrade: 'El cambio a {{plan}} no se pagó. Sigues en {{current}}, y no se cobró nada.',
        subscription: 'El pago de {{plan}} no se completó. No se cobró nada.'
      },
      cancelled: 'Pago no completado. No se cobró nada.'
    },
    errors: {
      changed:
        'El plan cambió desde que se leyó esta página. Ahora muestra lo más reciente: revísalo y vuelve a intentarlo.',
      checkoutOpen: 'Ya hay un pago abierto para otro plan. Págalo o cancélalo primero.',
      checkoutPaid: 'Este pago ya se hizo. El plan cambia en cuanto el proveedor lo confirme.',
      notActive: 'Todavía no hay un plan pagado que cambiar. Elige un plan primero.',
      cancellationScheduled: 'El plan está programado para terminar. Mantén el plan primero, luego cámbialo.',
      paymentOverdue: 'Hay un pago atrasado. Págalo primero, luego cambia el plan.',
      wrongDirection:
        'El plan cambió desde que se leyó esta página, y esta elección ahora funciona de otra forma. Vuelve a elegir.',
      unavailable: 'El proveedor de pagos no responde. No se cambió nada: vuelve a intentarlo en un momento.',
      notAllowed: 'Solo un propietario puede gestionar el plan.'
    },
    refusals: {
      limits: {
        'customers.max': {
          owner:
            'Tu plan permite {{limit}} clientes activos. Elige un plan mayor, o archiva los clientes que ya no atiendes.',
          upgrading:
            'Tu plan permite {{limit}} clientes activos. El cambio a {{plan}} empieza cuando se confirme su pago.',
          member:
            'El plan de esta organización permite {{limit}} clientes activos. Archivar los clientes que ya no se atienden libera espacio; un propietario puede elegir un plan mayor.'
        }
      },
      capabilities: {
        'activity-log': {
          title: 'El registro de actividad no está en tu plan',
          description:
            'Viene con {{plans}}. La actividad se registra en todos los planes y aparece aquí cuando el plan la incluya.'
        }
      },
      capabilityMember: 'Un propietario puede cambiar el plan.',
      readOnly: {
        owner: 'La organización es de solo lectura hasta que se pague un plan. No se eliminó nada.',
        member: 'Esta organización es de solo lectura hasta que un propietario pague. Todavía puedes verlo todo.',
        note: 'Solo lectura hasta que se pague el plan'
      }
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
