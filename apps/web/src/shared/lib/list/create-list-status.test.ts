import { createRoot } from 'solid-js'
import { createListStatus } from './create-list-status'

/** The status a list screen draws: one line in the row the user acted on, one below the section. */
function inRoot<T>(use: (status: ReturnType<typeof createListStatus>, panels: { dismiss: () => void }) => T): T {
  return createRoot((dispose) => {
    const panels = { dismiss: vi.fn() }
    const outcome = use(createListStatus(panels), panels)
    dispose()
    return outcome
  })
}

describe('createListStatus', () => {
  it('says nothing until something is said', () => {
    inRoot((status) => {
      expect(status.row('c1')).toBeUndefined()
      expect(status.section()).toBeUndefined()
    })
  })

  it('says a line in one row only', () => {
    inRoot((status) => {
      status.sayRow('c1', 'Ada was saved.')

      expect(status.row('c1')).toBe('Ada was saved.')
      expect(status.row('c2')).toBeUndefined()
    })
  })

  it('keeps the line of the row last spoken to, not of every row', () => {
    inRoot((status) => {
      status.sayRow('c1', 'Ada was saved.')
      status.sayRow('c2', 'Grace was saved.')

      expect(status.row('c1')).toBeUndefined()
      expect(status.row('c2')).toBe('Grace was saved.')
    })
  })

  it('says a line below the section', () => {
    inRoot((status) => {
      status.saySection('Katherine was saved.')

      expect(status.section()).toBe('Katherine was saved.')
    })
  })

  it('forgets both lines when the user starts something else', () => {
    inRoot((status) => {
      status.sayRow('c1', 'Ada was saved.')
      status.saySection('Katherine was saved.')

      status.forget()

      expect(status.row('c1')).toBeUndefined()
      expect(status.section()).toBeUndefined()
    })
  })

  it('says a row left the list below the section, and dismisses the panel it had open', () => {
    inRoot((status, panels) => {
      status.left('Ada was archived.')

      expect(status.section()).toBe('Ada was archived.')
      expect(panels.dismiss).toHaveBeenCalledTimes(1)
    })
  })
})
