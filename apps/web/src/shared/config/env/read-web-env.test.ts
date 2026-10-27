import { readWebEnv } from './read-web-env'

describe('readWebEnv', () => {
  it('calls the API on the same origin when VITE_API_BASE_URL is missing or empty', () => {
    expect(readWebEnv({})).toEqual({ apiBaseUrl: '' })
    expect(readWebEnv({ VITE_API_BASE_URL: '' })).toEqual({ apiBaseUrl: '' })
  })

  it('takes the origin of the API', () => {
    expect(readWebEnv({ VITE_API_BASE_URL: 'https://api.example.com' })).toEqual({
      apiBaseUrl: 'https://api.example.com'
    })
  })

  it.each(['https://api.example.com/', 'https://api.example.com/api', 'ftp://api.example.com', 'not a url'])(
    'rejects %j: it must be an http(s) origin',
    (value) => {
      expect(() => readWebEnv({ VITE_API_BASE_URL: value })).toThrow('VITE_API_BASE_URL')
    }
  )
})
