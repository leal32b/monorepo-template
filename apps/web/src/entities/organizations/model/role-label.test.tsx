import { render, screen } from '@solidjs/testing-library'
import { I18nProvider, type Locale } from '#shared/config'
import { useRoleLabel } from './role-label'

function Labels() {
  const label = useRoleLabel()
  return <p>{['owner', 'admin', 'member', 'editor'].map(label).join(', ')}</p>
}

const renderLabels = (locale: Locale) =>
  render(() => (
    <I18nProvider locale={locale}>
      <Labels />
    </I18nProvider>
  ))

describe('useRoleLabel', () => {
  it('names the built-in roles in the user’s language and leaves an organization’s own role as it was named', () => {
    renderLabels('pt-BR')

    expect(screen.getByText('Proprietário, Administrador, Membro, editor')).toBeInTheDocument()
  })

  it('says them in English too', () => {
    renderLabels('en')

    expect(screen.getByText('Owner, Admin, Member, editor')).toBeInTheDocument()
  })
})
