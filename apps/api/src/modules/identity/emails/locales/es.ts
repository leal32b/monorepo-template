import type { EmailTexts } from './en'

export const es: EmailTexts = {
  confirmEmail: {
    subject: 'Confirma tu correo electrónico',
    body: 'Confirma tu dirección de correo electrónico para terminar de crear tu cuenta.',
    action: 'Confirmar correo electrónico',
    footer: 'El enlace vence en 1 hora. Si no creaste una cuenta, ignora este correo.'
  },
  resetPassword: {
    subject: 'Restablece tu contraseña',
    body: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Elige una nueva contraseña con el enlace de abajo.',
    action: 'Elegir una nueva contraseña',
    footer: 'El enlace vence en 1 hora. Si no lo pediste, ignora este correo: tu contraseña sigue igual.'
  },
  alreadyRegistered: {
    subject: 'Alguien intentó registrarse con tu correo electrónico',
    body: 'Alguien intentó crear una cuenta con esta dirección de correo electrónico, que ya tiene una. Si fuiste tú, inicia sesión o restablece tu contraseña.',
    action: 'Iniciar sesión',
    footer: 'Si no fuiste tú, ignora este correo: nada cambió en tu cuenta.'
  }
}
