import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    /** Connection string of the test Postgres. */
    databaseUrl: string
  }
}

/**
 * Starts one in-memory Postgres (PGlite) behind a TCP socket for the whole `api-db` run, so
 * adapters connect through the same `pg` driver as in production (ADR 0013).
 */
export default async function setup(project: TestProject) {
  const db = await PGlite.create()
  const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 10 })
  await server.start()
  project.provide('databaseUrl', `postgres://postgres:postgres@${server.getServerConn()}/postgres?sslmode=disable`)

  return async () => {
    await server.stop()
    await db.close()
  }
}
