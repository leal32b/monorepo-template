import { toCsv } from './csv'

describe('toCsv', () => {
  it('writes a header and one line per row, with a byte-order mark and CRLF (RFC 4180)', () => {
    expect(toCsv(['name', 'age'], [['Ada', 36]])).toBe('﻿name,age\r\nAda,36\r\n')
  })

  it('writes an empty file as its header alone', () => {
    expect(toCsv(['name'], [])).toBe('﻿name\r\n')
  })

  it('writes instants in ISO 8601 UTC, booleans as words, and nothing for null', () => {
    expect(toCsv(['at', 'on', 'note'], [[new Date('2026-11-19T12:00:00.000Z'), true, null]])).toBe(
      '﻿at,on,note\r\n2026-11-19T12:00:00.000Z,true,\r\n'
    )
  })

  it.each([
    ['a comma', 'Doe, Jane', '"Doe, Jane"'],
    ['a quote', 'say "hi"', '"say ""hi"""'],
    ['a line break', 'one\ntwo', '"one\ntwo"'],
    ['a carriage return', 'one\rtwo', '"one\rtwo"'],
    ['a space at an end', ' padded', '" padded"']
  ])('quotes a value with %s', (_case, value, written) => {
    expect(toCsv(['v'], [[value]])).toBe(`﻿v\r\n${written}\r\n`)
  })

  it.each([
    ['=HYPERLINK("http://x")', `"'=HYPERLINK(""http://x"")"`],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['+cmd', "'+cmd"],
    ['-2+3', "'-2+3"],
    ['\tTab', "'\tTab"]
  ])('keeps a spreadsheet from reading %s as a formula (T61)', (value, written) => {
    expect(toCsv(['v'], [[value]])).toBe(`﻿v\r\n${written}\r\n`)
  })

  it.each(['+55 11 91234-5678', '-12', '+1 (555) 010-0000'])('leaves a phone or a number as it is: %s', (value) => {
    expect(toCsv(['v'], [[value]])).toBe(`﻿v\r\n${value}\r\n`)
  })
})
