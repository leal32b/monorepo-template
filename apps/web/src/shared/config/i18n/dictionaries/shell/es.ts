import type { shellEn } from './en'

export const shellEs: typeof shellEn = {
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
  /** Words that buttons share across screens. */
  actions: {
    cancel: 'Cancelar',
    retry: 'Intentar de nuevo'
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
        customers: 'clientes contactos personas empresas',
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
  session: {
    unavailable: {
      title: 'No pudimos comprobar tu sesión',
      description: 'Revisa tu conexión y vuelve a intentarlo.'
    }
  },
  failure: {
    network: 'No pudimos conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.',
    rateLimited: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
    rateLimitedFor: 'Demasiados intentos desde esta conexión. Vuelve a intentarlo en {{wait}}.',
    unexpected: 'Algo salió mal de nuestro lado. Vuelve a intentarlo en un momento.',
    reference: 'Si sigue pasando, avisa a soporte: {{reference}}'
  }
}
