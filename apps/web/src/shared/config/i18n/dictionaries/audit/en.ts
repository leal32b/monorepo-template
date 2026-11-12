/** The organization's activity log: its audit trail, read only (ADR 0061). */
export const auditEn = {
  activity: {
    title: 'Activity',
    unavailable: 'We could not load the activity. Check your connection, then try again.',
    noAccess: {
      title: 'You cannot see the activity here',
      description: 'Your role in {{name}} does not include it. Ask an owner or an admin.'
    },
    section: {
      title: 'Recent changes',
      description: 'Who changed what in {{name}}, newest first. Kept for a year.'
    },
    empty: {
      title: 'Nothing has changed yet',
      description: 'When someone adds or changes a record, it shows here with who did it and when.'
    },
    actors: {
      formerMember: 'A former member',
      visitor: 'A visitor, through your public page',
      system: 'The system'
    },
    entries: {
      customer: {
        created: 'Added a customer',
        updated: 'Edited a customer',
        archived: 'Archived a customer',
        restored: 'Restored a customer',
        deleted: 'Deleted a customer'
      }
    },
    changed: '{{what}}: {{fields}}',
    fields: {
      customer: { name: 'name', email: 'email', phone: 'phone', company: 'company', notes: 'notes' }
    },
    pager: {
      label: 'Activity pages',
      previous: 'Newer',
      next: 'Older',
      page: 'Page {{page}}'
    }
  }
}
