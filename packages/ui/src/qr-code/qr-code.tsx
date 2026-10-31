import { generate } from 'lean-qr'
import { toSvgPath } from 'lean-qr/extras/svg'
import { createMemo } from 'solid-js'
import { cn } from '#libs'

/** The light margin around the code, in modules: the 4 the QR standard asks for. */
const quietZone = 4

export type QrCodeProps = {
  /** What the code holds, such as an `otpauth://` URI. */
  value: string
  /** Names the image for screen readers: what scanning it does. */
  label: string
  class?: string | undefined
}

/**
 * A QR code, drawn as SVG in the browser by lean-qr (ADR 0023), so what it holds never leaves the
 * page. Dark modules on a light ground with the standard quiet zone, in both themes, since not every
 * scanner reads a light code on dark. It takes its size from a class and stays sharp at any size.
 */
export function QrCode(props: QrCodeProps) {
  const code = createMemo(() => generate(props.value))
  const side = () => code().size + 2 * quietZone

  return (
    <svg
      role="img"
      aria-label={props.label}
      viewBox={`${-quietZone} ${-quietZone} ${side()} ${side()}`}
      shape-rendering="crispEdges"
      class={cn('block size-48 rounded-md bg-qr text-qr-foreground', props.class)}
    >
      <path d={toSvgPath(code())} fill="currentColor" />
    </svg>
  )
}
