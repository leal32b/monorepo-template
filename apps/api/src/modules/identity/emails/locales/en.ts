export const en = {
  confirmEmail: {
    subject: 'Confirm your email address',
    body: 'Confirm your email address to finish creating your account.',
    action: 'Confirm email address',
    footer: 'The link expires in 1 hour. If you did not create an account, ignore this email.'
  },
  resetPassword: {
    subject: 'Reset your password',
    body: 'We got a request to reset the password of your account. Choose a new password with the link below.',
    action: 'Choose a new password',
    footer: 'The link expires in 1 hour. If you did not ask for it, ignore this email: your password stays the same.'
  },
  alreadyRegistered: {
    subject: 'Someone tried to sign up with your email',
    body: 'Someone tried to create an account with this email address, which already has one. If it was you, sign in or reset your password.',
    action: 'Sign in',
    footer: 'If it was not you, ignore this email: nothing changed in your account.'
  }
}

/** The shape every language must have: the English texts. */
export type EmailTexts = typeof en
