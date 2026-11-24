import type { LogoRecord } from '../logo'
import type { LogoRepository } from '../logo-repository.port'

const logo = (organizationId: string, id: string): LogoRecord => ({
  id,
  organizationId,
  type: 'image/png',
  width: 256,
  height: 128,
  size: 2048,
  updatedBy: 'user-ada',
  updatedAt: new Date('2026-11-20T12:00:00.000Z')
})

/**
 * What every `LogoRepository` must do (ADR 0076), run against the in-memory one and the Kysely one. `setup`
 * gives a repository confined to the organization a unit of work names.
 */
export function logoRepositoryContract(
  setup: () => Promise<{ run<T>(organizationId: string, work: (logos: LogoRepository) => Promise<T>): Promise<T> }>
) {
  describe('LogoRepository contract', () => {
    it('finds nothing before a logo is saved', async () => {
      const { run } = await setup()

      expect(await run('org-1', (logos) => logos.find('org-1'))).toBeNull()
    })

    it('saves a logo, then replaces it with the next', async () => {
      const { run } = await setup()
      await run('org-1', (logos) => logos.save(logo('org-1', 'logo-1')))
      await run('org-1', (logos) => logos.save({ ...logo('org-1', 'logo-2'), type: 'image/webp' }))

      expect(await run('org-1', (logos) => logos.find('org-1'))).toEqual({
        ...logo('org-1', 'logo-2'),
        type: 'image/webp'
      })
    })

    it('removes it, harmlessly when there is none, and leaves another organization’s', async () => {
      const { run } = await setup()
      await run('org-1', (logos) => logos.save(logo('org-1', 'logo-1')))
      await run('org-2', (logos) => logos.save(logo('org-2', 'logo-9')))

      await run('org-1', (logos) => logos.remove('org-1'))
      await run('org-1', (logos) => logos.remove('org-1'))

      expect(await run('org-1', (logos) => logos.find('org-1'))).toBeNull()
      expect(await run('org-2', (logos) => logos.find('org-2'))).toMatchObject({ id: 'logo-9' })
    })
  })
}
