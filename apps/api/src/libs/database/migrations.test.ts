import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { discoverMigrations } from './migrations'

describe('discoverMigrations', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  const write = (...files: string[]) => {
    for (const file of files) writeFileSync(join(dir, file), 'select 1;')
  }

  it('lists the migration ids in the order of their numbers', () => {
    write('0002_add_members.sql', '0001_create_organizations.sql', '0010_add_roles.sql')

    expect(discoverMigrations(dir)).toEqual(['0001_create_organizations', '0002_add_members', '0010_add_roles'])
  })

  it('finds nothing in an empty folder', () => {
    expect(discoverMigrations(dir)).toEqual([])
  })

  it('ignores hidden files such as .gitkeep and .DS_Store', () => {
    write('.gitkeep', '.DS_Store', '0001_create_organizations.sql')

    expect(discoverMigrations(dir)).toEqual(['0001_create_organizations'])
  })

  it.each(['0002-add-members.sql', '2_add_members.sql', '0002_add_members.SQL', 'notes.md'])(
    'rejects the unexpected file %j',
    (file) => {
      write(file)

      expect(() => discoverMigrations(dir)).toThrow(`Unexpected file in the migrations folder: ${file}`)
    }
  )

  it('rejects two migrations that share a number', () => {
    write('0003_add_projects.sql', '0003_add_tasks.sql')

    expect(() => discoverMigrations(dir)).toThrow(
      'Migrations 0003_add_projects.sql and 0003_add_tasks.sql share the number 0003'
    )
  })
})
