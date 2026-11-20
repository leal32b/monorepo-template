/** The image types a logo may be (ADR 0076): no SVG, which can carry script. */
export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp'

export type Image = { type: ImageType; width: number; height: number }

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function pngOf(bytes: Buffer): Image | null {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG) || bytes.toString('latin1', 12, 16) !== 'IHDR') {
    return null
  }
  return { type: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** The start-of-frame markers, which carry the size: 0xC0 to 0xCF but DHT (C4), JPG (C8) and DAC (CC). */
const isFrame = (marker: number) => marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)

function jpegOf(bytes: Buffer): Image | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let at = 2
  while (at + 3 < bytes.length) {
    if (bytes[at] !== 0xff) return null
    const marker = bytes[at + 1] as number
    if (marker === 0xff) {
      at += 1 // padding before a marker
      continue
    }
    if (isFrame(marker)) {
      if (at + 9 > bytes.length) return null
      return { type: 'image/jpeg', height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) }
    }
    at += 2 + bytes.readUInt16BE(at + 2)
  }
  return null
}

function webpOf(bytes: Buffer): Image | null {
  if (bytes.length < 30 || bytes.toString('latin1', 0, 4) !== 'RIFF' || bytes.toString('latin1', 8, 12) !== 'WEBP') {
    return null
  }
  const size = (width: number, height: number): Image => ({ type: 'image/webp', width, height })
  switch (bytes.toString('latin1', 12, 16)) {
    case 'VP8 ':
      return size(bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff)
    case 'VP8L': {
      const bits = bytes.readUInt32LE(21)
      return size((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1)
    }
    case 'VP8X':
      return size(bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1)
    default:
      return null
  }
}

/**
 * The type and size of a PNG, JPEG or WebP, read from its header bytes, or `null` for anything else (ADR
 * 0076). The bytes decide, never the name or the type a browser claimed: an SVG, a page or a polyglot that
 * does not start as one of the three is nothing.
 */
export function imageOf(bytes: Buffer): Image | null {
  return pngOf(bytes) ?? jpegOf(bytes) ?? webpOf(bytes)
}
