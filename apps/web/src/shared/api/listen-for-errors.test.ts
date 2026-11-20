import type { ErrorReporter } from './error-reporter'
import { listenForErrors } from './listen-for-errors'

const reporterOf = () => ({ report: vi.fn(() => 'ref'), setRoute: vi.fn() }) satisfies ErrorReporter

describe('listenForErrors (ADR 0072)', () => {
  it('reports an uncaught error with the error it carries', () => {
    const reporter = reporterOf()
    const stop = listenForErrors(window, reporter)
    const error = new Error('boom')

    window.dispatchEvent(new ErrorEvent('error', { error, message: 'boom' }))

    expect(reporter.report).toHaveBeenCalledWith('error', error)
    stop()
  })

  it('reports an error with no error object by its message', () => {
    const reporter = reporterOf()
    const stop = listenForErrors(window, reporter)

    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))

    expect(reporter.report).toHaveBeenCalledWith('error', 'Script error.')
    stop()
  })

  it('reports a promise nobody caught, with its reason', () => {
    const reporter = reporterOf()
    const stop = listenForErrors(window, reporter)
    const reason = new Error('rejected')
    const event = new Event('unhandledrejection')
    Object.assign(event, { reason })

    window.dispatchEvent(event)

    expect(reporter.report).toHaveBeenCalledWith('unhandledrejection', reason)
    stop()
  })

  it('stops listening when told to', () => {
    const reporter = reporterOf()
    listenForErrors(window, reporter)()

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('late') }))

    expect(reporter.report).not.toHaveBeenCalled()
  })
})
