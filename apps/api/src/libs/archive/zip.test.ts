import { inflateRawSync } from 'node:zlib'
import { zip } from './zip'

/** Reads a zip by its central directory, as an unzip tool does: each file's name, time and content. */
function unzip(archive: Buffer): { name: string; modified: string; content: string }[] {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const count = archive.readUInt16LE(end + 10)
  let at = archive.readUInt32LE(end + 16)
  const files = []
  for (let index = 0; index < count; index++) {
    expect(archive.readUInt32LE(at)).toBe(0x02014b50)
    const time = archive.readUInt16LE(at + 12)
    const date = archive.readUInt16LE(at + 14)
    const compressed = archive.readUInt32LE(at + 20)
    const nameLength = archive.readUInt16LE(at + 28)
    const offset = archive.readUInt32LE(at + 42)
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString('utf8')
    const dataAt = offset + 30 + archive.readUInt16LE(offset + 26) + archive.readUInt16LE(offset + 28)
    const content = inflateRawSync(archive.subarray(dataAt, dataAt + compressed)).toString('utf8')
    const pad = (n: number) => String(n).padStart(2, '0')
    const modified = `${(date >> 9) + 1980}-${pad((date >> 5) & 15)}-${pad(date & 31)}T${pad(time >> 11)}:${pad((time >> 5) & 63)}:${pad((time & 31) * 2)}`
    files.push({ name, modified, content })
    at += 46 + nameLength
  }
  return files
}

describe('zip', () => {
  const at = new Date('2026-11-19T14:30:08.000Z')

  it('holds each file with its name and content, deflated', () => {
    const archive = zip(
      [
        { name: 'customers.csv', content: 'name\r\nAda\r\n'.repeat(100) },
        { name: 'é.csv', content: 'ç' }
      ],
      at
    )

    expect(unzip(archive).map(({ name, content }) => ({ name, content }))).toEqual([
      { name: 'customers.csv', content: 'name\r\nAda\r\n'.repeat(100) },
      { name: 'é.csv', content: 'ç' }
    ])
    expect(archive.length).toBeLessThan(400)
  })

  it('dates every file with the instant it is given, in UTC', () => {
    expect(unzip(zip([{ name: 'a.csv', content: '' }], at))[0]?.modified).toBe('2026-11-19T14:30:08')
  })

  it('marks names as UTF-8 and checks each file with its CRC-32', () => {
    const archive = zip([{ name: 'a.csv', content: 'abc' }], at)

    expect(archive.readUInt16LE(6) & 0x0800).toBe(0x0800)
    expect(archive.readUInt32LE(14)).toBe(0x352441c2)
  })

  it('is an empty archive with no files', () => {
    expect(unzip(zip([], at))).toEqual([])
  })
})
