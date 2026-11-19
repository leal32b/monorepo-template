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
  }
}
