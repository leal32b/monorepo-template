import { EmptyState } from '@repo/ui'
import { screen } from '@solidjs/testing-library'
import { renderOrganizationPage } from '../../../test-organization-page'
import { GuardedScreen, type GuardedScreenProps } from './guarded-screen'

function Boom(): never {
  throw new Error('The read failed')
}

function renderScreen(props: Partial<GuardedScreenProps> = {}, children = () => <p>The content</p>) {
  renderOrganizationPage({
    page: () => (
      <GuardedScreen
        title="Notes"
        allowed
        icon="activity"
        noAccess={{ title: 'You cannot see notes here', description: 'Ask an owner.' }}
        unavailable="We could not load the notes."
        {...props}
      >
        {children()}
      </GuardedScreen>
    ),
    path: '/notes'
  })
}

describe('GuardedScreen', () => {
  it('draws the content under the screen title for whoever may read', () => {
    renderScreen()

    expect(screen.getByRole('heading', { level: 1, name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByText('The content')).toBeInTheDocument()
  })

  it('says what is missing, and draws nothing of the content, for whoever may not', () => {
    renderScreen({ allowed: false })

    expect(screen.getByRole('heading', { level: 1, name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByText('You cannot see notes here')).toBeInTheDocument()
    expect(screen.getByText('Ask an owner.')).toBeInTheDocument()
    expect(screen.queryByText('The content')).not.toBeInTheDocument()
  })

  it('draws the screen own refusal in place of the content, such as a plan without the capability', () => {
    renderScreen({ refusal: () => <EmptyState icon="activity" title="Not in your plan" description="Upgrade." /> })

    expect(screen.getByText('Not in your plan')).toBeInTheDocument()
    expect(screen.queryByText('The content')).not.toBeInTheDocument()
  })

  it('draws the content when the refusal has nothing to say', () => {
    renderScreen({ refusal: () => undefined })

    expect(screen.getByText('The content')).toBeInTheDocument()
  })

  it('says a read that failed in the one alert, keeping the title', () => {
    renderScreen({}, () => <Boom />)

    expect(screen.getByRole('alert')).toHaveTextContent('We could not load the notes.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Notes' })).toBeInTheDocument()
  })
})
