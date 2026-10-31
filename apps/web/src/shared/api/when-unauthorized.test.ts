import { z } from 'zod'
import { createApiClient } from './client'
import { whenUnauthorized } from './when-unauthorized'

/** A client whose every answer is `status`, with the handler watching it. */
function clientAnswering(status: number) {
  const handle = vi.fn()
  const client = whenUnauthorized(
    createApiClient({ fetch: async () => Response.json({ code: 'unauthenticated' }, { status }) }),
    handle
  )
  return { client, handle }
}

describe('whenUnauthorized', () => {
  it('calls the handler when an answer is 401, and still fails, so the caller stops', async () => {
    const { client, handle } = clientAnswering(401)

    await expect(client.get('/api/projects', z.object({}))).rejects.toMatchObject({ status: 401 })
    expect(handle).toHaveBeenCalledOnce()
  })

  it('leaves every other answer alone', async () => {
    const failing = clientAnswering(500)
    const answering = clientAnswering(200)

    await expect(failing.client.get('/api/projects', z.object({}))).rejects.toMatchObject({ status: 500 })
    await expect(answering.client.get('/api/projects', z.object({}))).resolves.toBeDefined()
    expect([failing.handle, answering.handle].map((handle) => handle.mock.calls.length)).toEqual([0, 0])
  })
})
