export const en = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Home'
  },
  profile: {
    title: 'Profile',
    details: {
      title: 'Your details',
      description: 'How you appear in the app and in the emails it sends.',
      name: 'Name',
      email: 'Email'
    }
  },
  preferences: {
    title: 'Preferences',
    appearance: {
      title: 'Appearance',
      description: 'Saved in this browser.'
    },
    theme: {
      title: 'Theme',
      description: '"System" follows the light or dark setting of your device.',
      system: 'System',
      light: 'Light',
      dark: 'Dark'
    },
    language: {
      title: 'Language',
      description: 'Saved in this browser.',
      screens: 'Language of the screens',
      emails: 'Emails keep the language you signed up in.'
    }
  },
  /** Words that buttons share across screens. */
  actions: {
    cancel: 'Cancel'
  },
  account: {
    title: 'Security',
    unavailable: 'We could not load your account security. Check your connection, then try again.',
    retry: 'Try again',
    signIn: {
      title: 'Ways to sign in',
      description: 'How you get into your account.'
    },
    twoFactor: {
      title: 'Two-step verification',
      description: 'A second step when you sign in with a password.'
    },
    badge: {
      on: 'On',
      off: 'Off',
      notSetUp: 'Not set up',
      linked: 'Linked',
      notLinked: 'Not linked'
    },
    password: {
      title: 'Password',
      set: 'You sign in with your email and a password.',
      unset:
        'Your account has no password: you sign in with Google. A password lets you sign in with your email too, and turn on two-step verification.',
      change: 'Change password'
    },
    authenticator: {
      title: 'Authenticator app',
      on: 'Signing in with your password also asks for a code from your app.',
      off: 'Signing in asks only for your password. Turn it on so a stolen password is not enough: it will also ask for a code from an app on your phone.',
      needsPassword:
        'It protects signing in with a password, so it needs one first. Google protects your Google sign-ins.',
      turnOn: 'Turn on',
      turnOff: 'Turn off',
      enabled: 'Two-step verification is on.',
      enabledDone: 'Done: signing in with your password now also asks for a code from your app.',
      disabled: 'Done: signing in asks only for your password.',
      stepper: 'Turning on two-step verification',
      done: 'done',
      steps: {
        confirm: 'Confirm it is you',
        connect: 'Connect the app',
        save: 'Save the codes'
      }
    },
    backupCodes: {
      title: 'Backup codes',
      description: 'Each one signs you in once if you cannot use your app.',
      unavailable: 'Available once two-step verification is on.',
      newCodes: 'Get new codes',
      regenerated: 'Your new backup codes are ready. The old ones no longer work.',
      label: 'Backup codes',
      save: 'Save these backup codes. Each one signs you in once if you cannot use your app. They are shown only now.',
      copy: 'Copy',
      copied: 'Copied.',
      copyFailed: 'Could not copy. Download them, or select and copy them.',
      download: 'Download',
      file: 'Backup codes for {{email}} on {{app}}. Each one signs you in once.',
      saved: 'I saved them'
    },
    google: {
      title: 'Google',
      linked: 'You can also sign in with your Google account. You can unlink it and link it again at any time.',
      unlinked: 'Link it to sign in with your Google account too.',
      only: 'It is how you sign in, so it stays linked until you create a password.',
      unlinkedDone: 'Google was unlinked. You can link it again at any time.'
    }
  },
  changePassword: {
    current: 'Current password',
    next: 'New password',
    submit: 'Change password',
    signsOut: 'Changing it signs you out on your other devices.',
    changed: 'Your password was changed. Your other devices were signed out.'
  },
  createPassword: {
    why: 'A password lets you sign in with your email too, and turn on two-step verification.',
    send: 'Create a password',
    sent: 'We sent a link to {{email}} to create your password. It works for 1 hour.'
  },
  confirmPassword: {
    label: 'Your password',
    hint: 'To confirm it is you.'
  },
  enableTwoFactor: {
    setUp: 'Set up',
    scan: 'Scan this QR code with an authenticator app, such as Google Authenticator, Microsoft Authenticator or 1Password.',
    qr: 'QR code to add your account to an authenticator app',
    onThisPhone: 'On this phone?',
    openApp: 'Open it in your authenticator app',
    key: 'Or type this key in the app:',
    turnOn: 'Turn on'
  },
  disableTwoFactor: {
    what: 'Signing in asks only for your password again, and your backup codes stop working.',
    submit: 'Turn off two-step verification'
  },
  regenerateBackupCodes: {
    what: 'New codes replace the ones you have, which stop working.',
    submit: 'Get new codes'
  },
  linkGoogle: {
    submit: 'Link Google',
    errors: {
      cancelled: 'Google was not linked: you cancelled at Google.',
      otherEmail: 'That Google account has another email. Link the one with {{email}}.',
      otherUser: 'That Google account already signs in to another account here.',
      interrupted: 'Linking Google did not finish. Try again from this page.',
      failed: 'Google could not be linked. Try again in a moment.'
    }
  },
  unlinkGoogle: {
    submit: 'Unlink Google',
    stale: 'For your safety, sign in again before you unlink Google.',
    signInAgain: 'Sign in again'
  },
  notFound: {
    title: 'Page not found',
    description: 'The address may be wrong, or the page may have moved.',
    home: 'Go to the start'
  },
  appShell: {
    loading: 'Loading…',
    search: 'Search',
    palette: {
      title: 'Command palette',
      placeholder: 'Search screens and actions…',
      empty: 'Nothing matches. Try another word.',
      go: 'Go to',
      actions: 'Actions',
      theme: {
        system: 'Use the system theme',
        light: 'Use the light theme',
        dark: 'Use the dark theme'
      },
      keywords: {
        profile: 'account name email',
        security: 'password two-step verification authenticator backup codes google',
        preferences: 'appearance theme language',
        theme: 'appearance color dark light',
        signOut: 'log out logout leave'
      }
    },
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menu: 'Menu',
    breadcrumb: 'You are here',
    nav: {
      main: 'Main',
      home: 'Home',
      settings: 'Settings',
      back: 'Back to app',
      account: 'Your account',
      profile: 'Profile',
      security: 'Security',
      preferences: 'Preferences',
      organization: 'Organization',
      general: 'General',
      members: 'Members'
    },
    account: {
      settings: 'Settings',
      signOut: 'Sign out'
    },
    organizations: {
      label: 'Your organizations',
      create: 'Create organization'
    },
    status: {
      title: 'Service status',
      button: 'Service status: {{state}}',
      close: 'Close',
      checkAgain: 'Check again',
      checkedAt: 'Checked at {{time}}',
      reference: 'If it keeps happening, tell support: {{reference}}',
      state: {
        checking: 'Checking the service…',
        ok: 'All systems normal',
        degraded: 'Some features are not working',
        unreachable: 'Cannot reach the service',
        unexpected: 'The service is not working as it should',
        error: 'The service ran into a problem'
      }
    }
  },
  organizations: {
    create: {
      name: 'Organization name',
      submit: 'Create organization'
    },
    errors: {
      nameRequired: 'Enter a name for your organization.',
      nameTooLong: 'Use at most {{max}} characters.',
      limitReached: 'You belong to as many organizations as allowed. Leave one to create another.',
      slugRequired: 'Enter an address.',
      slugInvalid: 'Use lowercase letters, numbers and single hyphens, up to 48 characters.',
      slugReserved: 'This address is reserved. Choose another.',
      slugTaken: 'Another organization already uses this address. Choose another.',
      notAllowed: 'You no longer have permission to do this. Ask an owner of the organization.'
    },
    unavailable: {
      title: 'We could not load your organizations',
      description: 'Check your connection, then try again.',
      retry: 'Try again'
    }
  },
  invitations: {
    expires: 'Expires on {{date}}',
    accept: 'Accept',
    decline: 'Decline',
    acceptLabel: 'Accept invitation to {{organization}}',
    declineLabel: 'Decline invitation to {{organization}}',
    errors: {
      gone: 'This invitation expired or was withdrawn. Ask the person who invited you to send a new one.',
      full: 'This organization has reached its limit of members. Ask an owner to make room.'
    }
  },
  organizationGeneral: {
    title: 'General',
    details: {
      title: 'Organization',
      description: 'How your team sees and finds this organization.',
      readOnly: 'You can see these details. Owners and admins can change them.',
      name: {
        title: 'Name',
        change: 'Rename',
        label: 'Organization name',
        save: 'Save name',
        saved: 'Name saved'
      },
      address: {
        title: 'Address',
        change: 'Change address',
        label: 'Address',
        warning: 'Bookmarks and links that use the current address stop working once you change it.',
        save: 'Save address',
        saved: 'Address saved'
      }
    },
    delete: {
      title: 'Delete organization',
      description: 'For every member, this removes the organization and all it holds.',
      row: 'Delete this organization',
      rowDescription: 'This cannot be undone.',
      open: 'Delete organization',
      warning: 'This removes {{name}} and everything in it, for all its members. It cannot be undone.',
      label: 'Type the organization name to confirm',
      mismatch: 'The name does not match. Type it exactly as shown: {{name}}',
      submit: 'Delete organization',
      onlyOwner: 'Only an owner can delete the organization.'
    }
  },
  organizationMembers: {
    title: 'Members',
    unavailable: 'We could not load the members. Check your connection, then try again.',
    retry: 'Try again',
    section: {
      title: 'People',
      description: 'Everyone who can open {{name}}.',
      readOnly: 'Everyone who can open {{name}}. Owners and admins manage who is here.'
    },
    you: 'You',
    roles: {
      owner: 'Owner',
      admin: 'Admin',
      member: 'Member'
    },
    actions: {
      changeRole: 'Change role',
      remove: 'Remove',
      leave: 'Leave'
    },
    notes: {
      lastOwner: 'The only owner. Make someone else an owner before changing this role or leaving.',
      outranks: 'This person holds permissions you do not, so you cannot change or remove them.'
    },
    changeRole: {
      label: 'Role',
      cannotGive: 'A role marked here holds a permission you do not, so you cannot give it.',
      locked: '{{role}} (you cannot give this role)',
      save: 'Save role',
      saved: 'Role changed to {{role}}'
    },
    remove: {
      warning: 'Remove {{name}} from {{organization}}? They lose access right away.',
      submit: 'Remove member',
      removed: '{{name}} was removed'
    },
    leave: {
      warning: 'Leave {{organization}}? You lose access right away, and need a new invitation to come back.',
      submit: 'Leave organization'
    },
    errors: {
      notAllowed: 'You cannot do this with this person. Your role may have changed.',
      lastOwner: 'The organization needs an owner. Make someone else an owner first.',
      gone: 'This person is no longer a member. The list has been updated.'
    }
  },
  onboarding: {
    title: 'Name your organization',
    description: 'Your team works together in an organization.',
    invited: {
      title: 'You have been invited',
      description: 'Join a team that is already working together, or create your own organization.',
      invitations: 'Invitations',
      own: 'Or create your own organization'
    },
    unavailable: {
      title: 'We could not check your invitations',
      description: 'Check your connection, then try again.',
      retry: 'Try again'
    }
  },
  session: {
    unavailable: {
      title: 'We could not check your sign-in',
      description: 'Check your connection, then try again.',
      retry: 'Try again'
    }
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
      passwordRequired: 'Enter your password.',
      passwordWrong: 'This is not your current password.'
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
      sentTo: 'We sent a link to',
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
      wrongCredentials: 'The email or password is wrong. Check them and try again.',
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
    wait: 'Send link again in {{seconds}} s',
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
    expired: 'This link has expired or was already used. Each link works once and expires after 1 hour.',
    expiredTitle: 'This link no longer works',
    askAgain: 'Ask for a new link',
    changedMind: 'Changed your mind?',
    signIn: 'Sign in',
    done: {
      title: 'Password changed',
      description: 'Sign in with your new password.',
      signIn: 'Sign in'
    }
  },
  twoFactor: {
    title: 'Two-step verification',
    submit: 'Verify',
    notYou: 'Not your account?',
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
  serviceNotice: {
    title: 'The service is having trouble',
    hint: 'Signing in or creating an account may not work. Try again in a few minutes.'
  },
  entryLayout: {
    language: 'Language'
  },
  mail: {
    open: 'Open {{provider}}',
    newTab: ' (opens in a new tab)'
  },
  resendConfirmation: {
    send: 'Send it again',
    wait: 'Send it again in {{seconds}} s',
    sent: 'We sent it again. It can take a few minutes.'
  }
}

/** The shape every language must have: the English dictionary. */
export type Messages = typeof en
