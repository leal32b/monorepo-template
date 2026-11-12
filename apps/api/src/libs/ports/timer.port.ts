/** Waiting, behind a port so that tests never wait for real (as `Clock` is for "now"). */
export interface Timer {
  /** Resolves after `ms`, or as soon as `signal` aborts; never rejects. */
  wait(ms: number, signal?: AbortSignal): Promise<void>
}
