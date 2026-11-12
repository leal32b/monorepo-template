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
      customer: {
        created: 'Agregó un cliente',
        updated: 'Editó un cliente',
        archived: 'Archivó un cliente',
        restored: 'Restauró un cliente',
        deleted: 'Eliminó un cliente'
      }
    },
    changed: '{{what}}: {{fields}}',
    fields: {
      customer: { name: 'nombre', email: 'correo', phone: 'teléfono', company: 'empresa', notes: 'notas' }
    },
    pager: {
      label: 'Páginas de la actividad',
      previous: 'Más recientes',
      next: 'Anteriores',
      page: 'Página {{page}}'
    }
  }
}
