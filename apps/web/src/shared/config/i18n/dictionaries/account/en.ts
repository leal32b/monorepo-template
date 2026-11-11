export const accountEn = {
  profile: {
    title: 'Profile',
    details: {
      title: 'Your details',
      description: 'How you appear in the app and in the emails it sends.',
      name: 'Name',
      email: 'Email'
    }
  },
  accountDeletion: {
    title: 'Delete account',
    description: 'Deleting your account cannot be undone.',
    row: 'Delete your account',
    rowDescription: 'Your account, how you sign in and your memberships go for good.',
    open: 'Delete account',
    loading: 'Checking what deleting your account would do',
    unavailable: 'We could not check what deleting your account would do. Check your connection, then try again.',
    blocked: {
      title: 'You are the only owner of {{name}}',
      description:
        'It has other members. Make one of them an owner, or delete the organization, before you delete your account.',
      go: 'Open members'
    },
    message: {
      account: 'Your account, how you sign in and your two-step verification are deleted.',
      deleted: 'Organizations where you are the only member go too, with everything in them: {{names}}.',
      left: 'You leave these organizations: {{names}}.',
      final: 'It cannot be undone.'
    },
    request: {
      intro: 'We will email {{email}} a link to confirm.',
      submit: 'Email me the link',
      sent: 'We sent a link to {{email}}. Open it within 1 hour, where you are signed in, to delete your account.'
    },
    confirm: {
      title: 'Delete your account',
      description: 'The last step: once you press the button, your account is gone.',
      submit: 'Delete my account',
      expired: 'This link has expired or was already used. Ask for a new one in your profile.',
      profile: 'Go to your profile'
    },
    errors: {
      blocked: 'You are now the only owner of an organization you share. Your profile shows the way out.'
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
  account: {
    title: 'Security',
    unavailable: 'We could not load your account security. Check your connection, then try again.',
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
  }
}
