/** The operator back office (ADR 0077): every organization and user, and entering one read only. */
export const backOfficeEn = {
  backOffice: {
    name: 'Back office',
    /** The banner of an operator's visit, over every screen: fetched with it, never by another user. */
    banner: {
      title: 'You are viewing {{name}} as its owner sees it',
      description: 'Read only: nothing you do here changes it. Your visit ends on {{time}}.',
      leave: 'Leave',
      leaveFailed: 'Could not leave. Check your connection and try again.'
    },
    nav: {
      label: 'Back office',
      organizations: 'Organizations',
      users: 'Users',
      app: 'Back to the app'
    },
    unavailable: 'We could not load the back office. Check your connection, then try again.',
    refused: {
      title: 'Sign in again to open the back office',
      'two-factor': 'Your account has no two-step verification. Turn it on in Security, then sign in again.',
      'sign-in-method': 'Your account also signs in with Google, which asks for no code. Unlink it in Security.',
      'sign-in-again':
        'The back office needs a sign-in with your password and code from the last 12 hours, after you were made an operator.',
      action: 'Sign in again'
    },
    status: {
      trialing: 'Trial',
      active: 'Active',
      past_due: 'Payment late',
      cancelled: 'Ended',
      readOnly: 'Read only'
    },
    organizations: {
      title: 'Organizations',
      search: 'Find by name, address or owner’s email',
      section: {
        title: 'Every organization',
        description: 'Newest first. Open one to see its state and enter it as its owner sees it.'
      },
      row: {
        owner: '{{name}} · {{email}}',
        noOwner: 'No owner',
        details: '/{{slug}} · {{members}} · created {{date}}',
        members: '{{count}} members',
        oneMember: '1 member'
      },
      open: 'Open',
      empty: {
        title: 'No organization yet',
        description: 'Organizations show here as people create them.',
        noResultsTitle: 'Nothing found',
        noResults: 'No organization matches “{{search}}”.'
      }
    },
    organization: {
      title: 'Organization',
      unavailable: 'We could not load this organization. Check your connection, then try again.',
      notFound: 'No organization has this address. It may have been deleted.',
      state: {
        title: 'State',
        description: 'What the organization is, and what its plan lets it do now.',
        address: 'Address',
        plan: 'Plan',
        noPlan: 'No plan chosen yet',
        created: 'Created',
        settings: 'Time zone and currency'
      },
      enter: {
        section: 'Access',
        title: 'See it as its owner sees it',
        description: 'Read only, for 30 minutes. Its activity log records when you enter and leave, with your name.',
        go: 'Enter',
        active: 'You are inside another organization. Leave it first.',
        failed: 'Could not enter. Check your connection and try again.'
      },
      members: {
        title: 'Members',
        description: 'Who belongs to it, oldest first.',
        joined: '{{role}} · joined {{date}}'
      }
    },
    users: {
      title: 'Users',
      search: 'Find by email or name',
      section: {
        title: 'Every user',
        description: 'Newest first, with their organizations.'
      },
      row: {
        lastSignIn: 'last sign-in {{date}}',
        never: 'no sign-in in 30 days',
        twoFactor: 'Two-step on',
        noOrganization: 'No organization'
      },
      empty: {
        title: 'No user yet',
        description: 'People show here as they sign up.',
        noResultsTitle: 'Nothing found',
        noResults: 'No user matches “{{search}}”.'
      }
    }
  }
}
