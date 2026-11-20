import type { ErrorReporter } from './error-reporter'

/**
 * Reports what no code handled (ADR 0072): an uncaught error and a rejected promise nobody caught. It only
 * reports; the browser still logs the error in its console. Returns the function that stops listening.
 */
export function listenForErrors(target: Window, reporter: ErrorReporter): () => void {
  const onError = (event: ErrorEvent) => reporter.report('error', event.error ?? event.message)
  const onRejection = (event: PromiseRejectionEvent) => reporter.report('unhandledrejection', event.reason)
  target.addEventListener('error', onError)
  target.addEventListener('unhandledrejection', onRejection)
  return () => {
    target.removeEventListener('error', onError)
    target.removeEventListener('unhandledrejection', onRejection)
  }
}
