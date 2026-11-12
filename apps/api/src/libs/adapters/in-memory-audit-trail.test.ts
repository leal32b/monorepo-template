import { anEntry, describeAuditTrail } from '#libs/audit/testing/audit-trail.contract'
import { InMemoryAuditTrail } from './in-memory-audit-trail'
import { InMemoryUnitOfWork } from './in-memory-unit-of-work'

describeAuditTrail('InMemoryAuditTrail', async () => new InMemoryAuditTrail())

describe('InMemoryAuditTrail in a unit of work (ADR 0052)', () => {
  it('drops an entry recorded by work that throws', async () => {
    const audit = new InMemoryAuditTrail()
    const unitOfWork = new InMemoryUnitOfWork({ audit })
    await unitOfWork.run('org-1', (stores) => stores.audit.record(anEntry('e1')))

    const work = unitOfWork.run('org-1', async (stores) => {
      await stores.audit.record(anEntry('e2'))
      throw new Error('changed my mind')
    })

    await expect(work).rejects.toThrow('changed my mind')
    expect((await audit.list('org-1', { limit: 10 })).map((entry) => entry.id)).toEqual(['e1'])
  })
})
