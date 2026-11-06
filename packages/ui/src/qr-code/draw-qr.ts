import { generate } from 'lean-qr'
import { toSvgPath } from 'lean-qr/extras/svg'

/** A drawn QR code: its side in modules, and the SVG path of its dark modules. */
export type DrawnQr = { size: number; path: string }

/** Draws `value` with lean-qr (ADR 0023): `QrCode` loads this module, and lean-qr with it, when it draws. */
export function drawQr(value: string): DrawnQr {
  const code = generate(value)
  return { size: code.size, path: toSvgPath(code) }
}
