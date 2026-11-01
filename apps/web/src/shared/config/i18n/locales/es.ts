import type { Messages } from './en'

export const es: Messages = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Plantilla de monorepo'
  },
  account: {
    title: 'Seguridad de la cuenta',
    unavailable: 'No pudimos cargar la seguridad de tu cuenta. Revisa tu conexión y vuelve a intentarlo.',
    retry: 'Intentar de nuevo',
    password: {
      title: 'Contraseña',
      set: 'Inicias sesión con tu correo y una contraseña.',
      unset: 'Tu cuenta no tiene contraseña: inicias sesión con Google.'
    },
    twoFactor: {
      title: 'Verificación en dos pasos',
      on: 'Activada: al iniciar sesión con tu contraseña también se pide un código de tu app de autenticación.',
      off: 'Desactivada: al iniciar sesión solo se pide tu contraseña.',
      needsPassword:
        'Protege el inicio de sesión con contraseña, así que primero necesitas una. Google protege tus inicios de sesión con Google.',
      why: 'Actívala para que una contraseña robada no baste: al iniciar sesión también se pedirá un código de una app en tu teléfono.',
      enabled: 'La verificación en dos pasos está activada.',
      regenerated: 'Tus nuevos códigos de respaldo están listos. Los anteriores ya no sirven.',
      newCodes: 'Obtener nuevos códigos de respaldo',
      turnOff: 'Desactivar'
    },
    backupCodes: {
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
      linked: 'Vinculada: también puedes iniciar sesión con tu cuenta de Google.',
      unlinked: 'Sin vincular: vincúlala para iniciar sesión también con tu cuenta de Google.',
      only: 'Vinculada: es como inicias sesión, así que sigue vinculada hasta que crees una contraseña.'
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
    home: 'Ir al inicio'
  },
  appShell: {
    openMenu: 'Abrir el menú',
    closeMenu: 'Cerrar el menú',
    menu: 'Menú',
    breadcrumb: 'Estás aquí',
    nav: {
      main: 'Principal',
      home: 'Inicio'
    },
    account: {
      settings: 'Ajustes',
      signOut: 'Cerrar sesión'
    },
    status: {
      title: 'Estado del servicio',
      button: 'Estado del servicio: {{state}}',
      close: 'Cerrar',
      checkAgain: 'Comprobar de nuevo',
      checkedAt: 'Comprobado a las {{time}}',
      reference: 'Si sigue pasando, díselo a soporte: {{reference}}',
      state: {
        checking: 'Comprobando el servicio…',
        ok: 'Todo funciona con normalidad',
        degraded: 'Algunas funciones no funcionan',
        unreachable: 'No se puede conectar con el servicio',
        unexpected: 'El servicio respondió algo inesperado',
        error: 'El servicio respondió con un error'
      }
    }
  },
  session: {
    unavailable: {
      title: 'No pudimos comprobar tu sesión',
      description: 'Revisa tu conexión y vuelve a intentarlo.',
      retry: 'Intentar de nuevo'
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
      sentTo: 'Enviamos un enlace a {{email}}.',
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
  resendConfirmation: {
    send: 'Enviarlo de nuevo',
    sent: 'Lo enviamos de nuevo. Puede tardar unos minutos.'
  }
}
