import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const app = join(import.meta.dirname, '..')
const script = readFileSync(join(app, 'public/theme.js'), 'utf8')
const root = document.documentElement

/** Runs `public/theme.js` the way the browser does before the first paint. */
const run = () => new Function(script)()

describe('the theme script in <head> (ADR 0028)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    delete root.dataset.theme
  })

  it('loads before the app, as a blocking file the CSP allows', () => {
    const html = readFileSync(join(app, 'index.html'), 'utf8')
    const head = html.slice(0, html.indexOf('</head>'))

    expect(head).toContain('<script src="/theme.js"></script>')
    expect(html.indexOf('/theme.js')).toBeLessThan(html.indexOf('/src/main.tsx'))
  })

  it.each(['light', 'dark'])('puts the stored %s theme on the page, as the app does', (theme) => {
    localStorage.setItem('theme', theme)

    run()

    expect(root).toHaveAttribute('data-theme', theme)
  })

  it('leaves the page to the system when nothing, or something else, is stored', () => {
    run()
    localStorage.setItem('theme', 'sepia')
    run()

    expect(root).not.toHaveAttribute('data-theme')
  })

  it('does not throw when the browser blocks storage', () => {
    localStorage.setItem('theme', 'dark')
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })

    expect(run).not.toThrow()
    expect(root).not.toHaveAttribute('data-theme')
  })
})
