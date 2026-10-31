import { render, screen } from '@solidjs/testing-library'
import { generate } from 'lean-qr'
import { toSvgPath } from 'lean-qr/extras/svg'
import { QrCode } from './qr-code'

const uri = 'otpauth://totp/Example:ada%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example'

describe('QrCode', () => {
  it('draws the value as an image named by its label, with the quiet zone scanners need around it', () => {
    render(() => <QrCode value={uri} label="QR code for your authenticator app" />)
    const image = screen.getByRole('img', { name: 'QR code for your authenticator app' })
    const code = generate(uri)

    expect(image.querySelector('path')).toHaveAttribute('d', toSvgPath(code))
    expect(image).toHaveAttribute('viewBox', `-4 -4 ${code.size + 8} ${code.size + 8}`)
  })

  it('is dark on light in both themes, since not every scanner reads a light code on dark', () => {
    render(() => <QrCode value={uri} label="QR code" />)

    expect(screen.getByRole('img', { name: 'QR code' })).toHaveClass('bg-qr', 'text-qr-foreground')
  })

  it('takes a class for its size, which overrides its own', () => {
    render(() => <QrCode value={uri} label="QR code" class="size-56" />)
    const image = screen.getByRole('img', { name: 'QR code' })

    expect(image).toHaveClass('size-56')
    expect(image).not.toHaveClass('size-48')
  })
})
