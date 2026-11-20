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
      operator: '{{name}}, an operator of the service',
      formerOperator: 'An operator of the service',
      visitor: 'A visitor, through your public page',
      system: 'The system'
    },
    entries: {
      organization: {
        'export-requested': 'Asked for an export of the data',
        'logo-changed': 'Changed the logo',
        'logo-removed': 'Removed the logo',
        'impersonation-started': 'Entered to see the organization as its owner, read only',
        'impersonation-ended': 'Left the organization'
      },
      customer: {
        created: 'Added a customer',
        updated: 'Edited a customer',
        archived: 'Archived a customer',
        restored: 'Restored a customer',
        deleted: 'Deleted a customer'
      },
      subscription: {
        'checkout-started': 'Started subscribing to a plan',
        'checkout-abandoned': 'Dropped a subscription that was not paid',
        activated: 'Started the paid plan',
        renewed: 'Received the payment of a new period',
        'upgrade-started': 'Started a change to a larger plan, waiting for its payment',
        'upgrade-abandoned': 'Dropped a change of plan that was not paid',
        'plan-changed': 'Changed the plan',
        'downgrade-scheduled': 'Scheduled a smaller plan for the next period',
        'downgrade-withdrawn': 'Withdrew the change to a smaller plan',
        'payment-failed': 'Recorded a payment as late',
        'payment-recovered': 'Received the late payment',
        'cancellation-scheduled': 'Scheduled the end of the plan',
        'cancellation-withdrawn': 'Withdrew the end of the plan',
        cancelled: 'Ended the plan'
      }
    },
    changed: '{{what}}: {{fields}}',
    fields: {
      organization: {},
      customer: { name: 'name', email: 'email', phone: 'phone', company: 'company', notes: 'notes' },
      subscription: {
        status: 'status',
        plan: 'plan',
        nextPlan: 'next plan',
        periodStartsAt: 'start of the period',
        paidThrough: 'paid until',
        pastDueSince: 'late since',
        cancelAtPeriodEnd: 'end of the plan',
        checkout: 'payment in progress'
      }
    },
    pager: {
      label: 'Activity pages',
      previous: 'Newer',
      next: 'Older',
      page: 'Page {{page}}'
    }
  }
}
