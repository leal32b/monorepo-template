import { HttpProblem } from './problem'
import { type HttpHandler, HttpRouter } from './router'

const handler: HttpHandler = () => {}

describe('HttpRouter', () => {
  it('finds the handler of a registered route', () => {
    const router = new HttpRouter()
    router.get('/api/health', handler)

    expect(router.match('GET', '/api/health')).toEqual({
      kind: 'found',
      pattern: '/api/health',
      handler,
      params: {}
    })
  })

  it('ignores a trailing slash', () => {
    const router = new HttpRouter()
    router.get('/api/health', handler)

    expect(router.match('GET', '/api/health/').kind).toBe('found')
  })

  it('extracts path parameters, percent-decoded', () => {
    const router = new HttpRouter()
    router.get('/api/projects/:id', handler)

    const match = router.match('GET', '/api/projects/a%20b')

    expect(match).toMatchObject({ kind: 'found', params: { id: 'a b' } })
  })

  it('does not match a path with a different number of segments', () => {
    const router = new HttpRouter()
    router.get('/api/projects/:id', handler)

    expect(router.match('GET', '/api/projects')).toEqual({ kind: 'not-found' })
    expect(router.match('GET', '/api/projects/1/extra')).toEqual({ kind: 'not-found' })
  })

  it('does not match a different literal segment', () => {
    const router = new HttpRouter()
    router.get('/api/health', handler)

    expect(router.match('GET', '/api/other')).toEqual({ kind: 'not-found' })
  })

  it('reports the allowed methods when the path exists with another method', () => {
    const router = new HttpRouter()
    router.get('/api/projects', handler)
    router.post('/api/projects', handler)

    expect(router.match('DELETE', '/api/projects')).toEqual({
      kind: 'method-not-allowed',
      pattern: '/api/projects',
      allow: ['GET', 'POST']
    })
  })

  it('routes each method of a path to its own handler', () => {
    const router = new HttpRouter()
    const read: HttpHandler = () => {}
    const write: HttpHandler = () => {}
    router.get('/api/projects', read)
    router.post('/api/projects', write)

    expect(router.match('POST', '/api/projects')).toMatchObject({ kind: 'found', handler: write })
  })

  it('supports put and delete', () => {
    const router = new HttpRouter()
    router.put('/api/projects/:id', handler)
    router.delete('/api/projects/:id', handler)

    expect(router.match('PUT', '/api/projects/1').kind).toBe('found')
    expect(router.match('DELETE', '/api/projects/1').kind).toBe('found')
  })

  it('rejects a malformed percent-encoding as a 400 problem', () => {
    const router = new HttpRouter()
    router.get('/api/projects/:id', handler)

    expect(() => router.match('GET', '/api/projects/%E0%A4%A')).toThrow(HttpProblem)
    expect(() => router.match('GET', '/api/projects/%E0%A4%A')).toThrow(
      expect.objectContaining({ status: 400, code: 'invalid_path' })
    )
  })
})
