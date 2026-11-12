export const customersEn = {
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
  }
}
