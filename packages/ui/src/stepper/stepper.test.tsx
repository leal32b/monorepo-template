import { render, screen } from '@solidjs/testing-library'
import { Stepper } from './stepper'

const steps = ['Confirm it is you', 'Connect the app', 'Save the codes']

describe('Stepper', () => {
  it('lists the steps in order, numbered', () => {
    render(() => <Stepper steps={steps} current={0} doneLabel="done" aria-label="Turn on" />)
    const items = screen.getAllByRole('listitem')

    expect(screen.getByRole('list', { name: 'Turn on' })).toBeInTheDocument()
    expect(items.map((item) => item.textContent)).toEqual(['1Confirm it is you', '2Connect the app', '3Save the codes'])
  })

  it('marks only the current step, which is bold', () => {
    render(() => <Stepper steps={steps} current={1} doneLabel="done" />)
    const items = screen.getAllByRole('listitem')

    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(items[1]).toHaveClass('font-medium')
    expect(items[0]).not.toHaveAttribute('aria-current')
    expect(items[2]).not.toHaveAttribute('aria-current')
  })

  it('shows a check and says "done" in text on the steps behind', () => {
    render(() => <Stepper steps={steps} current={2} doneLabel="done" />)
    const [first, second, third] = screen.getAllByRole('listitem')

    expect(first?.querySelector('svg')).not.toBeNull()
    expect(first).toHaveTextContent('Confirm it is youdone')
    expect(second).toHaveTextContent('Connect the appdone')
    expect(third?.querySelector('svg')).toBeNull()
    expect(third).not.toHaveTextContent('done')
  })

  it('colours the current and done markers, and leaves the steps to come plain', () => {
    const { container } = render(() => <Stepper steps={steps} current={1} doneLabel="done" />)
    const [done, current, next] = container.querySelectorAll('li > span[aria-hidden="true"]')

    expect(done).toHaveClass('border-success', 'text-success')
    expect(current).toHaveClass('bg-primary', 'text-primary-foreground')
    expect(next).toHaveClass('border-border-subtle')
    expect(next).not.toHaveClass('bg-primary', 'border-success')
  })

  it('adds a passed class to its own', () => {
    render(() => <Stepper steps={steps} current={0} doneLabel="done" class="mb-4" />)

    expect(screen.getByRole('list')).toHaveClass('mb-4', 'flex-wrap')
  })
})
