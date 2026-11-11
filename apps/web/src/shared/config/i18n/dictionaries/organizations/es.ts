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
  },
  invitations: {
    expires: 'Vence el {{date}}',
    open: 'Ver invitación',
    errors: {
      full: 'Esta organización llegó a su límite de miembros. Pide a un propietario que haga espacio.'
    }
  },
  organizationGeneral: {
    title: 'General',
    details: {
      title: 'Organización',
      description: 'Cómo tu equipo ve y encuentra esta organización.',
      readOnly: 'Puedes ver estos datos. Los propietarios y administradores pueden cambiarlos.',
      name: {
        title: 'Nombre',
        change: 'Cambiar nombre',
        label: 'Nombre de la organización',
        save: 'Guardar nombre',
        saved: 'Nombre guardado'
      },
      address: {
        title: 'Dirección',
        change: 'Cambiar dirección',
        label: 'Dirección',
        warning: 'Los marcadores y enlaces que usan la dirección actual dejarán de funcionar al cambiarla.',
        save: 'Guardar dirección',
        saved: 'Dirección guardada'
      }
    },
    regional: {
      title: 'Hora y moneda',
      description: 'Cómo se muestran fechas, horas e importes para todos en esta organización.',
      readOnly: 'Puedes ver estos ajustes. Los propietarios y administradores pueden cambiarlos.',
      timeZone: {
        title: 'Zona horaria',
        now: '{{zone}} · ahora {{time}}',
        change: 'Cambiar zona horaria',
        label: 'Zona horaria',
        hint: 'Las fechas y horas guardadas conservan su momento y se muestran en la nueva zona.',
        save: 'Guardar zona horaria',
        saved: 'Zona horaria guardada'
      },
      currency: {
        title: 'Moneda',
        example: '{{currency}} · {{amount}}',
        change: 'Cambiar moneda',
        label: 'Moneda',
        hint: 'Los importes nuevos la usan. Los ya guardados conservan su propia moneda.',
        save: 'Guardar moneda',
        saved: 'Moneda guardada'
      }
    },
    delete: {
      title: 'Eliminar organización',
      description: 'Para todos los miembros, esto elimina la organización y todo lo que contiene.',
      row: 'Eliminar esta organización',
      rowDescription: 'No se puede deshacer.',
      open: 'Eliminar organización',
      warning: 'Esto elimina {{name}} y todo lo que contiene, para todos sus miembros. No se puede deshacer.',
      label: 'Escribe el nombre de la organización para confirmar',
      mismatch: 'El nombre no coincide. Escríbelo tal como aparece: {{name}}',
      submit: 'Eliminar organización',
      onlyOwner: 'Solo un propietario puede eliminar la organización.'
    }
  },
  organizationMembers: {
    title: 'Miembros',
    unavailable: 'No pudimos cargar los miembros. Revisa tu conexión y vuelve a intentarlo.',
    section: {
      title: 'Personas',
      description: 'Todas las personas que pueden abrir {{name}}.',
      readOnly:
        'Todas las personas que pueden abrir {{name}}. Los propietarios y administradores gestionan quién está aquí.'
    },
    you: 'Tú',
    roles: {
      owner: 'Propietario',
      admin: 'Administrador',
      member: 'Miembro'
    },
    actions: {
      changeRole: 'Cambiar rol',
      remove: 'Quitar',
      leave: 'Salir de la organización'
    },
    notes: {
      lastOwner:
        'Nadie más es propietario de esta organización. Nombra a otra persona propietaria antes de cambiar este rol o salir.',
      outranks: 'Esta persona tiene permisos que tú no tienes, así que no puedes cambiarla ni quitarla.'
    },
    changeRole: {
      label: 'Rol',
      cannotGive: 'Un rol marcado aquí tiene un permiso que tú no tienes, así que no puedes darlo.',
      locked: '{{role}} (no puedes dar este rol)',
      save: 'Guardar rol',
      saved: 'Rol cambiado a {{role}}'
    },
    remove: {
      warning: '¿Quitar a {{name}} de {{organization}}? Pierde el acceso de inmediato.',
      submit: 'Quitar miembro',
      removed: 'Se quitó a {{name}}'
    },
    leave: {
      warning:
        '¿Salir de {{organization}}? Pierdes el acceso de inmediato y necesitarás una invitación nueva para volver.',
      submit: 'Salir de la organización'
    },
    errors: {
      notAllowed: 'No puedes hacer esto con esta persona. Puede que tu rol haya cambiado.',
      lastOwner: 'La organización necesita un propietario. Nombra primero a otra persona propietaria.',
      gone: 'Esta persona ya no es miembro. La lista se actualizó.'
    }
  },
  organizationRoles: {
    title: 'Roles',
    unavailable: 'No pudimos cargar los roles. Revisa tu conexión y vuelve a intentarlo.',
    builtIn: {
      title: 'Roles integrados',
      description: 'Toda organización tiene estos tres. No se pueden cambiar.',
      badge: 'Integrado',
      readOnly: 'Los roles integrados no se pueden cambiar.'
    },
    custom: {
      title: 'Roles de {{name}}',
      description: 'Los roles propios agrupan permisos para dar a miembros e invitaciones.',
      create: {
        title: 'Crear rol',
        description: 'Elige qué pueden hacer las personas que lo tengan.',
        open: 'Crear rol'
      }
    },
    summary: '{{count}} de {{total}} permisos',
    actions: {
      view: 'Ver permisos',
      edit: 'Editar',
      delete: 'Eliminar'
    },
    notes: {
      heldBy: 'Lo tienen {{who}}. Dales otro rol antes de renombrar o eliminar este rol.',
      more: '+{{count}} más',
      invited: '{{email}} (invitado)',
      exceeds: 'Este rol tiene permisos que tú no tienes, así que solo puedes verlo.'
    },
    resources: {
      organization: 'Organización',
      member: 'Miembros',
      invitation: 'Invitaciones',
      ac: 'Roles',
      customer: 'Clientes'
    },
    permissions: {
      organization: {
        update: 'Cambiar el nombre y la dirección',
        delete: 'Eliminar la organización'
      },
      member: {
        create: 'Añadir miembros',
        update: 'Cambiar los roles de los miembros',
        delete: 'Quitar miembros'
      },
      invitation: {
        create: 'Invitar personas',
        cancel: 'Cancelar invitaciones'
      },
      ac: {
        create: 'Crear roles',
        read: 'Ver roles',
        update: 'Editar roles',
        delete: 'Eliminar roles'
      },
      customer: {
        read: 'Ver clientes',
        create: 'Añadir clientes',
        update: 'Editar clientes',
        delete: 'Eliminar clientes'
      }
    },
    form: {
      name: 'Nombre del rol',
      nameHint: 'Letras minúsculas, números y guiones simples, hasta 32 caracteres.',
      permissions: 'Permisos',
      notHeld: 'No tienes este permiso.',
      ownerOnly: 'Solo el rol de propietario tiene este permiso.',
      renameLocked:
        'Hay miembros o invitaciones con este rol, así que no se puede renombrar. Sus permisos sí se pueden cambiar.',
      create: 'Crear rol',
      save: 'Guardar rol',
      close: 'Cerrar',
      created: 'Rol {{role}} creado',
      saved: 'Rol {{role}} guardado'
    },
    remove: {
      warning: '¿Eliminar el rol {{role}}? Nadie lo tiene, así que nadie pierde acceso.',
      submit: 'Eliminar rol',
      deleted: 'Rol {{role}} eliminado'
    },
    errors: {
      nameRequired: 'Escribe un nombre para el rol.',
      nameInvalid: 'Usa letras minúsculas, números y guiones simples, hasta 32 caracteres.',
      nameBuiltIn: 'Propietario, administrador y miembro son roles integrados. Elige otro nombre.',
      nameTaken: 'Esta organización ya tiene un rol con este nombre. Elige otro.',
      noPermission: 'Elige al menos un permiso.',
      tooMany: 'Esta organización tiene todos los roles permitidos. Elimina uno para crear otro.',
      notAllowed: 'No puedes hacer esto con este rol. Puede que tu rol haya cambiado.',
      inUse: 'Ahora hay miembros o invitaciones con este rol. Dales otro rol primero.',
      gone: 'Este rol ya no existe. La lista se actualizó.'
    }
  },
  organizationInvitations: {
    section: {
      title: 'Invitaciones',
      description: 'Personas invitadas a {{name}} que aún no han respondido.',
      empty: 'No hay invitaciones pendientes.'
    },
    unavailable: 'No pudimos cargar las invitaciones. Revisa tu conexión y vuelve a intentarlo.',
    invite: {
      title: 'Invitar personas',
      description: 'Reciben un correo con un enlace para unirse a {{name}}.',
      open: 'Invitar personas'
    },
    form: {
      email: 'Correo electrónico',
      role: 'Rol',
      cannotGive: 'Un rol marcado aquí tiene un permiso que tú no tienes, así que no puedes darlo.',
      locked: '{{role}} (no puedes dar este rol)',
      send: 'Enviar invitación',
      sent: 'Invitación enviada a {{email}}'
    },
    row: {
      resend: 'Reenviar',
      resent: 'Invitación enviada de nuevo a {{email}}',
      revoke: 'Revocar',
      revoked: 'Invitación a {{email}} revocada'
    },
    errors: {
      alreadyMember: 'Esta persona ya es miembro.',
      notAllowed: 'No puedes invitar con este rol. Puede que tu rol haya cambiado.',
      limit: 'Esta organización tiene todas las invitaciones pendientes permitidas. Revoca una para enviar otra.',
      tooMany: 'Enviaste muchas invitaciones en poco tiempo. Espera un minuto y vuelve a intentarlo.',
      gone: 'Esta invitación ya no está pendiente. La lista se actualizó.'
    }
  },
  invitation: {
    pending: {
      title: 'Invitación a {{organization}}',
      description: '{{inviter}} te invitó. La invitación está abierta hasta el {{date}}.',
      accept: 'Aceptar invitación',
      decline: 'Rechazar'
    },
    signedInAs: 'Iniciaste sesión como {{email}}.',
    switchAccount: 'Usar otra cuenta',
    accepted: {
      title: 'Ya estás en {{organization}}',
      description: 'Ya aceptaste esta invitación.',
      open: 'Abrir {{organization}}'
    },
    used: {
      title: 'Esta invitación ya se usó',
      description:
        'Te uniste a {{organization}} con ella y ya no eres miembro. Pide a {{inviter}} que te invite de nuevo.'
    },
    expired: {
      title: 'Esta invitación caducó',
      description: 'Las invitaciones duran 7 días. Pide a {{inviter}} que te envíe una nueva.'
    },
    declined: {
      title: 'Rechazaste esta invitación',
      description: '¿Cambiaste de idea? Pide a {{inviter}} que te invite de nuevo.'
    },
    withdrawn: {
      title: 'Esta invitación fue retirada',
      description:
        'Puede que {{inviter}} te haya enviado una más reciente: busca el último correo sobre {{organization}}. Si no hay ninguno, pregunta a {{inviter}}.'
    },
    notFound: {
      title: 'No encontramos esta invitación',
      description:
        'Puede que el enlace esté incompleto. Ábrelo de nuevo desde el correo, o pide a quien te invitó una nueva.'
    },
    otherAccount: {
      title: 'Esta invitación es para otra dirección',
      description: 'Iniciaste sesión como {{email}}. Inicia sesión con la dirección a la que se envió la invitación.',
      switch: 'Iniciar sesión con otra cuenta'
    },
    unavailable: {
      title: 'No pudimos abrir esta invitación',
      description: 'Revisa tu conexión e inténtalo de nuevo.'
    },
    continue: 'Continuar a la app'
  },
  onboarding: {
    title: 'Ponle nombre a tu organización',
    description: 'Tu equipo trabaja junto en una organización.',
    another: {
      title: 'Crear organización',
      description: 'Otra organización, con sus propias personas y roles.',
      unavailable: 'No pudimos revisar tus invitaciones. Revisa tu conexión e inténtalo de nuevo.'
    },
    invited: {
      title: 'Tienes invitaciones',
      description: 'Únete a un equipo que ya trabaja junto, o crea tu propia organización.',
      invitations: 'Invitaciones',
      own: 'O crea tu propia organización'
    },
    unavailable: {
      title: 'No pudimos revisar tus invitaciones',
      description: 'Revisa tu conexión e inténtalo de nuevo.'
    }
  }
}
