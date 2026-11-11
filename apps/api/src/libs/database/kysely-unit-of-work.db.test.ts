import { type Kysely, sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from './database'
import { KyselyUnitOfWork } from './kysely-unit-of-work'

const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

const add = (on: Kysely<unknown>, id: string) => sql`insert into unit_of_work_note (id) values (${id})`.execute(on)
const ids = async () =>
  (await sql<{ id: string }>`select id from unit_of_work_note order by id`.execute(db)).rows.map((row) => row.id)

beforeAll(async () => {
  await sql`create table unit_of_work_note (id text primary key)`.execute(db)
})

beforeEach(async () => {
  await sql`truncate unit_of_work_note`.execute(db)
})

afterAll(async () => {
  await sql`drop table unit_of_work_note`.execute(db)
  await db.destroy()
})

describe('KyselyUnitOfWork (ADR 0052)', () => {
  const unitOfWork = new KyselyUnitOfWork(db, (trx) => ({ add: (id: string) => add(trx, id) }))

  it('commits every write and returns what the work returns', async () => {
    const result = await unitOfWork.run(async (notes) => {
      await notes.add('a')
      await notes.add('b')
      return 'done'
    })

    expect(result).toBe('done')
    expect(await ids()).toEqual(['a', 'b'])
  })

  it('rolls the first write back when the second fails, and lets the error through', async () => {
    await add(db, 'kept')

    const work = unitOfWork.run(async (notes) => {
      await notes.add('a')
      await notes.add('kept')
    })

    await expect(work).rejects.toMatchObject({ code: '23505' })
    expect(await ids()).toEqual(['kept'])
  })

  it('rolls back when the work throws after its writes', async () => {
    const work = unitOfWork.run(async (notes) => {
      await notes.add('a')
      throw new Error('changed my mind')
    })

    await expect(work).rejects.toThrow('changed my mind')
    expect(await ids()).toEqual([])
  })
})
