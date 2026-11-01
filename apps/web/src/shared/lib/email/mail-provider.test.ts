import { mailProviderOf } from './mail-provider'

describe('mailProviderOf', () => {
  it.each(['ada@gmail.com', 'ada@googlemail.com', 'ADA@GMAIL.COM'])('opens Gmail for %s', (email) => {
    expect(mailProviderOf(email)).toEqual({ name: 'Gmail', url: 'https://mail.google.com/' })
  })

  it.each(['ada@outlook.com', 'ada@hotmail.com', 'ada@live.com', 'ada@msn.com'])('opens Outlook for %s', (email) => {
    expect(mailProviderOf(email)).toEqual({ name: 'Outlook', url: 'https://outlook.live.com/mail/' })
  })

  it.each(['ada@example.com', 'ada@mail.gmail.com', 'ada@notgmail.com', 'gmail.com', ''])(
    'offers nothing for %s',
    (email) => {
      expect(mailProviderOf(email)).toBeUndefined()
    }
  )
})
