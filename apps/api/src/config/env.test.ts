import { EnvError, loadEnv } from './env'

describe('loadEnv', () => {
  const authSecret = 'fedcba9876543210'.repeat(2)
  const required = {
    DATABASE_URL: 'postgres://app:secret@db.example.com:5432/app?sslmode=require',
    WEB_ORIGIN: 'http://localhost:5173',
    BETTER_AUTH_SECRET: authSecret
  }
  const proxySecret = '0123456789abcdef'.repeat(4)
  const resend = { RESEND_API_KEY: 're_123', EMAIL_FROM: 'Acme <noreply@acme.example>' }

  it('uses safe defaults for everything but the database, the web origin and the auth secret', () => {
    expect(loadEnv({ ...required })).toEqual({
      host: '127.0.0.1',
      port: 3001,
      logLevel: 'info',
      webOrigin: 'http://localhost:5173',
      corsOrigins: [],
      proxySecret: undefined,
      authSecret,
      email: { kind: 'log' },
      databaseUrl: required.DATABASE_URL
    })
  })

  it('reads HOST, PORT and LOG_LEVEL', () => {
    expect(loadEnv({ ...required, HOST: '0.0.0.0', PORT: '8080', LOG_LEVEL: 'debug' })).toMatchObject({
      host: '0.0.0.0',
      port: 8080,
      logLevel: 'debug'
    })
  })

  it.each(['0', '65536', '3.5', 'abc', ''])('rejects the port %j', (port) => {
    expect(() => loadEnv({ ...required, PORT: port })).toThrow(EnvError)
  })

  it('reads CORS_ORIGINS as a comma-separated list of exact origins', () => {
    expect(
      loadEnv({ ...required, CORS_ORIGINS: 'https://app.example.com, http://localhost:5173' }).corsOrigins
    ).toEqual(['https://app.example.com', 'http://localhost:5173'])
  })

  const notOrigins = [
    '*',
    'https://app.example.com/',
    'https://app.example.com/path',
    'app.example.com',
    'ftp://example.com'
  ]

  it.each(notOrigins)('rejects the CORS origin %j', (origin) => {
    expect(() => loadEnv({ ...required, CORS_ORIGINS: origin })).toThrow(EnvError)
  })

  it.each(notOrigins)('rejects the web origin %j', (origin) => {
    expect(() => loadEnv({ ...required, WEB_ORIGIN: origin })).toThrow(
      expect.objectContaining({ variables: ['WEB_ORIGIN'] })
    )
  })

  it('reads PROXY_SECRET', () => {
    expect(loadEnv({ ...required, PROXY_SECRET: proxySecret }).proxySecret).toBe(proxySecret)
  })

  it('treats an empty PROXY_SECRET as unset', () => {
    expect(loadEnv({ ...required, PROXY_SECRET: '' }).proxySecret).toBeUndefined()
  })

  it('rejects a PROXY_SECRET shorter than 32 characters', () => {
    expect(() => loadEnv({ ...required, PROXY_SECRET: 'x'.repeat(31) })).toThrow(
      expect.objectContaining({ variables: ['PROXY_SECRET'] })
    )
  })

  it('requires PROXY_SECRET when the web origin is https, as when deployed (ADR 0022)', () => {
    const deployed = { ...required, ...resend, WEB_ORIGIN: 'https://app.example.com' }

    expect(() => loadEnv({ ...deployed, PROXY_SECRET: '' })).toThrow(
      expect.objectContaining({ variables: ['PROXY_SECRET'] })
    )
    expect(loadEnv({ ...deployed, PROXY_SECRET: proxySecret }).webOrigin).toBe('https://app.example.com')
  })

  it('rejects a BETTER_AUTH_SECRET shorter than 32 characters', () => {
    expect(() => loadEnv({ ...required, BETTER_AUTH_SECRET: 'x'.repeat(31) })).toThrow(
      expect.objectContaining({ variables: ['BETTER_AUTH_SECRET'] })
    )
  })

  it('sends email through Resend when RESEND_API_KEY and EMAIL_FROM are set (ADR 0021)', () => {
    expect(loadEnv({ ...required, ...resend }).email).toEqual({
      kind: 'resend',
      apiKey: 're_123',
      from: 'Acme <noreply@acme.example>'
    })
  })

  it('treats empty RESEND_API_KEY and EMAIL_FROM as unset', () => {
    expect(loadEnv({ ...required, RESEND_API_KEY: '', EMAIL_FROM: '' }).email).toEqual({ kind: 'log' })
  })

  it.each([
    ['RESEND_API_KEY without EMAIL_FROM', { RESEND_API_KEY: 're_123' }, 'EMAIL_FROM'],
    ['EMAIL_FROM without RESEND_API_KEY', { EMAIL_FROM: 'noreply@acme.example' }, 'RESEND_API_KEY']
  ])('rejects %s', (_case, email, variable) => {
    expect(() => loadEnv({ ...required, ...email })).toThrow(expect.objectContaining({ variables: [variable] }))
  })

  it.each(['noreply@acme.example', 'Acme <noreply@acme.example>'])('accepts the sender %j', (from) => {
    expect(loadEnv({ ...required, ...resend, EMAIL_FROM: from }).email).toMatchObject({ from })
  })

  it.each(['acme.example', 'Acme <noreply>', '<noreply@acme.example>'])('rejects the sender %j', (from) => {
    expect(() => loadEnv({ ...required, ...resend, EMAIL_FROM: from })).toThrow(
      expect.objectContaining({ variables: ['EMAIL_FROM'] })
    )
  })

  it('refuses the log transport when the web origin is https, as when deployed (ADR 0021)', () => {
    const deployed = { ...required, WEB_ORIGIN: 'https://app.example.com', PROXY_SECRET: proxySecret }

    expect(() => loadEnv(deployed)).toThrow(expect.objectContaining({ variables: ['RESEND_API_KEY'] }))
    expect(loadEnv({ ...deployed, ...resend }).email.kind).toBe('resend')
  })

  it('names every invalid variable but never prints its value', () => {
    let error: unknown
    try {
      loadEnv({
        ...required,
        PORT: 'hunter2',
        LOG_LEVEL: 'loud',
        PROXY_SECRET: 'swordfish',
        BETTER_AUTH_SECRET: 'opensesame'
      })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(EnvError)
    const message = (error as EnvError).message
    expect(message).toContain('PORT')
    expect(message).toContain('LOG_LEVEL')
    expect(message).toContain('PROXY_SECRET')
    expect(message).toContain('BETTER_AUTH_SECRET')
    expect(message).not.toContain('hunter2')
    expect(message).not.toContain('loud')
    expect(message).not.toContain('swordfish')
    expect(message).not.toContain('opensesame')
  })

  it('requires DATABASE_URL, WEB_ORIGIN and BETTER_AUTH_SECRET', () => {
    expect(() => loadEnv({})).toThrow(
      expect.objectContaining({ variables: ['DATABASE_URL', 'WEB_ORIGIN', 'BETTER_AUTH_SECRET'] })
    )
  })

  it.each(['mysql://app@db.example.com/app', 'db.example.com:5432/app', ''])('rejects the DATABASE_URL %j', (url) => {
    expect(() => loadEnv({ ...required, DATABASE_URL: url })).toThrow(EnvError)
  })

  it('never prints the DATABASE_URL, which holds the password', () => {
    expect(() => loadEnv({ ...required, DATABASE_URL: 'mysql://app:hunter2@db/app' })).toThrow(
      expect.objectContaining({ message: 'Invalid environment: DATABASE_URL' })
    )
  })
})
