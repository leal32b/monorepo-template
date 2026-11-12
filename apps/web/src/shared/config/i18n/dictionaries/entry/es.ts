import type { entryEn } from './en'

export const entryEs: typeof entryEn = {
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
    accountDeleted: 'Tu cuenta fue eliminada.',
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
