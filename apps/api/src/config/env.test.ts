import { EnvError, loadEnv } from './env'

describe('loadEnv', () => {
  it('uses safe defaults when nothing is set', () => {
    expect(loadEnv({})).toEqual({ host: '127.0.0.1', port: 3001, logLevel: 'info', corsOrigins: [] })
  })

  it('reads HOST, PORT and LOG_LEVEL', () => {
    expect(loadEnv({ HOST: '0.0.0.0', PORT: '8080', LOG_LEVEL: 'debug' })).toEqual({
      host: '0.0.0.0',
      port: 8080,
      logLevel: 'debug',
      corsOrigins: []
    })
  })

  it.each(['0', '65536', '3.5', 'abc', ''])('rejects the port %j', (port) => {
    expect(() => loadEnv({ PORT: port })).toThrow(EnvError)
  })

  it('reads CORS_ORIGINS as a comma-separated list of exact origins', () => {
    expect(loadEnv({ CORS_ORIGINS: 'https://app.example.com, http://localhost:5173' }).corsOrigins).toEqual([
      'https://app.example.com',
      'http://localhost:5173'
    ])
  })

  it.each(['*', 'https://app.example.com/', 'https://app.example.com/path', 'app.example.com', 'ftp://example.com'])(
    'rejects the CORS origin %j',
    (origin) => {
      expect(() => loadEnv({ CORS_ORIGINS: origin })).toThrow(EnvError)
    }
  )

  it('names every invalid variable but never prints its value', () => {
    let error: unknown
    try {
      loadEnv({ PORT: 'hunter2', LOG_LEVEL: 'loud' })
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
})
