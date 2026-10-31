import { totpSetupOf } from './totp-setup'

const uri = 'otpauth://totp/Monorepo%20Template:ada%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Monorepo%20Template'
const backupCodes = ['a8Kd2-Xm9Qz', 'b7Le3-Yn8Ra']

describe('totpSetupOf', () => {
  it("reads Better Auth's answer: the URI, the key to type in groups of four, and the backup codes", () => {
    expect(totpSetupOf({ method: 'totp', totpURI: uri, backupCodes })).toEqual({
      uri,
      key: 'JBSW Y3DP EHPK 3PXP',
      backupCodes
    })
  })

  it('finds nothing to set up in an answer without a key for an app', () => {
    expect(totpSetupOf({ method: 'otp' })).toBeUndefined()
    expect(totpSetupOf({ method: 'totp', totpURI: 'otpauth://totp/Example', backupCodes })).toBeUndefined()
  })
})
