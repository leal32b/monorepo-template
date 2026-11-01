import { createApiClient } from '#shared/api'
import { getIdentityOptions, loadIdentityOptions } from './get-identity-options'

const clientAnswering = (fetch: () => Promise<Response>) => createApiClient({ fetch })

describe('getIdentityOptions', () => {
  it('reads what the API offers, checked against the contract', async () => {
    const client = clientAnswering(async () => Response.json({ google: true }))

    await expect(getIdentityOptions(client)).resolves.toEqual({ google: true })
  })
})

describe('loadIdentityOptions', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('gives the options when the API answers in time', async () => {
    const client = clientAnswering(async () => Response.json({ google: false }))

    await expect(loadIdentityOptions(client, 1500)).resolves.toEqual({ google: false })
  })

  it('gives up with undefined when the API is slower than it will wait', async () => {
    const client = clientAnswering(() => new Promise<Response>(() => {}))
    const result = loadIdentityOptions(client, 1500)

    await vi.advanceTimersByTimeAsync(1500)

    await expect(result).resolves.toBeUndefined()
  })

  it('gives up with undefined when the API fails', async () => {
    const client = clientAnswering(async () => {
      throw new TypeError('Failed to fetch')
    })

    await expect(loadIdentityOptions(client, 1500)).resolves.toBeUndefined()
  })
})
