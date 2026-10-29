import type { AddressInfo } from 'node:net'
import { apiProblemSchema, healthResponseSchema, livenessResponseSchema } from '@repo/contracts'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { createDatabase, createPool } from '#libs/database/database'
import { createApp } from './create-app'

const clock = new FixedClock(new Date('2026-10-17T12:00:00.000Z'))
const logger = pino({ level: 'silent' })
const webOrigin = 'https://app.example.com'
const proxySecret = '0123456789abcdef'.repeat(4)
const emailSender = new RecordingEmailSender()
const authSecret = 'fedcba9876543210'.repeat(2)

describe('API', () => {
  const db = createDatabase(createPool(inject('databaseUrl'), logger))
  const server = createApp({
    clock,
    logger,
    serviceName: 'api',
    webOrigin,
    corsOrigins: [webOrigin],
    proxySecret,
    db,
    emailSender,
    authSecret,
    google: undefined
  })
  let url: string

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await db.destroy()
  })

  it('GET /api/health answers ok when the database answers', async () => {
    const response = await fetch(`${url}/api/health`)

    expect(response.status).toBe(200)
    expect(healthResponseSchema.parse(await response.json())).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: '2026-10-17T12:00:00.000Z',
      database: 'up'
    })
  })

  it('does not accept writes on /api/health', async () => {
    const response = await fetch(`${url}/api/health`, { method: 'POST' })

    expect(response.status).toBe(405)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('method_not_allowed')
  })

  it('lets the configured web origin read /api/health', async () => {
    const response = await fetch(`${url}/api/health`, { headers: { Origin: 'https://app.example.com' } })

    expect(response.headers.get('access-control-allow-origin')).toBe('https://app.example.com')
  })

  it('GET /api/health/live answers ok', async () => {
    const response = await fetch(`${url}/api/health/live`)

    expect(response.status).toBe(200)
    expect(livenessResponseSchema.parse(await response.json())).toEqual({ status: 'ok' })
  })

  it('refuses any other path without the web Worker secret (ADR 0022)', async () => {
    const direct = await fetch(`${url}/api/anything`)
    const proxied = await fetch(`${url}/api/anything`, { headers: { 'X-Proxy-Secret': proxySecret } })

    expect(direct.status).toBe(403)
    expect(apiProblemSchema.parse(await direct.json()).code).toBe('proxy_required')
    expect(proxied.status).toBe(404)
  })

  it('refuses a write from another origin than the web app', async () => {
    const response = await fetch(`${url}/api/health`, { method: 'POST', headers: { Origin: 'https://evil.example' } })

    expect(response.status).toBe(403)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('origin_not_allowed')
  })
})

describe('API without its database', () => {
  const db = createDatabase(createPool('postgres://app:secret@127.0.0.1:1/app?sslmode=disable', logger))
  const server = createApp({
    clock,
    logger,
    serviceName: 'api',
    webOrigin,
    corsOrigins: [],
    proxySecret: undefined,
    db,
    emailSender,
    authSecret,
    google: undefined
  })
  let url: string

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await db.destroy()
  })

  it('GET /api/health answers 503 degraded, as the health contract says', async () => {
    const response = await fetch(`${url}/api/health`)

    expect(response.status).toBe(503)
    expect(healthResponseSchema.parse(await response.json())).toEqual({
      status: 'degraded',
      service: 'api',
      timestamp: '2026-10-17T12:00:00.000Z',
      database: 'down'
    })
  })

  it('GET /api/health/live still answers ok: the platform check never depends on the database', async () => {
    const response = await fetch(`${url}/api/health/live`)

    expect(response.status).toBe(200)
  })
})
