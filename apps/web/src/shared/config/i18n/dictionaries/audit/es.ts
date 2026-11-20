import type { auditEn } from './en'

export const auditEs: typeof auditEn = {
  activity: {
    title: 'Actividad',
    unavailable: 'No pudimos cargar la actividad. Revisa tu conexión y vuelve a intentarlo.',
    noAccess: {
      title: 'No puedes ver la actividad aquí',
      description: 'Tu rol en {{name}} no la incluye. Pídeselo a un propietario o a un administrador.'
    },
    section: {
      title: 'Cambios recientes',
      description: 'Quién cambió qué en {{name}}, lo más reciente primero. Se guarda un año.'
    },
    empty: {
      title: 'Todavía no hay cambios',
      description: 'Cuando alguien agregue o cambie un registro, aparecerá aquí con quién lo hizo y cuándo.'
    },
    actors: {
      formerMember: 'Alguien que ya no es miembro',
      visitor: 'Una visita, desde tu página pública',
      system: 'El sistema'
    },
    entries: {
      organization: {
        'export-requested': 'Pidió una exportación de los datos',
        'logo-changed': 'Cambió el logo',
        'logo-removed': 'Quitó el logo'
      },
      customer: {
        created: 'Agregó un cliente',
        updated: 'Editó un cliente',
        archived: 'Archivó un cliente',
        restored: 'Restauró un cliente',
        deleted: 'Eliminó un cliente'
      },
      subscription: {
        'checkout-started': 'Empezó a suscribirse a un plan',
        'checkout-abandoned': 'Abandonó una suscripción que no se pagó',
        activated: 'Empezó el plan de pago',
        renewed: 'Recibió el pago de un nuevo período',
        'upgrade-started': 'Empezó el cambio a un plan mayor, a la espera del pago',
        'upgrade-abandoned': 'Abandonó un cambio de plan que no se pagó',
        'plan-changed': 'Cambió el plan',
        'downgrade-scheduled': 'Programó un plan menor para el próximo período',
        'downgrade-withdrawn': 'Retiró el cambio a un plan menor',
        'payment-failed': 'Registró un pago como atrasado',
        'payment-recovered': 'Recibió el pago atrasado',
        'cancellation-scheduled': 'Programó el fin del plan',
        'cancellation-withdrawn': 'Retiró el fin del plan',
        cancelled: 'Terminó el plan'
      }
    },
    changed: '{{what}}: {{fields}}',
    fields: {
      organization: {},
      customer: { name: 'nombre', email: 'correo', phone: 'teléfono', company: 'empresa', notes: 'notas' },
      subscription: {
        status: 'estado',
        plan: 'plan',
        nextPlan: 'próximo plan',
        periodStartsAt: 'inicio del período',
        paidThrough: 'pagado hasta',
        pastDueSince: 'atrasado desde',
        cancelAtPeriodEnd: 'fin del plan',
        checkout: 'pago en curso'
      }
    },
    pager: {
      label: 'Páginas de la actividad',
      previous: 'Más recientes',
      next: 'Anteriores',
      page: 'Página {{page}}'
    }
  }
}
