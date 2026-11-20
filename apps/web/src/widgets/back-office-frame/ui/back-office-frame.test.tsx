import { screen } from '@solidjs/testing-library'
import { renderBackOffice } from '../../../test-back-office'
import { BackOfficeFrame } from './back-office-frame'

describe('BackOfficeFrame (ADR 0077)', () => {
  it('marks the section on view, offers the other and the way back to the app', async () => {
    renderBackOffice({
      at: '/admin/organizations/org-1',
      routes: [{ path: '/admin/organizations/:id', component: () => <BackOfficeFrame>Page</BackOfficeFrame> }],
      api: async () => Response.json({ impersonation: null })
    })

    expect(await screen.findByRole('link', { name: 'Organizations' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Users' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Back to the app' })).toHaveAttribute('href', '/')
  })
})
