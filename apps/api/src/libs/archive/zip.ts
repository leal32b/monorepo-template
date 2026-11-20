import { crc32, deflateRawSync } from 'node:zlib'

/** One file of an archive: its name, `/` between folders, and its text, written as UTF-8. */
export type ZipFile = { name: string; content: string }

/** Bit 11 of the flags: names are UTF-8. */
const UTF8_NAMES = 0x0800
const DEFLATE = 8
/** 2.0: deflate. */
const VERSION = 20

/** An instant as the MS-DOS time and date a zip keeps, read in UTC. */
function dosTime(at: Date): { time: number; date: number } {
  return {
    time: (at.getUTCHours() << 11) | (at.getUTCMinutes() << 5) | (at.getUTCSeconds() >> 1),
    date: ((at.getUTCFullYear() - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate()
  }
}

/**
 * A zip archive of `files`, each deflated and dated `modifiedAt` (ADR 0074), from `node:zlib` alone: no
 * dependency for what the export needs. Neither ZIP64 nor streaming: an archive and each file stay below
 * 4 GiB, which an export held in memory never nears.
 */
export function zip(files: readonly ZipFile[], modifiedAt: Date): Buffer {
  const { time, date } = dosTime(modifiedAt)
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const content = Buffer.from(file.content, 'utf8')
    const data = deflateRawSync(content)
    const checksum = crc32(content)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(VERSION, 4)
    local.writeUInt16LE(UTF8_NAMES, 6)
    local.writeUInt16LE(DEFLATE, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(content.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(VERSION, 4)
    central.writeUInt16LE(VERSION, 6)
    central.writeUInt16LE(UTF8_NAMES, 8)
    central.writeUInt16LE(DEFLATE, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(content.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)

    offset += local.length + name.length + data.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}
