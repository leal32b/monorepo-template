export type MailProvider = {
  name: 'Gmail' | 'Outlook'
  /** The provider's inbox, to open in a new tab. */
  url: string
}

const providers: Record<string, MailProvider> = {
  'gmail.com': { name: 'Gmail', url: 'https://mail.google.com/' },
  'googlemail.com': { name: 'Gmail', url: 'https://mail.google.com/' },
  'outlook.com': { name: 'Outlook', url: 'https://outlook.live.com/mail/' },
  'hotmail.com': { name: 'Outlook', url: 'https://outlook.live.com/mail/' },
  'live.com': { name: 'Outlook', url: 'https://outlook.live.com/mail/' },
  'msn.com': { name: 'Outlook', url: 'https://outlook.live.com/mail/' }
}

/**
 * The webmail an address lives in, by its domain, so the user can open the inbox in one press. Only
 * the two providers most addresses use; any other domain, or a company mailbox on one of them, gets
 * nothing, since a wrong inbox is worse than none.
 */
export function mailProviderOf(email: string): MailProvider | undefined {
  const at = email.lastIndexOf('@')
  return at < 0 ? undefined : providers[email.slice(at + 1).toLowerCase()]
}
