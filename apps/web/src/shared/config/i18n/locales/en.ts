export const en = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Monorepo template'
  },
  apiStatus: {
    checking: 'Checking the API…',
    up: 'The API is up: {{service}} at {{timestamp}}',
    degraded: 'The API is up, but its database is not answering.',
    unreachable: 'Cannot reach the API.',
    unexpected: 'The API answered something unexpected.',
    error: 'The API answered an error.',
    errorWithCode: 'The API answered an error ({{code}}).',
    unknown: 'Something went wrong.',
    checkAgain: 'Check again'
  },
  /** What a screen says about a failed call it has no better words for. */
  failure: {
    network: 'We could not reach the server. Check your connection and try again.',
    rateLimited: 'Too many attempts. Wait a minute, then try again.',
    unexpected: 'Something went wrong on our side. Try again in a moment.',
    reference: 'If it keeps happening, tell support: {{reference}}'
  },
  /** Words every entry screen shares, so a field is called the same everywhere. */
  auth: {
    name: 'Name',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show password',
    newPasswordHint: 'At least {{min}} characters.',
    errors: {
      nameRequired: 'Enter your name.',
      emailInvalid: 'Enter an email address, like ada@example.com.',
      passwordTooShort: 'Use at least {{min}} characters.',
      passwordTooLong: 'Use at most {{max}} characters.',
      passwordCompromised: 'This password has appeared in a data breach. Choose a different one.',
      passwordRequired: 'Enter your password.'
    }
  },
  signUp: {
    title: 'Create your account',
    description: 'It takes less than a minute.',
    submit: 'Create account',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    checkEmail: {
      title: 'Check your email',
      description: 'Confirm your address to finish.',
      sentTo: 'We sent a link to {{email}}.',
      notThere: 'Not in your inbox? Check spam, or send it again.',
      wrongAddress: 'Wrong address?',
      useAnother: 'Use another email'
    }
  },
  signIn: {
    title: 'Sign in',
    description: 'Welcome back.',
    submit: 'Sign in',
    noAccount: 'New here?',
    signUp: 'Create an account',
    errors: {
      wrongCredentials: 'The email or the password is wrong. Check them and try again.',
      unconfirmed: 'Confirm your email first: open the link we sent when you signed up, or send it again.'
    },
    google: {
      or: 'or',
      continue: 'Continue with Google',
      errors: {
        cancelled: 'Signing in with Google was cancelled. Try again, or sign in with your email.',
        unverified: 'Google has not confirmed this email address. Confirm it with Google, or sign in with your email.',
        notLinked:
          'This email already has an account that is not confirmed. Open the link we sent to it, then try Google again.',
        interrupted: 'Signing in with Google did not finish. Try again from this page.',
        failed: 'Signing in with Google did not work. Try again in a moment.'
      }
    }
  },
  resendConfirmation: {
    send: 'Send it again',
    sent: 'We sent it again. It can take a few minutes.'
  }
}

/** The shape every language must have: the English dictionary. */
export type Messages = typeof en
