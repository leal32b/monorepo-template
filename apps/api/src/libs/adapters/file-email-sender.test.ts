import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { FileEmailSender } from './file-email-sender'

describe('FileEmailSender', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'outbox-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('appends each message as one JSON line, so a test can read the link that was sent', async () => {
    const outbox = path.join(dir, 'outbox.jsonl')
    const sender = new FileEmailSender(outbox)
    const first = { to: 'ada@example.com', subject: 'Confirm', text: 'Open https://app.test/a', html: '<p>a</p>' }
    const second = { to: 'bob@example.com', subject: 'Reset', text: 'Open https://app.test/b', html: '<p>b</p>' }

    await sender.send(first)
    await sender.send(second)

    const lines = readFileSync(outbox, 'utf8').trimEnd().split('\n')
    expect(lines.map((line) => JSON.parse(line))).toEqual([first, second])
  })
})
