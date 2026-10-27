import type { AddressInfo, Socket } from 'node:net'
import { createServer, type Server } from 'node:net'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { PostgresDatabaseProbe } from './postgres-database-probe'

const logger = pino({ level: 'silent' })
const databaseAt = (url: string) => createDatabase(createPool(url, logger))

describe('PostgresDatabaseProbe', () => {
  it('reports a database that answers as reachable', async () => {
    const db = databaseAt(inject('databaseUrl'))

    expect(await new PostgresDatabaseProbe(db, 1_000).isReachable()).toBe(true)
    await db.destroy()
  })

  it('reports a refused connection as unreachable', async () => {
    const db = databaseAt('postgres://app:secret@127.0.0.1:1/app?sslmode=disable')

    expect(await new PostgresDatabaseProbe(db, 1_000).isReachable()).toBe(false)
    await db.destroy()
  })

  it('gives up on a database that never answers', async () => {
    // Accepts TCP connections and never says a word, like a stuck server.
    const sockets = new Set<Socket>()
    const silent: Server = createServer((socket) => sockets.add(socket))
    await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve))
    const { port } = silent.address() as AddressInfo
    const db = databaseAt(`postgres://app:secret@127.0.0.1:${port}/app?sslmode=disable`)

    const startedAt = performance.now()
    expect(await new PostgresDatabaseProbe(db, 100).isReachable()).toBe(false)
    expect(performance.now() - startedAt).toBeLessThan(1_000)

    for (const socket of sockets) socket.destroy()
    silent.close()
    await db.destroy()
  })
})
