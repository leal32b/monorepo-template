import { validateBackupCode, validateCode } from './validate-code'

describe('validateCode', () => {
  it('takes the six digits, without the spaces or dashes some apps show between them', () => {
    expect(validateCode({ code: ' 123 456 ' })).toEqual({ ok: true, values: { code: '123456' } })
    expect(validateCode({ code: '123-456' })).toEqual({ ok: true, values: { code: '123456' } })
  })

  it('asks for six digits, and refuses a code the API already said is wrong', () => {
    expect(validateCode({ code: '12345' })).toEqual({ ok: false, problems: { code: 'codeInvalid' } })
    expect(validateCode({ code: '12a456' })).toEqual({ ok: false, problems: { code: 'codeInvalid' } })
    expect(validateCode({ code: '123456' }, new Set(['123456']))).toEqual({
      ok: false,
      problems: { code: 'codeWrong' }
    })
  })
})

describe('validateBackupCode', () => {
  it('takes the code as it was saved, letters as they are, adding the dash when it was left out', () => {
    expect(validateBackupCode({ code: ' a8Kd2-Xm9Qz ' })).toEqual({ ok: true, values: { code: 'a8Kd2-Xm9Qz' } })
    expect(validateBackupCode({ code: 'a8Kd2Xm9Qz' })).toEqual({ ok: true, values: { code: 'a8Kd2-Xm9Qz' } })
  })

  it('asks for a code of that shape, and refuses one the API already said is wrong or used', () => {
    expect(validateBackupCode({ code: '123456' })).toEqual({ ok: false, problems: { code: 'backupInvalid' } })
    expect(validateBackupCode({ code: 'a8Kd2-Xm9Qz' }, new Set(['a8Kd2-Xm9Qz']))).toEqual({
      ok: false,
      problems: { code: 'backupWrong' }
    })
  })
})
