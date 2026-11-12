import { JobRegistry } from './job-registry'
import { greet } from './testing/jobs.contract'

describe('JobRegistry', () => {
  it('finds the handler registered for a kind', () => {
    const registry = new JobRegistry()
    const handler = async () => {}

    registry.register(greet, handler)

    expect(registry.find('test.greet')).toEqual({ definition: greet, handler })
  })

  it('finds nothing for a kind nobody registered', () => {
    expect(new JobRegistry().find('test.greet')).toBeUndefined()
  })

  it('refuses a second handler for the same kind', () => {
    const registry = new JobRegistry()
    registry.register(greet, async () => {})

    expect(() => registry.register(greet, async () => {})).toThrow('test.greet')
  })
})
