import { EnvError, loadEnv } from './env'

describe('loadEnv', () => {
  const required = { DATABASE_URL: 'postgres://app:secret@db.example.com:5432/app?sslmode=require' }

  it('uses safe defaults for everything but DATABASE_URL', () => {
    expect(loadEnv({ ...required })).toEqual({
      host: '127.0.0.1',
      port: 3001,
      logLevel: 'info',
      corsOrigins: [],
      databaseUrl: required.DATABASE_URL
    })
  })

  it('reads HOST, PORT and LOG_LEVEL', () => {
    expect(loadEnv({ ...required, HOST: '0.0.0.0', PORT: '8080', LOG_LEVEL: 'debug' })).toEqual({
      databaseUrl: required.DATABASE_URL,
      host: '0.0.0.0',
      port: 8080,
      logLevel: 'debug',
      corsOrigins: []
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

  it.each(['*', 'https://app.example.com/', 'https://app.example.com/path', 'app.example.com', 'ftp://example.com'])(
    'rejects the CORS origin %j',
    (origin) => {
      expect(() => loadEnv({ ...required, CORS_ORIGINS: origin })).toThrow(EnvError)
    }
  )

  it('names every invalid variable but never prints its value', () => {
    let error: unknown
    try {
      loadEnv({ ...required, PORT: 'hunter2', LOG_LEVEL: 'loud' })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(EnvError)
    const message = (error as EnvError).message
    expect(message).toContain('PORT')
    expect(message).toContain('LOG_LEVEL')
    expect(message).not.toContain('hunter2')
    expect(message).not.toContain('loud')
  })

  it('requires DATABASE_URL', () => {
    expect(() => loadEnv({})).toThrow(expect.objectContaining({ variables: ['DATABASE_URL'] }))
  })

  it.each(['mysql://app@db.example.com/app', 'db.example.com:5432/app', ''])('rejects the DATABASE_URL %j', (url) => {
    expect(() => loadEnv({ DATABASE_URL: url })).toThrow(EnvError)
  })

  it('never prints the DATABASE_URL, which holds the password', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://app:hunter2@db/app' })).toThrow(
      expect.objectContaining({ message: 'Invalid environment: DATABASE_URL' })
    )
  })
})
