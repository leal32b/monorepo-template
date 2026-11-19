export const en = {
  trialEnding: {
    subject: 'The trial of {organization} ends in {days} days',
    body: 'The trial of {organization} ends on {trialEnds}. Choose a plan to keep adding and changing records; after that day the organization is read only until a plan is chosen. Nothing is deleted.',
    action: 'See plans',
    footer: 'You get this email because you own {organization}. If you have already chosen a plan, ignore it.'
  },
  paymentFailed: {
    subject: 'We have not received the payment of {organization}',
    body: 'We have not received the payment of {organization} due on {dueDay}. Pay by {payBy} to keep adding and changing records; after that day the organization is read only until it is paid. Nothing is deleted.',
    action: 'Pay now',
    footer:
      'If you have just paid, ignore this email: a boleto can take up to 3 business days to clear. You get this email because you own {organization}.'
  }
}

/** The shape every language must have: the English texts. */
export type BillingEmailTexts = typeof en
