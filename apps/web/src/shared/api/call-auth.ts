/** What went wrong with a call to Better Auth, with what a screen needs to explain it. */
export type AuthFailure = {
  /** The answer's status; `undefined` when the API could not be reached. */
  status: number | undefined
  /** Better Auth's error code, such as `PASSWORD_COMPROMISED`, when the answer has one. */
  code: string | undefined
  /** The `X-Request-Id` the API logged the request under, for support to find it. */
  requestId: string | undefined
}

export type AuthCallOptions = {
  onError: (context: { response: Response }) => void
}

/**
 * Runs one call of the Better Auth client and returns what went wrong, or `undefined` when nothing
 * did. The client throws when the API cannot be reached; that comes back as a failure without a status.
 */
export async function callAuth(
  call: (options: AuthCallOptions) => Promise<{ error: { status: number; code?: string | undefined } | null }>
): Promise<AuthFailure | undefined> {
  let requestId: string | undefined
  const onError = ({ response }: { response: Response }) => {
    requestId = response.headers.get('X-Request-Id') ?? undefined
  }

  try {
    const { error } = await call({ onError })
    return error ? { status: error.status, code: error.code, requestId } : undefined
  } catch {
    return { status: undefined, code: undefined, requestId: undefined }
  }
}
