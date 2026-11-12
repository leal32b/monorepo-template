import type { accountEn } from './en'

export const accountEs: typeof accountEn = {
  profile: {
    title: 'Perfil',
    details: {
      title: 'Tus datos',
      description: 'Cómo apareces en la app y en los correos que envía.',
      name: 'Nombre',
      email: 'Correo electrónico'
    }
  },
  accountDeletion: {
    title: 'Eliminar cuenta',
    description: 'Eliminar tu cuenta no se puede deshacer.',
    row: 'Eliminar tu cuenta',
    rowDescription: 'Tu cuenta, tus formas de iniciar sesión y tus membresías desaparecen para siempre.',
    open: 'Eliminar cuenta',
    loading: 'Revisando qué haría eliminar tu cuenta',
    unavailable: 'No pudimos revisar qué haría eliminar tu cuenta. Revisa tu conexión y vuelve a intentarlo.',
    blocked: {
      title: 'Solo tú eres propietario de {{name}}',
      description:
        'Tiene otros miembros. Haz propietario a uno de ellos, o elimina la organización, antes de eliminar tu cuenta.',
      go: 'Abrir miembros'
    },
    message: {
      account: 'Se eliminan tu cuenta, tus formas de iniciar sesión y tu verificación en dos pasos.',
      deleted: 'Las organizaciones en las que solo estás tú también se eliminan, con todo lo que tienen: {{names}}.',
      left: 'Sales de estas organizaciones: {{names}}.',
      final: 'No se puede deshacer.'
    },
    request: {
      intro: 'Enviaremos a {{email}} un enlace para confirmar.',
      submit: 'Enviarme el enlace',
      sent: 'Enviamos un enlace a {{email}}. Ábrelo en menos de 1 hora, donde hayas iniciado sesión, para eliminar tu cuenta.'
    },
    confirm: {
      title: 'Eliminar tu cuenta',
      description: 'El último paso: al pulsar el botón, tu cuenta deja de existir.',
      submit: 'Eliminar mi cuenta',
      expired: 'Este enlace venció o ya se usó. Pide uno nuevo en tu perfil.',
      profile: 'Ir a tu perfil'
    },
    errors: {
      blocked: 'Ahora solo tú eres propietario de una organización que compartes. Tu perfil muestra cómo seguir.'
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
  }
}
