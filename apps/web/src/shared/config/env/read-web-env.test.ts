import { readWebEnv } from './read-web-env'

describe('readWebEnv', () => {
  it('calls the API on the same origin when VITE_API_BASE_URL is missing or empty', () => {
    expect(readWebEnv({})).toEqual({ apiBaseUrl: '', release: 'dev' })
    expect(readWebEnv({ VITE_API_BASE_URL: '' })).toEqual({ apiBaseUrl: '', release: 'dev' })
  })

  it('takes the origin of the API', () => {
    expect(readWebEnv({ VITE_API_BASE_URL: 'https://api.example.com' })).toEqual({
      apiBaseUrl: 'https://api.example.com',
      release: 'dev'
    })
  })

  it('takes the release the deploy built, the commit (ADR 0072), and is `dev` without one', () => {
    expect(readWebEnv({ VITE_RELEASE: '3e75fa2c' }).release).toBe('3e75fa2c')
    expect(readWebEnv({ VITE_RELEASE: '' }).release).toBe('dev')
  })

  it('rejects a release the API would refuse in a report', () => {
    expect(() => readWebEnv({ VITE_RELEASE: 'two words' })).toThrow('VITE_RELEASE')
  })

  it.each(['https://api.example.com/', 'https://api.example.com/api', 'ftp://api.example.com', 'not a url'])(
    'rejects %j: it must be an http(s) origin',
    (value) => {
      expect(() => readWebEnv({ VITE_API_BASE_URL: value })).toThrow('VITE_API_BASE_URL')
    }
  )
})
