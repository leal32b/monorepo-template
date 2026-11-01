import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { BackupCodes } from './backup-codes'

const codes = ['a8Kd2-Xm9Qz', 'b7Le3-Yn8Ra']

function renderCodes(onSaved = vi.fn()) {
  render(() => (
    <I18nProvider locale="en">
      <BackupCodes codes={codes} email="ada@example.com" message="Two-step verification is on." onSaved={onSaved} />
    </I18nProvider>
  ))
  return onSaved
}

describe('BackupCodes', () => {
  it('lists the codes after what just happened, which takes focus so it is read first', () => {
    renderCodes()

    expect(screen.getByText('Two-step verification is on.')).toHaveFocus()
    const list = screen.getByRole('list', { name: 'Backup codes' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(codes)
  })

  it('downloads them as a text file that says what they are for', () => {
    renderCodes()
    const link = screen.getByRole('link', { name: 'Download' })

    expect(link).toHaveAttribute('download', 'backup-codes.txt')
    const [type, text = ''] = String(link.getAttribute('href')).split(',')
    expect(type).toBe('data:text/plain;charset=utf-8')
    expect(decodeURIComponent(text)).toBe(
      'Backup codes for ada@example.com on Monorepo Template. Each one signs you in once.\n\na8Kd2-Xm9Qz\nb7Le3-Yn8Ra\n'
    )
  })

  it('copies them, one per line, and says so', async () => {
    renderCodes()

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied.'))
    expect(await navigator.clipboard.readText()).toBe('a8Kd2-Xm9Qz\nb7Le3-Yn8Ra')
  })

  it('says what to do when the browser does not let them be copied', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new DOMException('Not allowed'))
    renderCodes()

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Could not copy. Download them, or select and copy them.')
    )
  })

  it('is done once the user says the codes are saved', () => {
    const onSaved = renderCodes()

    fireEvent.click(screen.getByRole('button', { name: 'I saved them' }))

    expect(onSaved).toHaveBeenCalled()
  })
})
