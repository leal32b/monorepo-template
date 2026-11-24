import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { I18nProvider } from '#shared/config'
import { type Tab, TabBar } from './tab-bar'

const home: Tab = { href: '/acme', label: 'Home', icon: 'home' }
const customers: Tab = { href: '/acme/customers', label: 'Customers', icon: 'customers' }
const projects: Tab = { href: '/acme/projects', label: 'Projects', icon: 'folder' }
const notes: Tab = { href: '/acme/notes', label: 'Notes', icon: 'list' }

function renderBar({ screens = [home, customers], path = '/acme', onSearch = () => undefined } = {}) {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
        <MemoryRouter history={history}>
          <Route path="*" component={() => <TabBar screens={screens} path={() => path} onSearch={onSearch} />} />
        </MemoryRouter>
      </SessionProvider>
    </I18nProvider>
  ))
  return history
}

const tabs = () =>
  within(screen.getByRole('navigation', { name: 'Main' }))
    .getAllByRole('listitem')
    .map((tab) => tab.textContent)

/** Chooses a menu item the way a pointer does: released over it. */
const choose = (item: HTMLElement) => {
  fireEvent.pointerUp(item)
  fireEvent.click(item)
}

describe('TabBar (ADR 0080)', () => {
  it('holds the product’s screens, then Search, then You, at the bottom of a phone above its safe area', () => {
    renderBar()

    expect(tabs()).toEqual(['Home', 'Customers', 'Search', 'AYou'])
    const bar = screen.getByRole('navigation', { name: 'Main' })
    expect(bar).toHaveClass('fixed', 'bottom-0', 'pb-[env(safe-area-inset-bottom)]', 'md:hidden')
    // Every mark in a box as tall as You's avatar, so the labels share one line.
    for (const tab of bar.querySelectorAll('li > *')) expect(tab.firstElementChild).toHaveClass('size-6')
  })

  it('marks the screen on view, its icon in duotone', () => {
    renderBar({ path: '/acme/customers' })
    const bar = within(screen.getByRole('navigation', { name: 'Main' }))

    expect(bar.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page')
    expect(bar.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
    expect(bar.getByRole('link', { name: 'Customers' }).querySelector('svg')?.innerHTML).toContain('opacity')
  })

  it('opens the palette from Search, which ⌘K opens too', () => {
    const onSearch = vi.fn()
    renderBar({ onSearch })

    const search = screen.getByRole('button', { name: 'Search' })
    expect(search).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K')
    fireEvent.click(search)

    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('leads You to the person’s screen, by their round avatar, marked on any of their settings', () => {
    renderBar({ path: '/settings/security' })

    const you = screen.getByRole('link', { name: /You/ })
    expect(you).toHaveAttribute('href', '/settings')
    expect(you).toHaveAttribute('aria-current', 'page')
    expect(you.querySelector('[aria-hidden="true"]')).toHaveClass('rounded-full', 'size-6')
  })

  it('gives three screens a tab each', () => {
    renderBar({ screens: [home, customers, projects] })

    expect(tabs()).toEqual(['Home', 'Customers', 'Projects', 'Search', 'AYou'])
  })

  describe('past three screens', () => {
    it('keeps five tabs: two screens, then Modules with the rest', async () => {
      const history = renderBar({ screens: [home, customers, projects, notes] })

      expect(tabs()).toEqual(['Home', 'Customers', 'Modules', 'Search', 'AYou'])
      fireEvent.keyDown(screen.getByRole('button', { name: 'Modules' }), { key: 'Enter' })
      const menu = await screen.findByRole('menu')
      expect(
        within(menu)
          .getAllByRole('menuitem')
          .map((item) => item.textContent)
      ).toEqual(['Projects', 'Notes'])

      choose(within(menu).getByRole('menuitem', { name: 'Notes' }))

      await waitFor(() => expect(history.get()).toBe('/acme/notes'))
    })

    it('marks Modules while one of the rest is on view', () => {
      renderBar({ screens: [home, customers, projects, notes], path: '/acme/notes' })

      const modules = screen.getByRole('button', { name: 'Modules' })
      expect(modules).toHaveClass('font-medium', 'text-foreground')
      expect(modules.querySelector('svg')?.innerHTML).toContain('opacity')
    })
  })
})
