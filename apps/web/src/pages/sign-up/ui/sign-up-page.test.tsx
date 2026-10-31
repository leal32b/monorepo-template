import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { SignUpPage } from './sign-up-page'

function renderPage() {
  const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json({ token: null, user: { id: 'u1', email: 'ada@example.com', name: 'Ada' } })
  )
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <MemoryRouter>
          <Route path="*" component={SignUpPage} />
        </MemoryRouter>
      </AuthProvider>
    </I18nProvider>
  ))
  return fetch
}

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

/** Signs up with this email and waits for "check your email". */
async function signUp(email: string) {
  type(screen.getByRole('textbox', { name: 'Name' }), 'Ada Lovelace')
  type(screen.getByRole('textbox', { name: 'Email' }), email)
  type(screen.getByLabelText('Password'), 'correct horse battery staple')
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  await screen.findByRole('heading', { level: 1, name: 'Check your email' })
}

describe('SignUpPage', () => {
  it('opens on the sign-up form, with a way to sign in instead', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('after the sign-up, tells the user to check the inbox the link went to', async () => {
    renderPage()

    type(screen.getByRole('textbox', { name: 'Name' }), 'Ada Lovelace')
    type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com')
    type(screen.getByLabelText('Password'), 'correct horse battery staple')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    const heading = await screen.findByRole('heading', { level: 1, name: 'Check your email' })
    expect(heading).toHaveFocus()
    expect(screen.getByText('We sent a link to ada@example.com.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument()
  })

  it('sends the link again to the address it went to, for when it did not arrive', async () => {
    const fetch = renderPage()
    await signUp('ada@example.com')

    expect(screen.getByText('Not in your inbox? Check spam, or send it again.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send it again' }))

    expect(await screen.findByRole('status')).toHaveTextContent('We sent it again.')
    expect(JSON.parse(String(fetch.mock.lastCall?.[1]?.body))).toMatchObject({ email: 'ada@example.com' })
  })

  it('goes back with what was typed, to use another email', async () => {
    renderPage()
    await signUp('ada@exmaple.com')

    fireEvent.click(screen.getByRole('button', { name: 'Use another email' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada Lovelace')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('ada@exmaple.com')
  })
})
