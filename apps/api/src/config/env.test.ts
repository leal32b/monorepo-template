import { EnvError, loadEnv } from './env'

describe('loadEnv', () => {
  const required = {
    DATABASE_URL: 'postgres://app:secret@db.example.com:5432/app?sslmode=require',
    WEB_ORIGIN: 'http://localhost:5173'
  }
  const proxySecret = '0123456789abcdef'.repeat(4)

  it('uses safe defaults for everything but DATABASE_URL and WEB_ORIGIN', () => {
    expect(loadEnv({ ...required })).toEqual({
      host: '127.0.0.1',
      port: 3001,
      logLevel: 'info',
      webOrigin: 'http://localhost:5173',
      corsOrigins: [],
      proxySecret: undefined,
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
    const deployed = { ...required, WEB_ORIGIN: 'https://app.example.com' }

    expect(() => loadEnv({ ...deployed, PROXY_SECRET: '' })).toThrow(
      expect.objectContaining({ variables: ['PROXY_SECRET'] })
    )
    expect(loadEnv({ ...deployed, PROXY_SECRET: proxySecret }).webOrigin).toBe('https://app.example.com')
  })

  it('names every invalid variable but never prints its value', () => {
    let error: unknown
    try {
      loadEnv({ ...required, PORT: 'hunter2', LOG_LEVEL: 'loud', PROXY_SECRET: 'swordfish' })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(EnvError)
    const message = (error as EnvError).message
    expect(message).toContain('PORT')
    expect(message).toContain('LOG_LEVEL')
    expect(message).toContain('PROXY_SECRET')
    expect(message).not.toContain('hunter2')
    expect(message).not.toContain('loud')
    expect(message).not.toContain('swordfish')
  })

  it('requires DATABASE_URL and WEB_ORIGIN', () => {
    expect(() => loadEnv({})).toThrow(expect.objectContaining({ variables: ['DATABASE_URL', 'WEB_ORIGIN'] }))
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
