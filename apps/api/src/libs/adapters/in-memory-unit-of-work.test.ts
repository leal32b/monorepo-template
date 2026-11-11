import { type InMemoryStore, InMemoryUnitOfWork } from './in-memory-unit-of-work'

class Notes implements InMemoryStore {
  items: string[] = []

  snapshot(): () => void {
    const before = [...this.items]
    return () => {
      this.items = before
    }
  }
}

describe('InMemoryUnitOfWork', () => {
  const setup = () => {
    const first = new Notes()
    const second = new Notes()
    return { first, second, unitOfWork: new InMemoryUnitOfWork({ first, second }) }
  }

  it('keeps every write and returns what the work returns', async () => {
    const { first, second, unitOfWork } = setup()

    const result = await unitOfWork.run(async (stores) => {
      stores.first.items.push('a')
      stores.second.items.push('b')
      return 'done'
    })

    expect(result).toBe('done')
    expect([first.items, second.items]).toEqual([['a'], ['b']])
  })

  it('puts every store back when the work throws, and lets the error through', async () => {
    const { first, second, unitOfWork } = setup()
    first.items.push('kept')

    const work = unitOfWork.run(async (stores) => {
      stores.first.items.push('a')
      stores.second.items.push('b')
      throw new Error('the second write failed')
    })

    await expect(work).rejects.toThrow('the second write failed')
    expect([first.items, second.items]).toEqual([['kept'], []])
  })
})
