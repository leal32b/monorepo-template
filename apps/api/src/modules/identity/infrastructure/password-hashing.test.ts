import { hashPassword, verifyPassword } from './password-hashing'

const password = 'correct horse battery staple'

describe('password hashing (Argon2id)', () => {
  it('writes a PHC string with the OWASP cost and a fresh salt each time', async () => {
    const hash = await hashPassword(password)

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/)
    expect(await hashPassword(password)).not.toBe(hash)
  })

  it('verifies the password it hashed, and no other', async () => {
    const hash = await hashPassword(password)

    expect(await verifyPassword({ hash, password })).toBe(true)
    expect(await verifyPassword({ hash, password: `${password}!` })).toBe(false)
  })

  it('verifies with the cost written in the hash, so the cost can grow later', async () => {
    // From the OpenSSL CLI, another implementation: openssl kdf -keylen 24 -kdfopt pass:'correct horse
    // battery staple' -kdfopt salt:somesaltsomesalt -kdfopt iter:3 -kdfopt memcost:8192 -kdfopt lanes:2 ARGON2ID
    const hash = '$argon2id$v=19$m=8192,t=3,p=2$c29tZXNhbHRzb21lc2FsdA$2PlnkQoxdPUvcmVpps/sLy1v/pLOJZe9'

    expect(await verifyPassword({ hash, password })).toBe(true)
  })

  it.each([
    ['an empty string', ''],
    ["Better Auth's default scrypt", 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:0f1e2d3c4b5a69788796a5b4c3d2e1f0'],
    ['Argon2i, another variant', '$argon2i$v=19$m=8192,t=3,p=2$c29tZXNhbHRzb21lc2FsdA$2PlnkQoxdPUvcmVpps/sLy1v/pLOJZe9']
  ])('never matches %s', async (_case, hash) => {
    expect(await verifyPassword({ hash, password })).toBe(false)
  })
})
