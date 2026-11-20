import { render } from '@solidjs/testing-library'
import { ErrorReporterProvider, useErrorReporter } from './error-reporter-context'

describe('useErrorReporter', () => {
  it('is a reporter that sends nothing outside a provider, so a screen under test needs none', () => {
    let reference: string | undefined = 'x'
    function Probe() {
      const reporter = useErrorReporter()
      reporter.setRoute('/somewhere')
      reference = reporter.report('render', new Error('boom'))
      return null
    }

    render(() => <Probe />)

    expect(reference).toBeUndefined()
  })

  it('is the one the provider holds', () => {
    const reporter = { report: vi.fn(() => 'ref'), setRoute: vi.fn() }
    function Probe() {
      useErrorReporter().report('render', new Error('boom'))
      return null
    }

    render(() => (
      <ErrorReporterProvider reporter={reporter}>
        <Probe />
      </ErrorReporterProvider>
    ))

    expect(reporter.report).toHaveBeenCalledOnce()
  })
})
