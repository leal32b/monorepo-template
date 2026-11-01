import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { OpenMail, type OpenMailProps } from './open-mail'

function renderOpen(props: OpenMailProps, locale: 'en' | 'pt-BR' = 'en') {
  render(() => (
    <I18nProvider locale={locale}>
      <OpenMail {...props} />
    </I18nProvider>
  ))
}

describe('OpenMail', () => {
  it('opens Gmail for a Gmail address, in a new tab, and says so to screen readers', () => {
    renderOpen({ email: 'ada@gmail.com' })

    const link = screen.getByRole('link', { name: 'Open Gmail (opens in a new tab)' })
    expect(link).toHaveAttribute('href', 'https://mail.google.com/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('opens Outlook for an Outlook address', () => {
    renderOpen({ email: 'ada@outlook.com' })

    expect(screen.getByRole('link', { name: /^Open Outlook/ })).toHaveAttribute(
      'href',
      'https://outlook.live.com/mail/'
    )
  })

  it('offers nothing for any other address', () => {
    renderOpen({ email: 'ada@example.com' })

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('is the primary action unless told otherwise', () => {
    renderOpen({ email: 'ada@gmail.com' })
    expect(screen.getByRole('link')).toHaveClass('bg-primary')
  })

  it('can sit beside another primary action as an outline', () => {
    renderOpen({ email: 'ada@gmail.com', variant: 'outline' })
    expect(screen.getByRole('link')).not.toHaveClass('bg-primary')
  })

  it('speaks the language of the provider', () => {
    renderOpen({ email: 'ada@gmail.com' }, 'pt-BR')

    expect(screen.getByRole('link', { name: /^Abrir o Gmail/ })).toBeInTheDocument()
  })
})
