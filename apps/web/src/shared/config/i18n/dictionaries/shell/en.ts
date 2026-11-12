export const shellEn = {
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
  /** Words that buttons share across screens. */
  actions: {
    cancel: 'Cancel',
    retry: 'Try again'
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
        activity: 'audit log history changes who',
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
      activity: 'Activity',
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
    rateLimitedFor: 'Too many attempts from this connection. Try again in {{wait}}.',
    unexpected: 'Something went wrong on our side. Try again in a moment.',
    reference: 'If it keeps happening, tell support: {{reference}}'
  }
}
