import { type ClientErrorReport, clientErrorLimits } from '@repo/contracts'

/** What a page may send before it stops (ADR 0072): a loop that throws on every frame costs this many requests. */
const pageCap = 5

export type ErrorReporter = {
  /**
   * Tells the API about an error nobody handled and returns the reference the screen can show, or `undefined`
   * when nothing was sent (the page reached its cap). An error that repeats an earlier one is not sent again and
   * gets the earlier one's reference. It never throws: reporting an error must not cause another.
   */
  report(kind: ClientErrorReport['kind'], error: unknown): string | undefined
  /** Which screen is on view, as the router's pattern, never the address: it names where the next report came from. */
  setRoute(pattern: string): void
}

export type ErrorReporterOptions = {
  send: (report: ClientErrorReport) => void
  /** The commit this build came from (`VITE_RELEASE`). */
  release: string
  /** Makes the reference the user quotes; random, so two pages never share one. */
  reference?: () => string
  cap?: number
}

/** 12 random hex characters: enough to find one line, and nothing that says who the user is. */
const randomReference = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12)

/**
 * What a message or a stack must not carry out of the browser (ADR 0072): an email address, and the query or
 * fragment of an address, where a search or a token may sit. Best effort: our own code puts no user data in an
 * error, and what a library quotes is cut at the limits.
 */
const scrub = (text: string) =>
  text
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}/g, '[email]')
    .replace(/((?:https?:\/\/|\/)[^\s?#]*)[?#]\S+/g, '$1')

function describe(error: unknown): { message: string; stack: string | undefined } {
  if (error instanceof Error) return { message: error.message || error.name, stack: error.stack }
  return { message: String(error), stack: undefined }
}

export function createErrorReporter({
  send,
  release,
  reference = randomReference,
  cap = pageCap
}: ErrorReporterOptions): ErrorReporter {
  const sent = new Map<string, string>()
  let route = '/'
  return {
    setRoute: (pattern) => {
      route = pattern
    },
    report(kind, error) {
      const { message, stack } = describe(error)
      const key = `${scrub(message)}\n${scrub(stack?.split('\n')[1] ?? '')}`
      const earlier = sent.get(key)
      if (earlier !== undefined) return earlier
      if (sent.size >= cap) return undefined
      const made = reference()
      sent.set(key, made)
      const report: ClientErrorReport = {
        kind,
        message: scrub(message).slice(0, clientErrorLimits.message),
        stack: stack === undefined ? undefined : scrub(stack).slice(0, clientErrorLimits.stack),
        route: route.slice(0, clientErrorLimits.route),
        release,
        reference: made
      }
      try {
        send(report)
      } catch {
        // Nothing to do: the report is lost, the page goes on.
      }
      return made
    }
  }
}

/** How a report leaves the page: the beacon first, and a keepalive `fetch` when the browser has none or refuses. */
export type ReportTransport = {
  url: string
  beacon?: ((url: string, data: Blob) => boolean) | undefined
  fetch: (url: string, init: RequestInit) => Promise<unknown>
}

/**
 * Posts one report. `sendBeacon` goes on after the page is gone, which is when an error is often the last thing
 * it did; `fetch` with `keepalive` does the same where there is no beacon. Neither is waited for or retried.
 */
export function sendReport({ url, beacon, fetch }: ReportTransport, report: ClientErrorReport): void {
  const body = JSON.stringify(report)
  try {
    if (beacon?.(url, new Blob([body], { type: 'application/json' }))) return
  } catch {
    // Fall back below.
  }
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
    () => undefined
  )
}
