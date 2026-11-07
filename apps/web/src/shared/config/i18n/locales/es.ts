import type { Messages } from './en'

export const es: Messages = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Inicio',
    empty: {
      title: 'Aún no hay nada aquí',
      description: 'Lo que haga {{name}} aparecerá aquí.'
    },
    gettingStarted: {
      title: 'Primeros pasos',
      description: 'Unos pasos para configurar {{name}}.',
      invite: {
        title: 'Invitar personas',
        description: 'Pide a tu equipo que se una a {{name}}.',
        go: 'Invitar personas'
      }
    }
  },
  profile: {
    title: 'Perfil',
    details: {
      title: 'Tus datos',
      description: 'Cómo apareces en la app y en los correos que envía.',
      name: 'Nombre',
      email: 'Correo electrónico'
    }
  },
  preferences: {
    title: 'Preferencias',
    appearance: {
      title: 'Apariencia',
      description: 'Guardado en este navegador.'
    },
    theme: {
      title: 'Tema',
      description: '«Sistema» sigue el modo claro u oscuro de tu dispositivo.',
      system: 'Sistema',
      light: 'Claro',
      dark: 'Oscuro'
    },
    language: {
      title: 'Idioma',
      description: 'Guardado en este navegador.',
      screens: 'Idioma de las pantallas',
      emails: 'Los correos siguen en el idioma con el que creaste tu cuenta.'
    }
  },
  /** Words that buttons share across screens. */
  actions: {
    cancel: 'Cancelar',
    retry: 'Intentar de nuevo'
  },
  account: {
    title: 'Seguridad',
    unavailable: 'No pudimos cargar la seguridad de tu cuenta. Revisa tu conexión y vuelve a intentarlo.',
    signIn: {
      title: 'Formas de iniciar sesión',
      description: 'Cómo entras a tu cuenta.'
    },
    twoFactor: {
      title: 'Verificación en dos pasos',
      description: 'Un segundo paso cuando inicias sesión con contraseña.'
    },
    badge: {
      on: 'Activada',
      off: 'Desactivada',
      notSetUp: 'Sin configurar',
      linked: 'Vinculada',
      notLinked: 'Sin vincular'
    },
    password: {
      title: 'Contraseña',
      set: 'Inicias sesión con tu correo y una contraseña.',
      unset:
        'Tu cuenta no tiene contraseña: inicias sesión con Google. Una contraseña te permite iniciar sesión también con tu correo y activar la verificación en dos pasos.',
      change: 'Cambiar contraseña'
    },
    authenticator: {
      title: 'App de autenticación',
      on: 'Al iniciar sesión con tu contraseña también se pide un código de tu app.',
      off: 'Al iniciar sesión solo se pide tu contraseña. Actívala para que una contraseña robada no baste: también se pedirá un código de una app en tu teléfono.',
      needsPassword:
        'Protege el inicio de sesión con contraseña, así que primero necesitas una. Google protege tus inicios de sesión con Google.',
      turnOn: 'Activar',
      turnOff: 'Desactivar',
      enabled: 'La verificación en dos pasos está activada.',
      enabledDone: 'Listo: al iniciar sesión con tu contraseña ahora también se pide un código de tu app.',
      disabled: 'Listo: al iniciar sesión solo se pide tu contraseña.',
      stepper: 'Activar la verificación en dos pasos',
      done: 'hecho',
      steps: {
        confirm: 'Confirma que eres tú',
        connect: 'Conecta la app',
        save: 'Guarda los códigos'
      }
    },
    backupCodes: {
      title: 'Códigos de respaldo',
      description: 'Cada uno te permite iniciar sesión una vez si no puedes usar tu app.',
      unavailable: 'Disponibles cuando la verificación en dos pasos esté activada.',
      newCodes: 'Obtener nuevos códigos',
      regenerated: 'Tus nuevos códigos de respaldo están listos. Los anteriores ya no sirven.',
      label: 'Códigos de respaldo',
      save: 'Guarda estos códigos de respaldo. Cada uno te permite iniciar sesión una vez si no puedes usar tu app. Solo se muestran ahora.',
      copy: 'Copiar',
      copied: 'Copiados.',
      copyFailed: 'No se pudo copiar. Descárgalos, o selecciónalos y cópialos.',
      download: 'Descargar',
      file: 'Códigos de respaldo de {{email}} en {{app}}. Cada uno te permite iniciar sesión una vez.',
      saved: 'Ya los guardé'
    },
    google: {
      title: 'Google',
      linked:
        'También puedes iniciar sesión con tu cuenta de Google. Puedes desvincularla y vincularla de nuevo cuando quieras.',
      unlinked: 'Vincúlala para iniciar sesión también con tu cuenta de Google.',
      only: 'Es como inicias sesión, así que sigue vinculada hasta que crees una contraseña.',
      unlinkedDone: 'Google se desvinculó. Puedes vincularla de nuevo cuando quieras.'
    }
  },
  changePassword: {
    current: 'Contraseña actual',
    next: 'Nueva contraseña',
    submit: 'Cambiar contraseña',
    signsOut: 'Al cambiarla se cierra tu sesión en tus otros dispositivos.',
    changed: 'Tu contraseña se cambió. Se cerró la sesión en tus otros dispositivos.'
  },
  createPassword: {
    why: 'Una contraseña también te permite iniciar sesión con tu correo y activar la verificación en dos pasos.',
    send: 'Crear una contraseña',
    sent: 'Enviamos un enlace a {{email}} para crear tu contraseña. Funciona durante 1 hora.'
  },
  confirmPassword: {
    label: 'Tu contraseña',
    hint: 'Para confirmar que eres tú.'
  },
  enableTwoFactor: {
    setUp: 'Configurar',
    scan: 'Escanea este código QR con una app de autenticación, como Google Authenticator, Microsoft Authenticator o 1Password.',
    qr: 'Código QR para agregar tu cuenta a una app de autenticación',
    onThisPhone: '¿En este teléfono?',
    openApp: 'Ábrelo en tu app de autenticación',
    key: 'O escribe esta clave en la app:',
    turnOn: 'Activar'
  },
  disableTwoFactor: {
    what: 'Al iniciar sesión solo se pedirá tu contraseña, y tus códigos de respaldo dejarán de servir.',
    submit: 'Desactivar la verificación en dos pasos'
  },
  regenerateBackupCodes: {
    what: 'Los códigos nuevos reemplazan a los que tienes, que dejarán de servir.',
    submit: 'Obtener códigos nuevos'
  },
  linkGoogle: {
    submit: 'Vincular Google',
    errors: {
      cancelled: 'No se vinculó Google: cancelaste en Google.',
      otherEmail: 'Esa cuenta de Google tiene otro correo. Vincula la de {{email}}.',
      otherUser: 'Esa cuenta de Google ya inicia sesión en otra cuenta de aquí.',
      interrupted: 'La vinculación con Google no terminó. Vuelve a intentarlo desde esta página.',
      failed: 'No se pudo vincular Google. Vuelve a intentarlo en un momento.'
    }
  },
  unlinkGoogle: {
    submit: 'Desvincular Google',
    stale: 'Por tu seguridad, vuelve a iniciar sesión antes de desvincular Google.',
    signInAgain: 'Volver a iniciar sesión'
  },
  notFound: {
    title: 'Página no encontrada',
    description: 'Puede que la dirección esté mal, o que la página se haya movido.',
    organization:
      'Las páginas de una organización de la que no formas parte se ven así. Si era una de ellas, pide una invitación a alguien de allí.',
    home: 'Ir al inicio'
  },
  appShell: {
    loading: 'Cargando…',
    slow: 'Está tardando más de lo normal. Si la app estaba inactiva, el servidor puede tardar hasta un minuto en despertar.',
    search: 'Buscar',
    palette: {
      title: 'Paleta de comandos',
      placeholder: 'Busca pantallas y acciones…',
      empty: 'Nada coincide. Prueba con otra palabra.',
      go: 'Ir a',
      actions: 'Acciones',
      theme: {
        system: 'Usar el tema del sistema',
        light: 'Usar el tema claro',
        dark: 'Usar el tema oscuro'
      },
      keywords: {
        general: 'organización nombre dirección eliminar',
        members: 'personas equipo invitar quitar rol',
        roles: 'permisos acceso',
        create: 'organización nueva equipo',
        profile: 'cuenta nombre correo',
        security: 'contraseña dos pasos verificación autenticador códigos respaldo google',
        preferences: 'apariencia tema idioma',
        theme: 'apariencia color oscuro claro',
        signOut: 'salir cerrar sesión desconectar'
      }
    },
    openMenu: 'Abrir el menú',
    closeMenu: 'Cerrar el menú',
    menu: 'Menú',
    breadcrumb: 'Estás aquí',
    nav: {
      main: 'Principal',
      home: 'Inicio',
      settings: 'Ajustes',
      back: 'Volver a la app',
      account: 'Tu cuenta',
      profile: 'Perfil',
      security: 'Seguridad',
      preferences: 'Preferencias',
      organization: 'Organización',
      general: 'General',
      members: 'Miembros',
      roles: 'Roles',
      customers: 'Clientes'
    },
    account: {
      settings: 'Ajustes',
      signOut: 'Cerrar sesión'
    },
    organizations: {
      label: 'Tus organizaciones',
      create: 'Crear organización'
    }
  },
  organizations: {
    create: {
      name: 'Nombre de la organización',
      submit: 'Crear organización'
    },
    errors: {
      nameRequired: 'Escribe un nombre para tu organización.',
      nameTooLong: 'Usa como máximo {{max}} caracteres.',
      limitReached: 'Perteneces al máximo de organizaciones permitido. Sal de una para crear otra.',
      slugRequired: 'Escribe una dirección.',
      slugInvalid: 'Usa letras minúsculas, números y guiones simples, hasta 48 caracteres.',
      slugReserved: 'Esta dirección está reservada. Elige otra.',
      slugTaken: 'Otra organización ya usa esta dirección. Elige otra.',
      notAllowed: 'Ya no tienes permiso para hacerlo. Pídeselo a un propietario de la organización.'
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
      label: 'Buscar',
      hint: 'Nombre, correo o empresa.',
      submit: 'Buscar'
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
  },
  session: {
    unavailable: {
      title: 'No pudimos comprobar tu sesión',
      description: 'Revisa tu conexión y vuelve a intentarlo.'
    }
  },
  failure: {
    network: 'No pudimos conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.',
    rateLimited: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
    unexpected: 'Algo salió mal de nuestro lado. Vuelve a intentarlo en un momento.',
    reference: 'Si sigue pasando, avisa a soporte: {{reference}}'
  },
  auth: {
    name: 'Nombre',
    email: 'Correo electrónico',
    password: 'Contraseña',
    showPassword: 'Mostrar contraseña',
    newPasswordHint: 'Al menos {{min}} caracteres.',
    errors: {
      nameRequired: 'Escribe tu nombre.',
      emailInvalid: 'Escribe una dirección de correo, como ada@example.com.',
      passwordTooShort: 'Usa al menos {{min}} caracteres.',
      passwordTooLong: 'Usa como máximo {{max}} caracteres.',
      passwordCompromised: 'Esta contraseña apareció en una filtración de datos. Elige otra.',
      passwordRequired: 'Escribe tu contraseña.',
      passwordWrong: 'Esta no es tu contraseña actual.'
    }
  },
  signUp: {
    title: 'Crea tu cuenta',
    description: 'Te toma menos de un minuto.',
    submit: 'Crear cuenta',
    haveAccount: '¿Ya tienes una cuenta?',
    signIn: 'Iniciar sesión',
    checkEmail: {
      title: 'Revisa tu correo',
      description: 'Confirma tu dirección para terminar.',
      sentTo: 'Enviamos un enlace a',
      notThere: '¿No está en tu bandeja de entrada? Revisa el spam, o envíalo de nuevo.',
      wrongAddress: '¿Dirección equivocada?',
      useAnother: 'Usar otro correo'
    }
  },
  signIn: {
    title: 'Iniciar sesión',
    description: 'Te damos la bienvenida de nuevo.',
    submit: 'Iniciar sesión',
    noAccount: '¿Primera vez por aquí?',
    forgot: '¿Olvidaste tu contraseña?',
    signUp: 'Crear una cuenta',
    errors: {
      wrongCredentials: 'El correo o la contraseña no son correctos. Revísalos y vuelve a intentarlo.',
      unconfirmed: 'Primero confirma tu correo: abre el enlace que enviamos al crear tu cuenta, o envíalo de nuevo.',
      linkExpired: 'Este enlace de confirmación venció. Inicia sesión y podrás pedir uno nuevo.'
    },
    google: {
      or: 'o',
      continue: 'Continuar con Google',
      errors: {
        cancelled: 'Se canceló el inicio de sesión con Google. Vuelve a intentarlo, o inicia sesión con tu correo.',
        unverified:
          'Google no ha confirmado esta dirección de correo. Confírmala con Google, o inicia sesión con tu correo.',
        notLinked:
          'Este correo ya tiene una cuenta sin confirmar. Abre el enlace que le enviamos y vuelve a probar con Google.',
        interrupted: 'El inicio de sesión con Google no terminó. Vuelve a intentarlo desde esta página.',
        failed: 'No funcionó el inicio de sesión con Google. Vuelve a intentarlo en un momento.'
      }
    }
  },
  forgotPassword: {
    wait: 'Enviar el enlace de nuevo en {{seconds}} s',
    title: 'Restablece tu contraseña',
    description: 'Te enviaremos un enlace por correo.',
    submit: 'Enviar enlace',
    sent: 'Si una cuenta usa {{email}}, le enviamos un enlace. Funciona durante 1 hora; revisa el spam si no llega.',
    remembered: '¿Ya la recordaste?',
    signIn: 'Iniciar sesión'
  },
  resetPassword: {
    title: 'Elige una nueva contraseña',
    description: 'Esto cierra tu sesión en todos los demás lugares.',
    password: 'Nueva contraseña',
    submit: 'Cambiar contraseña',
    expired: 'Este enlace venció o ya se usó. Cada enlace funciona una vez, durante 1 hora.',
    expiredTitle: 'Este enlace ya no sirve',
    askAgain: 'Pedir un enlace nuevo',
    changedMind: '¿Cambiaste de opinión?',
    signIn: 'Iniciar sesión',
    done: {
      title: 'Contraseña cambiada',
      description: 'Inicia sesión con tu nueva contraseña.',
      signIn: 'Iniciar sesión'
    }
  },
  twoFactor: {
    title: 'Verificación en dos pasos',
    submit: 'Verificar',
    notYou: '¿No es tu cuenta?',
    signInAgain: 'Volver a iniciar sesión',
    app: {
      description: 'Abre tu app de autenticación.',
      code: 'Código de 6 dígitos',
      other: '¿Perdiste el acceso a tu app?',
      switch: 'Usar un código de respaldo'
    },
    backup: {
      description: 'Usa uno de los códigos que guardaste.',
      code: 'Código de respaldo',
      other: '¿Tienes tu app?',
      switch: 'Usar el código de la app'
    },
    errors: {
      codeInvalid: 'Escribe los 6 dígitos que muestra tu app.',
      codeWrong: 'Este código no es correcto. Escribe el que muestra tu app ahora.',
      backupInvalid: 'Escribe un código de respaldo tal como lo guardaste, como a8Kd2-Xm9Qz.',
      backupWrong: 'Este código de respaldo no es correcto, o ya se usó. Cada uno funciona una vez.',
      expired: 'Este inicio de sesión venció. Vuelve a iniciar sesión para obtener un código nuevo.',
      locked: 'Demasiados códigos incorrectos. Por tu seguridad, espera 15 minutos y vuelve a iniciar sesión.'
    }
  },
  entryLayout: {
    language: 'Idioma'
  },
  mail: {
    open: 'Abrir {{provider}}',
    newTab: ' (se abre en una pestaña nueva)'
  },
  resendConfirmation: {
    wait: 'Enviarlo de nuevo en {{seconds}} s',
    send: 'Enviarlo de nuevo',
    sent: 'Lo enviamos de nuevo. Puede tardar unos minutos.'
  }
}
