import pino from 'pino'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryFileStorage } from '#libs/adapters/in-memory-file-storage'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { JobRegistry } from '#libs/jobs/job-registry'
import { deleteFiles, deleteOrganizationFiles, registerStorageJobs, StorageOrganizationDeletion } from './delete-files'

async function setUp() {
  const storage = new InMemoryFileStorage()
  for (const key of ['logos/org-1/a', 'uploads/org-1/b', 'exports/org-1/c.zip', 'logos/org-2/a']) {
    await storage.write(key, Buffer.from('x'), { type: 'image/png' })
  }
  const registry = new JobRegistry()
  const logger = pino({ level: 'silent' })
  registerStorageJobs(registry, { storage, logger })
  const run = <P>(kind: string, payload: P) =>
    registry.find(kind)?.handler(payload, { jobId: 'job-1', attempt: 1, signal: new AbortController().signal })
  return { storage, run, logger }
}

describe('the store’s jobs (ADR 0076)', () => {
  it('deletes the files it names, harmlessly when one is gone already', async () => {
    const { storage, run } = await setUp()

    await run(deleteFiles.kind, { keys: ['logos/org-1/a', 'logos/org-1/gone'] })

    expect([...storage.files.keys()]).toEqual(['uploads/org-1/b', 'exports/org-1/c.zip', 'logos/org-2/a'])
  })

  it('deletes every file of an organization, and only its own', async () => {
    const { storage, run } = await setUp()

    await run(deleteOrganizationFiles.kind, { organizationId: 'org-1' })

    expect([...storage.files.keys()]).toEqual(['logos/org-2/a'])
  })

  it('takes only keys of the store’s shape, and an organization id that names no path', () => {
    expect(deleteFiles.schema.safeParse({ keys: ['../etc/passwd'] }).success).toBe(false)
    expect(deleteFiles.schema.safeParse({ keys: [] }).success).toBe(false)
    expect(deleteOrganizationFiles.schema.safeParse({ organizationId: 'org/1' }).success).toBe(false)
  })

  it('enqueues the deletion of each organization’s files before the organizations go', async () => {
    const jobs = new InMemoryJobs(new UuidGenerator(), new FixedClock(new Date('2026-11-20T12:00:00Z')))

    await new StorageOrganizationDeletion(jobs).beforeDelete(['org-1', 'org-2'])

    expect(jobs.all.map(({ kind, payload }) => ({ kind, payload }))).toEqual([
      { kind: 'storage.delete-organization', payload: { organizationId: 'org-1' } },
      { kind: 'storage.delete-organization', payload: { organizationId: 'org-2' } }
    ])
  })
})
