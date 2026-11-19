import { RecordingShortMessageSender } from './recording-short-message-sender'

describe('RecordingShortMessageSender', () => {
  it('keeps every message in order, for a test to read', async () => {
    const sender = new RecordingShortMessageSender()

    await sender.send({ to: '+5511912345678', text: 'First.' })
    await sender.send({ to: '+5521998765432', text: 'Second.' })

    expect(sender.sent).toEqual([
      { to: '+5511912345678', text: 'First.' },
      { to: '+5521998765432', text: 'Second.' }
    ])
  })
})
