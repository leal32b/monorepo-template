/** What the Worker is given: the build's assets (`wrangler.jsonc`) and the deploy's variable and secret. */
export type Env = {
  /** The static assets of the Vite build. */
  ASSETS: { fetch(request: Request): Promise<Response> }
  /** Origin of the API, e.g. `https://<service>.onrender.com` (ADR 0019). */
  API_ORIGIN: string
  /** Proves to the API that a request came through this Worker (ADR 0022). */
  PROXY_SECRET: string
}

/** A page load (address bar, link, redirect) rather than a script, a style or a `fetch`. */
function isNavigation(request: Request): boolean {
  const mode = request.headers.get('Sec-Fetch-Mode')
  if (mode !== null) return mode === 'navigate'
  // Clients without Fetch Metadata: a GET asking for HTML is a page load.
  return request.method === 'GET' && (request.headers.get('Accept') ?? '').includes('text/html')
}

/** How long to wait before asking a waking API again. */
const wakeRetryDelay = 3_000
/** Below the web's `readTimeout` (90 s), so a read that gives up here still gets an answer in time. */
const wakeDeadline = 80_000

/** Render's answer while it wakes a sleeping service: the request never reached the API. */
const isWaking = (response: Response) =>
  response.status === 429 && (response.headers.get('X-Render-Routing') ?? '').startsWith('hibernate')

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Forwards the request to the API as it came: method, path, query, headers and body. Only the
 * headers the API trusts are set here, replacing whatever the client sent (ADR 0022). Redirects
 * are returned, not followed: an OAuth redirect is for the browser.
 *
 * A free host answers 429 while it wakes the API; the request is sent again until the API answers, so
 * the browser sees one slow request and the screen says the server is waking up (ADR 0041, ADR 0062).
 */
async function proxyToApi(request: Request, url: URL, env: Env): Promise<Response> {
  const headers = new Headers(request.headers)
  headers.delete('Host') // the API's host comes from API_ORIGIN
  headers.set('X-Proxy-Secret', env.PROXY_SECRET)
  const clientIp = request.headers.get('CF-Connecting-IP')
  if (clientIp === null) headers.delete('X-Client-IP')
  else headers.set('X-Client-IP', clientIp)
  // Read once, so a request Render refused can be sent again.
  const body = request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer()
  const send = () =>
    fetch(new URL(`${url.pathname}${url.search}`, env.API_ORIGIN), {
      method: request.method,
      headers,
      body,
      redirect: 'manual'
    })

  const giveUpAt = Date.now() + wakeDeadline
  let response = await send()
  while (isWaking(response) && Date.now() + wakeRetryDelay < giveUpAt) {
    await wait(wakeRetryDelay)
    response = await send()
  }
  return response
}

const notFound = () =>
  new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

/**
 * Runs for `/api/*` and for any path that is not a file of the build. The API answers the first.
 * A page load gets the app's `index.html`, so client-side routes survive a reload. Anything else,
 * such as a hashed asset from an older deploy or `/favicon.ico`, is a real 404.
 */
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return proxyToApi(request, url, env)
    if (isNavigation(request)) return env.ASSETS.fetch(new Request(new URL('/', url), request))
    return Promise.resolve(notFound())
  }
}
