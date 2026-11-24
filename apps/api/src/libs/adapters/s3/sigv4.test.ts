import { EMPTY_PAYLOAD_HASH, presignUrl, signRequest, uriEncode } from './sigv4'

/** The credentials and instant of AWS's own examples (docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html). */
const credentials = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1'
}
const now = new Date('2013-05-24T00:00:00Z')

describe('AWS Signature Version 4 (ADR 0076)', () => {
  it('signs an address in its query as AWS’s presigned GET example does', () => {
    const url = presignUrl(
      { method: 'GET', url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'), expiresInSeconds: 86_400, now },
      credentials
    )

    expect(url).toBe(
      'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
        '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request' +
        '&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host' +
        '&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'
    )
  })

  it('signs a request in its headers as AWS’s GET object example does', () => {
    const headers = signRequest(
      {
        method: 'GET',
        url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'),
        headers: { Range: 'bytes=0-9' },
        payloadHash: EMPTY_PAYLOAD_HASH,
        now
      },
      credentials
    )

    expect(headers).toEqual({
      Range: 'bytes=0-9',
      'x-amz-content-sha256': EMPTY_PAYLOAD_HASH,
      'x-amz-date': '20130524T000000Z',
      authorization:
        'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,' +
        'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,' +
        'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41'
    })
  })

  it('signs the headers an upload must send, and a query the address already has, in order', () => {
    const url = new URL(
      presignUrl(
        {
          method: 'PUT',
          url: new URL('https://store.example.com/bucket/a%20b?z=1&a=2&a=1'),
          headers: { 'Content-Type': 'image/png', 'Content-Length': '10' },
          expiresInSeconds: 300,
          now
        },
        credentials
      )
    )

    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host')
    expect(url.searchParams.get('z')).toBe('1')
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('encodes as S3 does: everything but letters, digits and -._~, and / only when asked', () => {
    expect(uriEncode("a b!'()*~/é")).toBe('a%20b%21%27%28%29%2A~%2F%C3%A9')
    expect(uriEncode('logos/org 1/x', false)).toBe('logos/org%201/x')
  })
})
