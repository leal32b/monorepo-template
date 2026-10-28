import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Kysely, PostgresDialect, sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from './database'
import { runMigrations } from './migrations'

describe('runMigrations', () => {
  const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
  let dir: string

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-'))
    await sql.raw('drop schema public cascade; create schema public;').execute(db)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  afterAll(() => db.destroy())

  const write = (file: string, content: string) => writeFileSync(join(dir, file), content)

  const tableExists = async (name: string) =>
    (await sql<{ found: string | null }>`select to_regclass(${name}) as found`.execute(db)).rows[0]?.found !== null

  const recorded = async () =>
    (await sql<{ id: string }>`select id from schema_migration order by id`.execute(db)).rows.map((row) => row.id)

  const advisoryLocks = async () =>
    (await sql<{ count: number }>`select count(*)::int as count from pg_locks where locktype = 'advisory'`.execute(db))
      .rows[0]?.count

  /** Statements sent while no transaction was open: a transaction pooler may run each on another connection. */
  const outsideTransactions = (statements: string[]) => {
    const outside: string[] = []
    let open = false
    for (const statement of statements) {
      if (/^begin\b/i.test(statement)) open = true
      else if (/^(commit|rollback)\b/i.test(statement)) open = false
      else if (!open) outside.push(statement.trim())
    }
    return outside
  }

  it('applies pending migrations in order and records each one', async () => {
    write('0001_create_items.sql', 'create table items (id int primary key);')
    write('0002_seed_items.sql', 'insert into items values (1); insert into items values (2);')

    expect(await runMigrations(db, dir)).toEqual(['0001_create_items', '0002_seed_items'])
    expect(await recorded()).toEqual(['0001_create_items', '0002_seed_items'])
    expect((await sql<{ count: number }>`select count(*)::int as count from items`.execute(db)).rows[0]?.count).toBe(2)
  })

  it('skips migrations already applied', async () => {
    write('0001_create_items.sql', 'create table items (id int primary key);')
    await runMigrations(db, dir)

    expect(await runMigrations(db, dir)).toEqual([])
  })

  it('rolls back a failing migration whole and keeps the ones before it', async () => {
    write('0001_create_items.sql', 'create table items (id int primary key);')
    write('0002_broken.sql', 'create table tags (id int); select 1 / 0;')

    await expect(runMigrations(db, dir)).rejects.toThrow('division by zero')
    expect(await tableExists('items')).toBe(true)
    expect(await tableExists('tags')).toBe(false)
    expect(await recorded()).toEqual(['0001_create_items'])
  })

  it('releases the advisory lock, even after a failure', async () => {
    write('0001_broken.sql', 'select 1 / 0;')

    await expect(runMigrations(db, dir)).rejects.toThrow()
    expect(await advisoryLocks()).toBe(0)
  })

  it('runs every statement inside a transaction, as a transaction pooler requires', async () => {
    const statements: string[] = []
    const logged = new Kysely<unknown>({
      dialect: new PostgresDialect({ pool: createPool(inject('databaseUrl'), pino({ level: 'silent' })) }),
      log: (event) => {
        statements.push(event.query.sql)
      }
    })
    write('0001_create_items.sql', 'create table items (id int primary key);')

    await runMigrations(logged, dir)
    await logged.destroy()

    expect(statements).toContain('begin')
    expect(outsideTransactions(statements)).toEqual([])
  })
})
