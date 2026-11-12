export const organizationsEn = {
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
  }
}
