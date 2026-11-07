import { forgetSession, hasSession, rememberSession } from './session-hint'

describe('the session hint', () => {
  afterEach(() => window.localStorage.clear())

  it('says nothing is known on a device where no session was seen', () => {
    expect(hasSession()).toBe(false)
  })

  it('says a session was seen once it is remembered, and not any more once forgotten', () => {
    rememberSession()
    expect(hasSession()).toBe(true)

    forgetSession()
    expect(hasSession()).toBe(false)
  })

  it('keeps no secret: only that a session was seen, never who', () => {
    rememberSession()

    expect(window.localStorage.getItem('session')).toBe('seen')
  })
})
