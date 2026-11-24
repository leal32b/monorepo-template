import { EnvError, loadDatabaseEnv, loadEnv } from './env'

describe('loadEnv', () => {
  const authSecret = 'fedcba9876543210'.repeat(2)
  const required = {
    DATABASE_URL: 'postgres://app:secret@db.example.com:5432/app?sslmode=require',
    WEB_ORIGIN: 'http://localhost:5173',
    BETTER_AUTH_SECRET: authSecret
  }
  const proxySecret = '0123456789abcdef'.repeat(4)
  const resend = { RESEND_API_KEY: 're_123', EMAIL_FROM: 'Acme <noreply@acme.example>' }
  const google = { GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'GOCSPX-secret' }
  const asaas = {
    ASAAS_API_KEY: `$aact_prod_${'b2'.repeat(40)}`,
    ASAAS_API_URL: 'https://api.asaas.com/v3',
    ASAAS_WEBHOOK_TOKEN: 'c3'.repeat(32)
  }

  const r2 = {
    STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    STORAGE_BUCKET: 'files',
    STORAGE_ACCESS_KEY_ID: 'key-id',
    STORAGE_SECRET_ACCESS_KEY: 'the-storage-secret'
  }

  it('uses safe defaults for everything but the database, the web origin and the auth secret', () => {
    expect(loadEnv({ ...required })).toEqual({
      host: '127.0.0.1',
      port: 3001,
      logLevel: 'info',
      release: 'dev',
      webOrigin: 'http://localhost:5173',
      corsOrigins: [],
      proxySecret: undefined,
      authSecret,
      email: { kind: 'log' },
      google: undefined,
      billing: { kind: 'fake', token: undefined },
      storage: { kind: 'local', dir: '.storage' },
      jobs: { worker: true, idlePollMs: 3_600_000 },
      databaseUrl: required.DATABASE_URL,
      databasePoolSize: undefined
    })
  })

  it('reads JOB_WORKER and JOB_IDLE_POLL_SECONDS, for a worker in a process of its own (ADR 0056)', () => {
    expect(loadEnv({ ...required, JOB_WORKER: 'off', JOB_IDLE_POLL_SECONDS: '5' }).jobs).toEqual({
      worker: false,
      idlePollMs: 5_000
    })
    expect(loadEnv({ ...required, JOB_WORKER: 'on' }).jobs.worker).toBe(true)
  })

  it('treats empty job settings as unset, as a copied .env.example leaves them', () => {
    expect(loadEnv({ ...required, JOB_WORKER: '', JOB_IDLE_POLL_SECONDS: '' }).jobs).toEqual({
      worker: true,
      idlePollMs: 3_600_000
    })
  })

  it.each([
    { JOB_WORKER: 'yes' },
    { JOB_IDLE_POLL_SECONDS: '0' },
    { JOB_IDLE_POLL_SECONDS: '1.5' },
    { JOB_IDLE_POLL_SECONDS: '86401' },
    { JOB_IDLE_POLL_SECONDS: 'soon' }
  ])('rejects the job setting %j', (setting) => {
    expect(() => loadEnv({ ...required, ...setting })).toThrow(
      expect.objectContaining({ variables: Object.keys(setting) })
    )
  })

  it('reads HOST, PORT and LOG_LEVEL', () => {
    expect(loadEnv({ ...required, HOST: '0.0.0.0', PORT: '8080', LOG_LEVEL: 'debug' })).toMatchObject({
      host: '0.0.0.0',
      port: 8080,
      logLevel: 'debug'
    })
  })

  it('reads DATABASE_POOL_SIZE, one for a local PGlite (ADR 0055)', () => {
    expect(loadEnv({ ...required, DATABASE_POOL_SIZE: '1' }).databasePoolSize).toBe(1)
    expect(loadEnv({ ...required, DATABASE_POOL_SIZE: '' }).databasePoolSize).toBeUndefined()
  })

  it.each(['0', '101', '2.5', 'many'])('rejects the pool size %j', (size) => {
    expect(() => loadEnv({ ...required, DATABASE_POOL_SIZE: size })).toThrow(
      expect.objectContaining({ variables: ['DATABASE_POOL_SIZE'] })
    )
  })

  it('reads RELEASE, the version the deploy built', () => {
    expect(loadEnv({ ...required, RELEASE: '3e75fa2c0ffee' }).release).toBe('3e75fa2c0ffee')
  })

  it('treats an empty RELEASE as unset', () => {
    expect(loadEnv({ ...required, RELEASE: '' }).release).toBe('dev')
  })

  it.each(['a b', 'x'.repeat(65), 'v1;rm'])('rejects the release %j', (release) => {
    expect(() => loadEnv({ ...required, RELEASE: release })).toThrow(
      expect.objectContaining({ variables: ['RELEASE'] })
    )
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
    const deployed = { ...required, ...resend, ...asaas, ...r2, WEB_ORIGIN: 'https://app.example.com' }

    expect(() => loadEnv({ ...deployed, PROXY_SECRET: '' })).toThrow(
      expect.objectContaining({ variables: ['PROXY_SECRET'] })
    )
    expect(loadEnv({ ...deployed, PROXY_SECRET: proxySecret }).proxySecret).toBe(proxySecret)
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
    const deployed = { ...required, ...asaas, ...r2, WEB_ORIGIN: 'https://app.example.com', PROXY_SECRET: proxySecret }

    expect(() => loadEnv(deployed)).toThrow(expect.objectContaining({ variables: ['RESEND_API_KEY'] }))
    expect(loadEnv({ ...deployed, ...resend }).email.kind).toBe('resend')
  })

  it('bills through the fake when no provider key is set, with the token its commands carry (ADR 0063)', () => {
    expect(loadEnv({ ...required, FAKE_BILLING_TOKEN: 'e2e-fake-billing-token' }).billing).toEqual({
      kind: 'fake',
      token: 'e2e-fake-billing-token'
    })
    expect(loadEnv({ ...required, FAKE_BILLING_TOKEN: '' }).billing).toEqual({ kind: 'fake', token: undefined })
  })

  it('rejects a FAKE_BILLING_TOKEN shorter than 16 characters', () => {
    expect(() => loadEnv({ ...required, FAKE_BILLING_TOKEN: 'short' })).toThrow(
      expect.objectContaining({ variables: ['FAKE_BILLING_TOKEN'] })
    )
  })

  it('refuses the billing fake when the web origin is https: deployed, payments must be real (ADR 0063)', () => {
    const deployed = { ...required, ...resend, ...r2, WEB_ORIGIN: 'https://app.example.com', PROXY_SECRET: proxySecret }

    expect(() => loadEnv(deployed)).toThrow(expect.objectContaining({ variables: ['ASAAS_API_KEY'] }))
  })

  describe('Asaas (ADR 0064)', () => {
    const sandboxKey = `$aact_hmlg_${'a1'.repeat(40)}`
    const productionKey = asaas.ASAAS_API_KEY
    const webhookToken = asaas.ASAAS_WEBHOOK_TOKEN
    const sandbox = { ...asaas, ASAAS_API_KEY: sandboxKey, ASAAS_API_URL: 'https://api-sandbox.asaas.com/v3' }
    const production = asaas

    it('bills through Asaas when ASAAS_API_KEY is set, with its URL and the token of its notices', () => {
      expect(loadEnv({ ...required, ...sandbox }).billing).toEqual({
        kind: 'asaas',
        apiKey: sandboxKey,
        apiUrl: 'https://api-sandbox.asaas.com/v3',
        webhookToken
      })
      expect(loadEnv({ ...required, ...production }).billing).toMatchObject({
        kind: 'asaas',
        apiUrl: 'https://api.asaas.com/v3'
      })
    })

    it('lets a deployed environment start once Asaas is configured, on the sandbox for staging', () => {
      const deployed = {
        ...required,
        ...resend,
        ...r2,
        WEB_ORIGIN: 'https://app.example.com',
        PROXY_SECRET: proxySecret
      }

      expect(loadEnv({ ...deployed, ...production }).billing.kind).toBe('asaas')
      expect(loadEnv({ ...deployed, ...sandbox }).billing.kind).toBe('asaas')
    })

    it('treats empty Asaas variables as unset, as a copied .env.example leaves them', () => {
      expect(loadEnv({ ...required, ASAAS_API_KEY: '', ASAAS_API_URL: '', ASAAS_WEBHOOK_TOKEN: '' }).billing).toEqual({
        kind: 'fake',
        token: undefined
      })
    })

    it.each([
      ['a sandbox key on the production URL', { ASAAS_API_URL: 'https://api.asaas.com/v3' }],
      ['a production key on the sandbox URL', { ASAAS_API_KEY: productionKey }],
      ['a key of neither environment', { ASAAS_API_KEY: '$aact_test_123' }]
    ])('rejects %s', (_case, change) => {
      expect(() => loadEnv({ ...required, ...sandbox, ...change })).toThrow(
        expect.objectContaining({ variables: ['ASAAS_API_KEY'] })
      )
    })

    it.each([
      'https://api-sandbox.asaas.com',
      'https://api.asaas.com/v3/',
      'http://api.asaas.com/v3',
      'https://evil.example/v3'
    ])('rejects the API URL %j', (url) => {
      expect(() => loadEnv({ ...required, ...sandbox, ASAAS_API_URL: url })).toThrow(
        expect.objectContaining({ variables: expect.arrayContaining(['ASAAS_API_URL']) })
      )
    })

    it.each([
      ['shorter than 32 characters', 'x'.repeat(31)],
      ['longer than 255 characters', 'x'.repeat(256)],
      ['with a space', `${'x'.repeat(20)} ${'x'.repeat(20)}`],
      ['with a tab', `${'x'.repeat(20)}\t${'x'.repeat(20)}`]
    ])('rejects a webhook token %s', (_case, token) => {
      expect(() => loadEnv({ ...required, ...sandbox, ASAAS_WEBHOOK_TOKEN: token })).toThrow(
        expect.objectContaining({ variables: ['ASAAS_WEBHOOK_TOKEN'] })
      )
    })

    it('accepts webhook tokens of 32 and 255 characters', () => {
      for (const token of ['x'.repeat(32), 'x'.repeat(255)]) {
        expect(loadEnv({ ...required, ...sandbox, ASAAS_WEBHOOK_TOKEN: token }).billing).toMatchObject({
          webhookToken: token
        })
      }
    })

    it('rejects the API key as the webhook token: a leaked notice would leak the key', () => {
      expect(() => loadEnv({ ...required, ...sandbox, ASAAS_WEBHOOK_TOKEN: sandboxKey })).toThrow(
        expect.objectContaining({ variables: ['ASAAS_WEBHOOK_TOKEN'] })
      )
    })

    it.each([
      ['the key without its URL', { ASAAS_API_URL: '' }, 'ASAAS_API_URL'],
      ['the key without the webhook token', { ASAAS_WEBHOOK_TOKEN: '' }, 'ASAAS_WEBHOOK_TOKEN'],
      ['the URL without the key', { ASAAS_API_KEY: '', ASAAS_WEBHOOK_TOKEN: '' }, 'ASAAS_API_KEY'],
      ['the webhook token without the key', { ASAAS_API_KEY: '', ASAAS_API_URL: '' }, 'ASAAS_API_KEY']
    ])('rejects %s', (_case, change, variable) => {
      expect(() => loadEnv({ ...required, ...sandbox, ...change })).toThrow(
        expect.objectContaining({ variables: [variable] })
      )
    })

    it('never prints the key or the token', () => {
      const wrong = { ...sandbox, ASAAS_API_URL: 'https://api.asaas.com/v3', ASAAS_WEBHOOK_TOKEN: 'short' }

      expect(() => loadEnv({ ...required, ...wrong })).toThrow(
        expect.objectContaining({ message: 'Invalid environment: ASAAS_WEBHOOK_TOKEN, ASAAS_API_KEY' })
      )
    })
  })

  describe('file storage (ADR 0076)', () => {
    it('keeps files in a local folder when no store is configured, in STORAGE_DIR if set', () => {
      expect(loadEnv({ ...required, STORAGE_DIR: '/tmp/files' }).storage).toEqual({ kind: 'local', dir: '/tmp/files' })
      expect(loadEnv({ ...required, STORAGE_DIR: '' }).storage).toEqual({ kind: 'local', dir: '.storage' })
    })

    it('keeps files in an S3-compatible store when its endpoint, bucket and keys are set, in region auto unless said', () => {
      expect(loadEnv({ ...required, ...r2 }).storage).toEqual({
        kind: 's3',
        endpoint: 'https://account.r2.cloudflarestorage.com',
        bucket: 'files',
        region: 'auto',
        accessKeyId: 'key-id',
        secretAccessKey: 'the-storage-secret'
      })
      expect(loadEnv({ ...required, ...r2, STORAGE_REGION: 'us-east-1' }).storage).toMatchObject({
        region: 'us-east-1'
      })
    })

    it.each(Object.keys(r2))('refuses a store configured without %s', (name) => {
      expect(() => loadEnv({ ...required, ...r2, [name]: '' })).toThrow(expect.objectContaining({ variables: [name] }))
    })

    it.each([
      'http://account.r2.cloudflarestorage.com',
      'https://account.r2.cloudflarestorage.com/files',
      'account.r2.cloudflarestorage.com'
    ])('refuses the endpoint %j: an https origin, the bucket apart', (endpoint) => {
      expect(() => loadEnv({ ...required, ...r2, STORAGE_ENDPOINT: endpoint })).toThrow(
        expect.objectContaining({ variables: ['STORAGE_ENDPOINT'] })
      )
    })

    it('refuses the local folder when the web origin is https: the next deploy erases its disk', () => {
      const deployed = {
        ...required,
        ...resend,
        ...asaas,
        WEB_ORIGIN: 'https://app.example.com',
        PROXY_SECRET: proxySecret
      }

      expect(() => loadEnv(deployed)).toThrow(expect.objectContaining({ variables: ['STORAGE_ENDPOINT'] }))
      expect(loadEnv({ ...deployed, ...r2 }).storage.kind).toBe('s3')
    })

    it('never prints the secret key', () => {
      try {
        loadEnv({ ...required, ...r2, STORAGE_BUCKET: '' })
      } catch (error) {
        expect(String((error as Error).message)).not.toContain('the-storage-secret')
      }
      expect.assertions(1)
    })
  })

  it('turns Google sign-in on when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set (ADR 0020)', () => {
    expect(loadEnv({ ...required, ...google }).google).toEqual({
      clientId: 'client-123.apps.googleusercontent.com',
      clientSecret: 'GOCSPX-secret'
    })
  })

  it('treats empty Google credentials as unset', () => {
    expect(loadEnv({ ...required, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' }).google).toBeUndefined()
  })

  it.each([
    [
      'GOOGLE_CLIENT_ID without GOOGLE_CLIENT_SECRET',
      { GOOGLE_CLIENT_ID: google.GOOGLE_CLIENT_ID },
      'GOOGLE_CLIENT_SECRET'
    ],
    [
      'GOOGLE_CLIENT_SECRET without GOOGLE_CLIENT_ID',
      { GOOGLE_CLIENT_SECRET: google.GOOGLE_CLIENT_SECRET },
      'GOOGLE_CLIENT_ID'
    ]
  ])('rejects %s', (_case, credentials, variable) => {
    expect(() => loadEnv({ ...required, ...credentials })).toThrow(expect.objectContaining({ variables: [variable] }))
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

describe('loadDatabaseEnv', () => {
  const url = 'postgres://app:secret@db.example.com:5432/app?sslmode=require'

  it('needs only DATABASE_URL, with the defaults of the API for the rest', () => {
    expect(loadDatabaseEnv({ DATABASE_URL: url })).toEqual({ databaseUrl: url, logLevel: 'info', release: 'dev' })
  })

  it('reads LOG_LEVEL and RELEASE', () => {
    expect(loadDatabaseEnv({ DATABASE_URL: url, LOG_LEVEL: 'warn', RELEASE: 'abc123' })).toEqual({
      databaseUrl: url,
      logLevel: 'warn',
      release: 'abc123'
    })
  })

  it('names an invalid variable, never its value', () => {
    const error = (() => {
      try {
        loadDatabaseEnv({ DATABASE_URL: 'mysql://app:secret@db/app' })
      } catch (caught) {
        return caught as EnvError
      }
    })()

    expect(error).toBeInstanceOf(EnvError)
    expect(error?.variables).toEqual(['DATABASE_URL'])
    expect(error?.message).not.toContain('secret')
  })
})
