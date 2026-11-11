export const en = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Home',
    empty: {
      title: 'Nothing here yet',
      description: 'What {{name}} works on will show up here.'
    },
    gettingStarted: {
      title: 'Getting started',
      description: 'A few steps to set up {{name}}.',
      invite: {
        title: 'Invite people',
        description: 'Ask your team to join {{name}}.',
        go: 'Invite people'
      }
    }
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
  /** Words that buttons share across screens. */
  actions: {
    cancel: 'Cancel',
    retry: 'Try again'
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
  },
  notFound: {
    title: 'Page not found',
    description: 'The address may be wrong, or the page may have moved.',
    organization:
      'Pages of an organization you are not in look the same. If this was one, ask someone there to invite you.',
    home: 'Go to the start'
  },
  appShell: {
    loading: 'Loading…',
    slow: 'This is taking longer than usual. If the app was idle, the server may need up to a minute to wake up.',
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
        general: 'organization name address delete',
        members: 'people team invite remove role',
        roles: 'permissions access',
        customers: 'clients contacts people companies',
        create: 'organization new team',
        profile: 'account name email',
        security: 'password two-step verification authenticator backup codes google',
        preferences: 'appearance theme language',
        theme: 'appearance color dark light',
        signOut: 'log out logout'
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
      members: 'Members',
      roles: 'Roles',
      customers: 'Customers'
    },
    account: {
      settings: 'Settings',
      signOut: 'Sign out'
    },
    organizations: {
      label: 'Your organizations',
      create: 'Create organization'
    }
  },
  organizations: {
    create: {
      name: 'Organization name',
      submit: 'Create organization',
      timeZone: 'Time zone',
      timeZoneHint: 'Dates and times show in this zone for everyone.',
      currency: 'Currency',
      currencyHint: 'New amounts use this currency. You can change both later.'
    },
    errors: {
      nameRequired: 'Enter a name for your organization.',
      nameTooLong: 'Use at most {{max}} characters.',
      limitReached: 'You belong to as many organizations as allowed. Leave one to create another.',
      slugRequired: 'Enter an address.',
      slugInvalid: 'Use lowercase letters, numbers and single hyphens, up to 48 characters.',
      slugReserved: 'This address is reserved. Choose another.',
      slugTaken: 'Another organization already uses this address. Choose another.',
      notAllowed: 'You no longer have permission to do this. Ask an owner of the organization.',
      invalidTimeZone: 'Choose a time zone from the list.',
      invalidCurrency: 'Choose a currency from the list.'
    },
    unavailable: {
      title: 'We could not load your organizations',
      description: 'Check your connection, then try again.'
    }
  },
  invitations: {
    expires: 'Expires on {{date}}',
    open: 'View invitation',
    errors: {
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
    regional: {
      title: 'Time and money',
      description: 'How dates, times and amounts appear for everyone in this organization.',
      readOnly: 'You can see these settings. Owners and admins can change them.',
      timeZone: {
        title: 'Time zone',
        now: '{{zone}} · now {{time}}',
        change: 'Change time zone',
        label: 'Time zone',
        hint: 'Saved dates and times keep their moment and show in the new zone.',
        save: 'Save time zone',
        saved: 'Time zone saved'
      },
      currency: {
        title: 'Currency',
        example: '{{currency}} · {{amount}}',
        change: 'Change currency',
        label: 'Currency',
        hint: 'New amounts use it. Amounts already saved keep their own currency.',
        save: 'Save currency',
        saved: 'Currency saved'
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
      leave: 'Leave organization'
    },
    notes: {
      lastOwner: 'No one else owns this organization. Make someone else an owner before changing this role or leaving.',
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
  organizationRoles: {
    title: 'Roles',
    unavailable: 'We could not load the roles. Check your connection, then try again.',
    builtIn: {
      title: 'Built-in roles',
      description: 'Every organization has these three. They cannot be changed.',
      badge: 'Built in',
      readOnly: 'Built-in roles cannot be changed.'
    },
    custom: {
      title: 'Roles of {{name}}',
      description: 'Roles of your own group permissions to give to members and invitations.',
      create: {
        title: 'Create role',
        description: 'Choose what the people who hold it may do.',
        open: 'Create role'
      }
    },
    summary: '{{count}} of {{total}} permissions',
    actions: {
      view: 'View permissions',
      edit: 'Edit',
      delete: 'Delete'
    },
    notes: {
      heldBy: 'Held by {{who}}. Give them another role before renaming or deleting this role.',
      more: '+{{count}} more',
      invited: '{{email}} (invited)',
      exceeds: 'This role holds permissions you do not, so you can only view it.'
    },
    resources: {
      organization: 'Organization',
      member: 'Members',
      invitation: 'Invitations',
      ac: 'Roles',
      customer: 'Customers'
    },
    permissions: {
      organization: {
        update: 'Change the name and the address',
        delete: 'Delete the organization'
      },
      member: {
        create: 'Add members',
        update: 'Change members’ roles',
        delete: 'Remove members'
      },
      invitation: {
        create: 'Invite people',
        cancel: 'Cancel invitations'
      },
      ac: {
        create: 'Create roles',
        read: 'See roles',
        update: 'Edit roles',
        delete: 'Delete roles'
      },
      customer: {
        read: 'See customers',
        create: 'Add customers',
        update: 'Edit customers',
        delete: 'Delete customers'
      }
    },
    form: {
      name: 'Role name',
      nameHint: 'Lowercase letters, numbers and single hyphens, up to 32 characters.',
      permissions: 'Permissions',
      notHeld: 'You do not hold this permission.',
      ownerOnly: 'Only the owner role holds this permission.',
      renameLocked: 'Members or invitations hold this role, so it cannot be renamed. Its permissions can change.',
      create: 'Create role',
      save: 'Save role',
      close: 'Close',
      created: 'Role {{role}} created',
      saved: 'Role {{role}} saved'
    },
    remove: {
      warning: 'Delete the role {{role}}? Nobody holds it, so no one loses access.',
      submit: 'Delete role',
      deleted: 'Role {{role}} deleted'
    },
    errors: {
      nameRequired: 'Enter a name for the role.',
      nameInvalid: 'Use lowercase letters, numbers and single hyphens, up to 32 characters.',
      nameBuiltIn: 'Owner, admin and member are built in. Choose another name.',
      nameTaken: 'This organization already has a role with this name. Choose another.',
      noPermission: 'Choose at least one permission.',
      tooMany: 'This organization has as many roles as allowed. Delete one to create another.',
      notAllowed: 'You cannot do this with this role. Your role may have changed.',
      inUse: 'Members or invitations hold this role now. Give them another role first.',
      gone: 'This role no longer exists. The list has been updated.'
    }
  },
  customers: {
    title: 'Customers',
    unavailable: 'We could not load your customers. Check your connection, then try again.',
    noAccess: {
      title: 'You cannot see customers here',
      description: 'Your role in {{name}} does not include them. Ask an owner or an admin.'
    },
    section: {
      title: 'Customers',
      description: 'The people and companies {{name}} works with.',
      readOnly: 'The people and companies {{name}} works with. You can see them, not change them.'
    },
    search: {
      label: 'Search customers',
      submit: 'Find'
    },
    filter: {
      label: 'Show',
      active: 'Active',
      archived: 'Archived'
    },
    add: {
      title: 'Add customer',
      description: 'Keep their details and notes in one place.',
      go: 'Add'
    },
    actions: {
      edit: 'Edit',
      archive: 'Archive',
      restore: 'Restore',
      delete: 'Delete'
    },
    archivedBadge: 'Archived',
    empty: {
      title: 'No customers yet',
      description: 'The customers you add show up here.',
      archivedTitle: 'Nothing archived',
      archivedDescription: 'A customer you archive waits here until you restore or delete it.',
      noResultsTitle: 'No customer found',
      noResults: 'No customer matches “{{search}}”. Check the spelling or search for less.'
    },
    form: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      notes: 'Notes',
      create: 'Add customer',
      save: 'Save changes'
    },
    errors: {
      nameRequired: 'Enter the customer’s name.',
      nameTooLong: 'Use up to {{max}} characters.',
      emailInvalid: 'Enter an email like ana@example.com.',
      phoneTooLong: 'Use up to {{max}} characters.',
      companyTooLong: 'Use up to {{max}} characters.',
      notesTooLong: 'Use up to {{max}} characters.',
      emailTaken: 'Another customer already has this email.',
      gone: 'This customer no longer exists. The list is up to date now.',
      notAllowed: 'Your role does not allow this.',
      changed: 'Someone changed this customer first. The list is up to date now.'
    },
    saved: '{{name}} was saved.',
    archive: {
      archived: '{{name}} was archived. You can restore it from the Archived list.',
      restored: '{{name}} is active again.'
    },
    remove: {
      warning: 'Delete {{name}} for good? Their details and notes cannot be recovered.',
      submit: 'Delete customer',
      removed: '{{name}} was deleted.'
    },
    pager: {
      previous: 'Previous',
      next: 'Next',
      page: 'Page {{page}} of {{pages}}'
    }
  },
  organizationInvitations: {
    section: {
      title: 'Invitations',
      description: 'People invited to {{name}} who have not answered yet.',
      empty: 'No pending invitations.'
    },
    unavailable: 'We could not load the invitations. Check your connection, then try again.',
    invite: {
      title: 'Invite people',
      description: 'They get an email with a link to join {{name}}.',
      open: 'Invite people'
    },
    form: {
      email: 'Email',
      role: 'Role',
      cannotGive: 'A role marked here holds a permission you do not, so you cannot give it.',
      locked: '{{role}} (you cannot give this role)',
      send: 'Send invitation',
      sent: 'Invitation sent to {{email}}'
    },
    row: {
      resend: 'Resend',
      resent: 'Invitation sent again to {{email}}',
      revoke: 'Revoke',
      revoked: 'Invitation to {{email}} revoked'
    },
    errors: {
      alreadyMember: 'This person is already a member.',
      notAllowed: 'You cannot invite with this role. Your role may have changed.',
      limit: 'This organization has as many pending invitations as allowed. Revoke one to send another.',
      tooMany: 'You sent many invitations in a short time. Wait a minute, then try again.',
      gone: 'This invitation is no longer pending. The list has been updated.'
    }
  },
  invitation: {
    pending: {
      title: 'Invitation to {{organization}}',
      description: '{{inviter}} invited you. The invitation is open until {{date}}.',
      accept: 'Accept invitation',
      decline: 'Decline'
    },
    signedInAs: 'Signed in as {{email}}.',
    switchAccount: 'Use another account',
    accepted: {
      title: 'You are in {{organization}}',
      description: 'You accepted this invitation already.',
      open: 'Open {{organization}}'
    },
    used: {
      title: 'This invitation was already used',
      description:
        'You joined {{organization}} with it and are no longer a member. Ask {{inviter}} to invite you again.'
    },
    expired: {
      title: 'This invitation expired',
      description: 'Invitations last 7 days. Ask {{inviter}} to send you a new one.'
    },
    declined: {
      title: 'You declined this invitation',
      description: 'Changed your mind? Ask {{inviter}} to invite you again.'
    },
    withdrawn: {
      title: 'This invitation was withdrawn',
      description:
        '{{inviter}} may have sent you a newer one: look for the latest email about {{organization}}. If there is none, ask {{inviter}}.'
    },
    notFound: {
      title: 'We could not find this invitation',
      description:
        'The link may be cut short. Open it again from the email, or ask whoever invited you to send a new one.'
    },
    otherAccount: {
      title: 'This invitation is for another address',
      description: 'You are signed in as {{email}}. Sign in with the address the invitation was sent to.',
      switch: 'Sign in with another account'
    },
    unavailable: {
      title: 'We could not open this invitation',
      description: 'Check your connection, then try again.'
    },
    continue: 'Continue to the app'
  },
  onboarding: {
    title: 'Name your organization',
    description: 'Your team works together in an organization.',
    another: {
      title: 'Create an organization',
      description: 'Another organization, with its own people and roles.',
      unavailable: 'We could not check your invitations. Check your connection, then try again.'
    },
    invited: {
      title: 'You have invitations',
      description: 'Join a team that is already working together, or create your own organization.',
      invitations: 'Invitations',
      own: 'Or create your own organization'
    },
    unavailable: {
      title: 'We could not check your invitations',
      description: 'Check your connection, then try again.'
    }
  },
  session: {
    unavailable: {
      title: 'We could not check your sign-in',
      description: 'Check your connection, then try again.'
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
    accountDeleted: 'Your account was deleted.',
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
