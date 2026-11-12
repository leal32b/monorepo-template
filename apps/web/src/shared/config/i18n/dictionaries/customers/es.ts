import type { customersEn } from './en'

export const customersEs: typeof customersEn = {
  customers: {
    title: 'Clientes',
    unavailable: 'No pudimos cargar tus clientes. Revisa tu conexión y vuelve a intentarlo.',
    noAccess: {
      title: 'No puedes ver los clientes aquí',
      description: 'Tu rol en {{name}} no los incluye. Pídelo a un propietario o a un administrador.'
    },
    section: {
      title: 'Clientes',
      description: 'Las personas y empresas con las que trabaja {{name}}.',
      readOnly: 'Las personas y empresas con las que trabaja {{name}}. Puedes verlas, no cambiarlas.'
    },
    search: {
      label: 'Buscar clientes',
      submit: 'Filtrar'
    },
    filter: {
      label: 'Mostrar',
      active: 'Activos',
      archived: 'Archivados'
    },
    add: {
      title: 'Añadir cliente',
      description: 'Guarda sus datos y notas en un solo lugar.',
      go: 'Añadir'
    },
    actions: {
      edit: 'Editar',
      archive: 'Archivar',
      restore: 'Restaurar',
      delete: 'Eliminar'
    },
    archivedBadge: 'Archivado',
    empty: {
      title: 'Aún no hay clientes',
      description: 'Los clientes que añadas aparecerán aquí.',
      archivedTitle: 'Nada archivado',
      archivedDescription: 'Un cliente que archives espera aquí hasta que lo restaures o lo elimines.',
      noResultsTitle: 'No se encontró ningún cliente',
      noResults: 'Ningún cliente coincide con “{{search}}”. Revisa la ortografía o busca con menos.'
    },
    form: {
      name: 'Nombre',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      company: 'Empresa',
      notes: 'Notas',
      create: 'Añadir cliente',
      save: 'Guardar cambios'
    },
    errors: {
      nameRequired: 'Escribe el nombre del cliente.',
      nameTooLong: 'Usa hasta {{max}} caracteres.',
      emailInvalid: 'Escribe un correo como ana@example.com.',
      phoneTooLong: 'Usa hasta {{max}} caracteres.',
      companyTooLong: 'Usa hasta {{max}} caracteres.',
      notesTooLong: 'Usa hasta {{max}} caracteres.',
      emailTaken: 'Otro cliente ya tiene este correo.',
      gone: 'Este cliente ya no existe. La lista ya está al día.',
      notAllowed: 'Tu rol no permite esto.',
      changed: 'Alguien cambió antes a este cliente. La lista ya está al día.'
    },
    saved: 'Se guardó {{name}}.',
    archive: {
      archived: 'Se archivó {{name}}. Puedes restaurarlo desde la lista de archivados.',
      restored: '{{name}} vuelve a estar activo.'
    },
    remove: {
      warning: '¿Eliminar a {{name}} para siempre? Sus datos y notas no se pueden recuperar.',
      submit: 'Eliminar cliente',
      removed: 'Se eliminó {{name}}.'
    },
    pager: {
      previous: 'Anterior',
      next: 'Siguiente',
      page: 'Página {{page}} de {{pages}}'
    }
  }
}
