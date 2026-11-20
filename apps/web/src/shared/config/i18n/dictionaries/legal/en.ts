/**
 * The terms of use and the privacy notice (ADR 0074): placeholders a product replaces, in every language it
 * sells in, changing `legal.version` in `@repo/contracts` in the same commit. A blank line starts a paragraph.
 */
export const legalEn = {
  legal: {
    version: 'Version of {{date}}',
    terms: {
      title: 'Terms of use',
      description: 'The rules for using this service.',
      body: [
        'This text is a placeholder. Before anyone signs up, replace it with the terms of use of your product, written or reviewed by a lawyer who knows where you sell.',
        'Terms of use usually say who provides the service and how to reach them; who may use it and what accounts and organizations are; what users may and may not do with it; what the plans cost, how they are billed, renewed and cancelled, and what happens to an organization that stops paying.',
        'They also say who owns the data users put in and how they take it out (an owner exports it from the organization’s settings); how an account or an organization is deleted; what the service promises about availability, and the limits of its liability.',
        'Finally, they say how these terms change and how users are told before a change takes effect, and which law and courts apply.'
      ].join('\n\n')
    },
    privacy: {
      title: 'Privacy notice',
      description: 'What we do with your personal data.',
      body: [
        'This text is a placeholder. Before anyone signs up, replace it with the privacy notice of your product, written or reviewed by a lawyer who knows the data protection laws where you sell (LGPD in Brazil, GDPR in Europe).',
        'A privacy notice usually names the controller and how to reach its data protection officer; the personal data collected (name, email, the records an organization keeps about its own customers) and why; the legal basis for each use; and the companies that process data on its behalf, such as hosting, email and payments.',
        'It also says how long each kind of data is kept, how it is protected, and whether it leaves the country.',
        'Finally, it lists the rights of each person and how to use them: to see and copy their data, correct it, take it elsewhere, and delete their account, which anyone can do from their profile.'
      ].join('\n\n')
    }
  }
}
