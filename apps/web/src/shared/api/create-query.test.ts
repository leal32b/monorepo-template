import { createQuery } from './create-query'

describe('createQuery', () => {
  it('keeps an answer for the next read of its key, but not a failure, so the next read asks again', async () => {
    let calls = 0
    const read = createQuery(async (id: string) => {
      calls += 1
      if (calls === 1) throw new Error('The API could not be reached.')
      return `the answer for ${id}`
    }, 'a-read')

    await expect(read('a')).rejects.toThrow('The API could not be reached.')
    await expect(read('a')).resolves.toBe('the answer for a')
    await expect(read('a')).resolves.toBe('the answer for a')

    expect(calls).toBe(2)
  })
})
