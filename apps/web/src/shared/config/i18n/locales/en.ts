export const en = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Monorepo template'
  },
  account: {
    title: 'Account security',
    unavailable: 'We could not load your account security. Check your connection, then try again.',
    retry: 'Try again',
    password: {
      title: 'Password',
      set: 'You sign in with your email and a password.',
      unset: 'Your account has no password: you sign in with Google.'
    },
    twoFactor: {
      title: 'Two-step verification',
      on: 'On: signing in with your password also asks for a code from your authenticator app.',
      off: 'Off: signing in asks only for your password.',
      needsPassword:
        'It protects signing in with a password, so it needs one first. Google protects your Google sign-ins.'
    }
  },
  appShell: {
    signedInAs: 'Signed in as {{name}}',
    signOut: 'Sign out'
  },
  session: {
    unavailable: {
      title: 'We could not check your sign-in',
      description: 'Check your connection, then try again.',
      retry: 'Try again'
    }
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
    forgot: 'Forgot your password?',
    signUp: 'Create an account',
    errors: {
      wrongCredentials: 'The email or the password is wrong. Check them and try again.',
      unconfirmed: 'Confirm your email first: open the link we sent when you signed up, or send it again.',
      linkExpired: 'This confirmation link has expired. Sign in, and you can ask for a new one.'
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
  forgotPassword: {
    title: 'Reset your password',
    description: 'We will email you a link.',
    submit: 'Send link',
    sent: 'If an account uses {{email}}, we sent it a link. It works for 1 hour; check spam if it does not arrive.',
    remembered: 'Remembered it?',
    signIn: 'Sign in'
  },
  resetPassword: {
    title: 'Choose a new password',
    description: 'This signs you out everywhere else.',
    password: 'New password',
    submit: 'Change password',
    expired: 'This link has expired or was already used. Each link works once, for 1 hour.',
    askAgain: 'Ask for a new link',
    done: {
      title: 'Password changed',
      description: 'Sign in with your new password.',
      signIn: 'Sign in'
    }
  },
  twoFactor: {
    title: 'Two-step verification',
    submit: 'Verify',
    signInAgain: 'Sign in again',
    app: {
      description: 'Open your authenticator app.',
      code: '6-digit code',
      other: 'Lost access to your app?',
      switch: 'Use a backup code'
    },
    backup: {
      description: 'Use one of the codes you saved.',
      code: 'Backup code',
      other: 'Have your app?',
      switch: 'Use the code from the app'
    },
    errors: {
      codeInvalid: 'Enter the 6 digits your app shows.',
      codeWrong: 'This code is not right. Enter the one your app shows now.',
      backupInvalid: 'Enter a backup code as you saved it, like a8Kd2-Xm9Qz.',
      backupWrong: 'This backup code is not right, or it was already used. Each one works once.',
      expired: 'This sign-in has expired. Sign in again to get a new code.',
      locked: 'Too many wrong codes. For your safety, wait 15 minutes, then sign in again.'
    }
  },
  resendConfirmation: {
    send: 'Send it again',
    sent: 'We sent it again. It can take a few minutes.'
  }
}

/** The shape every language must have: the English dictionary. */
export type Messages = typeof en
