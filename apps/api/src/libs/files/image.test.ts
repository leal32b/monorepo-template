import { imageOf } from './image'

/** A PNG's signature and IHDR chunk: all a reader needs for its type and size. */
export function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header)
  header.writeUInt32BE(13, 8)
  header.write('IHDR', 12, 'latin1')
  header.writeUInt32BE(width, 16)
  header.writeUInt32BE(height, 20)
  return header
}

/** A JPEG with an APP0 segment, a padding byte and a baseline frame (SOF0) carrying the size. */
function jpeg(width: number, height: number, frame = 0xc0): Buffer {
  const app0 = [0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]
  const sof = [0xff, 0xff, frame, 0x00, 0x08, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff]
  return Buffer.from([0xff, 0xd8, ...app0, ...sof])
}

function riff(chunk: string, data: number[]): Buffer {
  const file = Buffer.alloc(30)
  file.write('RIFF', 0, 'latin1')
  file.write('WEBP', 8, 'latin1')
  file.write(chunk, 12, 'latin1')
  Buffer.from(data).copy(file, 20)
  return file
}

describe('imageOf (ADR 0076)', () => {
  it('reads a PNG’s size from its header', () => {
    expect(imageOf(png(640, 480))).toEqual({ type: 'image/png', width: 640, height: 480 })
  })

  it('reads a JPEG’s size from its frame header, past other segments and padding', () => {
    expect(imageOf(jpeg(300, 200))).toEqual({ type: 'image/jpeg', width: 300, height: 200 })
    expect(imageOf(jpeg(300, 200, 0xc2))).toEqual({ type: 'image/jpeg', width: 300, height: 200 })
  })

  it('finds no size in a JPEG that ends before its frame, or whose only 0xC_ marker is not a frame', () => {
    expect(imageOf(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00]))).toBeNull()
    expect(imageOf(jpeg(300, 200, 0xc4))).toBeNull()
    expect(imageOf(Buffer.from([0xff, 0xd8, 0x00, 0x00, 0x00, 0x00]))).toBeNull()
    expect(imageOf(jpeg(300, 200).subarray(0, 14))).toBeNull()
    expect(imageOf(Buffer.from([0xff, 0xd9, 0xff, 0xe0]))).toBeNull()
  })

  it('reads a lossy, a lossless and an extended WebP’s size', () => {
    expect(imageOf(riff('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, 0x80, 0x02, 0xe0, 0x01]))).toEqual({
      type: 'image/webp',
      width: 640,
      height: 480
    })
    // 640×480 lossless: width-1 in 14 bits, then height-1 in the next 14.
    const bits = 639 | (479 << 14)
    expect(imageOf(riff('VP8L', [0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, bits >>> 24]))).toEqual({
      type: 'image/webp',
      width: 640,
      height: 480
    })
    expect(imageOf(riff('VP8X', [0, 0, 0, 0, 0x7f, 0x02, 0x00, 0xdf, 0x01, 0x00]))).toEqual({
      type: 'image/webp',
      width: 640,
      height: 480
    })
  })

  it('finds nothing in a WebP of another chunk, a short file, an SVG or a page', () => {
    expect(imageOf(riff('ALPH', []))).toBeNull()
    expect(imageOf(png(1, 1).subarray(0, 20))).toBeNull()
    expect(imageOf(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(imageOf(Buffer.from('<!doctype html><script>alert(1)</script>'))).toBeNull()
    expect(imageOf(Buffer.alloc(0))).toBeNull()
  })
})
