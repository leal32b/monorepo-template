import type { backOfficeEn } from './en'

export const backOfficeEs: typeof backOfficeEn = {
  backOffice: {
    name: 'Back office',
    /** The banner of an operator's visit, over every screen: fetched with it, never by another user. */
    banner: {
      title: 'Estás viendo {{name}} como lo ve su dueño',
      description: 'Solo lectura: nada de lo que hagas aquí la cambia. Tu visita termina el {{time}}.',
      leave: 'Salir',
      leaveFailed: 'No se pudo salir. Revisa tu conexión e inténtalo de nuevo.'
    },
    nav: {
      label: 'Back office',
      organizations: 'Organizaciones',
      users: 'Usuarios',
      app: 'Volver a la app'
    },
    unavailable: 'No pudimos cargar el back office. Revisa tu conexión e inténtalo de nuevo.',
    refused: {
      title: 'Vuelve a iniciar sesión para abrir el back office',
      'two-factor': 'Tu cuenta no tiene verificación en dos pasos. Actívala en Seguridad y vuelve a iniciar sesión.',
      'sign-in-method': 'Tu cuenta también inicia sesión con Google, que no pide código. Desvincúlalo en Seguridad.',
      'sign-in-again':
        'El back office pide un inicio de sesión con contraseña y código en las últimas 12 horas, después de ser operador.',
      action: 'Iniciar sesión de nuevo'
    },
    status: {
      trialing: 'Prueba',
      active: 'Activa',
      past_due: 'Pago atrasado',
      cancelled: 'Terminada',
      readOnly: 'Solo lectura'
    },
    organizations: {
      title: 'Organizaciones',
      search: 'Buscar por nombre, dirección o correo del dueño',
      section: {
        title: 'Todas las organizaciones',
        description: 'Las más nuevas primero. Abre una para ver su estado y entrar como la ve su dueño.'
      },
      row: {
        owner: '{{name}} · {{email}}',
        noOwner: 'Sin dueño',
        details: '/{{slug}} · {{members}} · creada el {{date}}',
        members: '{{count}} miembros',
        oneMember: '1 miembro'
      },
      open: 'Abrir',
      empty: {
        title: 'Aún no hay organizaciones',
        description: 'Las organizaciones aparecen aquí a medida que se crean.',
        noResultsTitle: 'No se encontró nada',
        noResults: 'Ninguna organización coincide con «{{search}}».'
      }
    },
    organization: {
      title: 'Organización',
      unavailable: 'No pudimos cargar esta organización. Revisa tu conexión e inténtalo de nuevo.',
      notFound: 'Ninguna organización tiene esta dirección. Puede haber sido eliminada.',
      state: {
        title: 'Estado',
        description: 'Qué es la organización y qué le permite su plan ahora.',
        address: 'Dirección',
        plan: 'Plan',
        noPlan: 'Aún no eligió un plan',
        created: 'Creada el',
        settings: 'Zona horaria y moneda'
      },
      enter: {
        section: 'Acceso',
        title: 'Verla como la ve su dueño',
        description:
          'Solo lectura, durante 30 minutos. Su registro de actividad anota cuándo entras y sales, con tu nombre.',
        go: 'Entrar',
        active: 'Estás dentro de otra organización. Sal de ella primero.',
        failed: 'No se pudo entrar. Revisa tu conexión e inténtalo de nuevo.'
      },
      members: {
        title: 'Miembros',
        description: 'Quién pertenece a ella, los más antiguos primero.',
        joined: '{{role}} · se unió el {{date}}'
      }
    },
    users: {
      title: 'Usuarios',
      search: 'Buscar por correo o nombre',
      section: {
        title: 'Todos los usuarios',
        description: 'Los más nuevos primero, con sus organizaciones.'
      },
      row: {
        lastSignIn: 'último inicio de sesión el {{date}}',
        never: 'sin inicio de sesión en 30 días',
        twoFactor: 'Dos pasos activo',
        noOrganization: 'Ninguna organización'
      },
      empty: {
        title: 'Aún no hay usuarios',
        description: 'Las personas aparecen aquí a medida que se registran.',
        noResultsTitle: 'No se encontró nada',
        noResults: 'Ningún usuario coincide con «{{search}}».'
      }
    }
  }
}
