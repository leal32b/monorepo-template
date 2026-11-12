/** A tenant's public pages, for a visitor with no account (ADR 0060), and the forms on them. */
export const publicEn = {
  publicPage: {
    title: 'Become a customer',
    description: 'Leave your name and a way to reach you.',
    notFound: {
      title: 'There is no page at this address',
      description: 'Check the link with whoever gave it to you: a letter may be missing, or the page may have moved.'
    },
    unavailable: 'This page could not be opened.'
  },
  registration: {
    name: 'Your name',
    contact: 'How can {{organization}} reach you?',
    email: 'Email',
    phone: 'Phone',
    contactHint: 'An email or a phone is enough.',
    submit: 'Send my details',
    received: '{{organization}} received your details. If they need anything else, they will reach you.',
    errors: {
      nameRequired: 'Enter your name.',
      nameTooLong: 'Use at most {{max}} characters.',
      emailInvalid: 'Enter an email address, like ada@example.com.',
      phoneTooLong: 'Use at most {{max}} characters.',
      contactRequired: 'Enter an email or a phone, so they can reach you.'
    }
  }
}
