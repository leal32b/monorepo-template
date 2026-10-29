import worker, { type Env } from './worker'

const indexHtml = () => new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } })

function setup() {
  const assets = vi.fn(async (_request: Request) => indexHtml())
  const api = vi.fn(async (_input: URL, _init: RequestInit) => new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', api)
  const env: Env = { ASSETS: { fetch: assets }, API_ORIGIN: 'https://api.example.com', PROXY_SECRET: 'secret' }
  return { assets, api, env }
}

/** The URL and options the Worker sent to the API, which it must call exactly once. */
function forwarded(api: ReturnType<typeof setup>['api']) {
  expect(api).toHaveBeenCalledOnce()
  const [input, init] = api.mock.calls[0] ?? []
  return { url: String(input), init: init as RequestInit, headers: new Headers(init?.headers) }
}

describe('web Worker', () => {
  describe('/api/*', () => {
    it('forwards method, path, query, headers and body to the API origin', async () => {
      const { api, env } = setup()
      const request = new Request('https://web.example.com/api/auth/sign-in?next=%2Fhome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'session=abc', Origin: 'https://web.example.com' },
        body: '{"email":"a@example.com"}'
      })

      await worker.fetch(request, env)

      const { url, init, headers } = forwarded(api)
      expect(url).toBe('https://api.example.com/api/auth/sign-in?next=%2Fhome')
      expect(init.method).toBe('POST')
      expect(headers.get('Cookie')).toBe('session=abc')
      expect(headers.get('Origin')).toBe('https://web.example.com')
      expect(await new Response(init.body).text()).toBe('{"email":"a@example.com"}')
    })

    it('returns the API response unchanged, redirects included', async () => {
      const { api, env } = setup()
      const redirect = new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com/' } })
      api.mockResolvedValueOnce(redirect)

      const response = await worker.fetch(new Request('https://web.example.com/api/auth/sign-in/social'), env)

      expect(response).toBe(redirect)
      expect(forwarded(api).init.redirect).toBe('manual')
    })

    it('sets the proxy secret and the client IP, replacing what the client sent', async () => {
      const { api, env } = setup()
      const request = new Request('https://web.example.com/api/health', {
        headers: { 'X-Proxy-Secret': 'forged', 'X-Client-IP': '6.6.6.6', 'CF-Connecting-IP': '203.0.113.7' }
      })

      await worker.fetch(request, env)

      const { headers } = forwarded(api)
      expect(headers.get('X-Proxy-Secret')).toBe('secret')
      expect(headers.get('X-Client-IP')).toBe('203.0.113.7')
    })

    it('drops a client IP the client sent when Cloudflare gave none', async () => {
      const { api, env } = setup()

      await worker.fetch(
        new Request('https://web.example.com/api/health', { headers: { 'X-Client-IP': '6.6.6.6' } }),
        env
      )

      expect(forwarded(api).headers.has('X-Client-IP')).toBe(false)
    })

    it('does not forward the Host of the web origin', async () => {
      const { api, env } = setup()

      await worker.fetch(
        new Request('https://web.example.com/api/health', { headers: { Host: 'web.example.com' } }),
        env
      )

      expect(forwarded(api).headers.has('Host')).toBe(false)
    })
  })

  describe('paths that are not a file of the build', () => {
    it('serves index.html to a page load, so client-side routes survive a reload', async () => {
      const { assets, env } = setup()

      const response = await worker.fetch(
        new Request('https://web.example.com/settings/security', { headers: { 'Sec-Fetch-Mode': 'navigate' } }),
        env
      )

      expect(response.status).toBe(200)
      expect(assets.mock.calls[0]?.[0].url).toBe('https://web.example.com/')
    })

    it('treats a GET for HTML as a page load when the client sends no Fetch Metadata', async () => {
      const { assets, env } = setup()

      await worker.fetch(new Request('https://web.example.com/login', { headers: { Accept: 'text/html' } }), env)

      expect(assets).toHaveBeenCalledOnce()
    })

    it.each([
      ['a script from an older deploy', '/assets/index-old.js', { 'Sec-Fetch-Mode': 'no-cors' }],
      ['a fetch', '/login', { 'Sec-Fetch-Mode': 'cors', Accept: 'text/html' }],
      ['a request without Fetch Metadata', '/favicon.ico', {}]
    ])('answers 404 to %s', async (_case, path, headers) => {
      const { assets, api, env } = setup()

      const response = await worker.fetch(new Request(`https://web.example.com${path}`, { headers }), env)

      expect(response.status).toBe(404)
      expect(assets).not.toHaveBeenCalled()
      expect(api).not.toHaveBeenCalled()
    })
  })
})
