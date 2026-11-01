import { type ApiProblem, apiProblemSchema } from '@repo/contracts'
import type * as z from 'zod/mini'

export type ApiErrorKind = 'network' | 'http' | 'contract'

/** Everything that can go wrong talking to the API, sorted by what the UI should say about it. */
export class ApiError extends Error {
  readonly status: number | undefined
  readonly problem: ApiProblem | undefined

  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    options: { status?: number; problem?: ApiProblem | undefined; cause?: unknown } = {}
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'ApiError'
    this.status = options.status
    this.problem = options.problem
  }
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export type ApiClientOptions = {
  fetch: Fetch
  /** Origin of the API. Empty means same origin (the dev proxy, or a reverse proxy in production). */
  baseUrl?: string
}

export type GetOptions = {
  /** Error statuses whose body is still part of the contract: validated by the schema and returned. */
  accept?: readonly number[]
}

/** The JSON body of a response, or `undefined` when it is not JSON. */
const readJson = (response: Response): Promise<unknown> => response.json().catch(() => undefined)

export function createApiClient({ fetch, baseUrl = '' }: ApiClientOptions) {
  async function get<T>(path: string, schema: z.ZodMiniType<T>, { accept = [] }: GetOptions = {}): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      })
    } catch (cause) {
      throw new ApiError('network', 'The API could not be reached.', { cause })
    }

    const body = await readJson(response)

    if (!response.ok && !accept.includes(response.status)) {
      const problem = apiProblemSchema.safeParse(body)
      throw new ApiError('http', `The API answered ${response.status}.`, {
        status: response.status,
        problem: problem.success ? problem.data : undefined
      })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('contract', `The response of ${path} does not satisfy its contract.`, {
        status: response.status
      })
    }
    return parsed.data
  }

  return { get }
}
