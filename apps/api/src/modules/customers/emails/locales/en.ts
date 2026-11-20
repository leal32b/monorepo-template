export const en = {
  customerRegistered: {
    subject: 'New customer: {name}',
    body: '{name} registered as a customer of {organization} through its public page on {day}. Their details are in the customer list, marked as created by a visitor.',
    action: 'See customers',
    footer:
      'You get this email because you own {organization}. If you do not know this person, archive or delete the customer.'
  }
}

/** The shape every language must have: the English texts. */
export type CustomersEmailTexts = typeof en
