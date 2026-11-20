import { InMemoryLogoRepository } from './in-memory-logo-repository'
import { logoRepositoryContract } from './logo-repository.contract'

logoRepositoryContract(async () => {
  const logos = new InMemoryLogoRepository()
  return { run: (_organizationId, work) => work(logos) }
})

describe('InMemoryLogoRepository', () => {
  it('puts itself back as a snapshot found it', async () => {
    const logos = new InMemoryLogoRepository()
    const restore = logos.snapshot()
    await logos.remove('org-1')

    restore()

    expect(await logos.find('org-1')).toBeNull()
  })
})
