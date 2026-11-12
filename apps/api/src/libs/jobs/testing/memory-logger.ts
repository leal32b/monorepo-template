import { Writable } from 'node:stream'
import pino, { type Logger } from 'pino'

/** A logger whose JSON lines a test can read, without pino's own fields in the way. */
export function memoryLogger(): { logger: Logger; lines: Record<string, unknown>[] } {
  const lines: Record<string, unknown>[] = []
  const stream = new Writable({
    write(chunk, _encoding, done) {
      const { time: _time, pid: _pid, hostname: _hostname, ...line } = JSON.parse(String(chunk))
      lines.push(line)
      done()
    }
  })
  return { logger: pino({ level: 'debug' }, stream), lines }
}
