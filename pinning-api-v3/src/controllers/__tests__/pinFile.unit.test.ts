import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getPinataClient } from '../../utils/pinata-client'
import pinFileController from '../pinFile'

vi.mock('../../utils/pinata-client', () => ({
  getPinataClient: vi.fn(),
}))

const mockUploadBase64 = vi.fn()
const mockClient = {
  upload: { public: { base64: mockUploadBase64 } },
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/pinFile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createDataURI(content: string, mimeType = 'text/plain') {
  const base64 = Buffer.from(content, 'utf-8').toString('base64')
  return `data:${mimeType};base64,${base64}`
}

describe('pinFile controller (unit)', () => {
  const env = { PINATA_JWT: 'test-jwt-token' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPinataClient).mockReturnValue(mockClient as any)
  })

  // ---- Happy path ----

  it('returns { uri: "ipfs://..." } on success', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmTestCid123' })
    const uri = createDataURI('hello world', 'text/plain')

    const response = await pinFileController(makeRequest({ uri }), env)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ uri: 'ipfs://QmTestCid123' })
    expect(mockUploadBase64).toHaveBeenCalledOnce()
  })

  it('returns application/json content-type on success', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmTest' })

    const response = await pinFileController(makeRequest({ uri: createDataURI('x') }), env)

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('passes the extracted base64 string to Pinata', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmABC' })
    const content = 'test content'
    const expectedBase64 = Buffer.from(content, 'utf-8').toString('base64')

    await pinFileController(makeRequest({ uri: createDataURI(content) }), env)

    expect(mockUploadBase64).toHaveBeenCalledWith(expectedBase64)
  })

  it('calls getPinataClient with the provided env', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmABC' })

    await pinFileController(makeRequest({ uri: createDataURI('hello') }), env)

    expect(vi.mocked(getPinataClient)).toHaveBeenCalledWith(env)
  })

  it('works with SVG image data URIs', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmSvg' })
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
    const uri = createDataURI(svg, 'image/svg+xml')

    const response = await pinFileController(makeRequest({ uri }), env)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.uri).toBe('ipfs://QmSvg')
  })

  // ---- Missing / invalid uri field ----

  it('returns 400 when uri is missing', async () => {
    const response = await pinFileController(makeRequest({}), env)
    const text = await response.text()

    expect(response.status).toBe(400)
    expect(text).toContain('uri is required')
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  it('returns 400 when uri is empty string', async () => {
    const response = await pinFileController(makeRequest({ uri: '' }), env)

    expect(response.status).toBe(400)
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  it('returns 400 when uri is null', async () => {
    const response = await pinFileController(makeRequest({ uri: null }), env)

    expect(response.status).toBe(400)
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  // ---- Invalid data URI formats ----

  it('returns 500 for a string without the data: prefix', async () => {
    const response = await pinFileController(makeRequest({ uri: 'not-a-data-uri' }), env)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('Invalid data URI format')
  })

  it('returns 500 for a data URI without the base64 separator', async () => {
    const response = await pinFileController(makeRequest({ uri: 'data:text/plain;hello' }), env)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('Invalid data URI: missing base64 data')
  })

  it('returns 500 for a data URI with empty base64 segment', async () => {
    const response = await pinFileController(makeRequest({ uri: 'data:text/plain;base64,' }), env)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('Invalid data URI: empty base64 data')
  })

  it('returns 500 for a data URI with invalid base64 characters', async () => {
    const response = await pinFileController(
      makeRequest({ uri: 'data:text/plain;base64,!!!not-valid-base64!!!' }),
      env
    )
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('Invalid base64 encoding')
  })

  // ---- Size validation ----

  it('returns 500 when the decoded file exceeds the 5 MB limit', async () => {
    const largeContent = 'x'.repeat(5 * 1024 * 1024 + 1)
    const uri = createDataURI(largeContent)

    const response = await pinFileController(makeRequest({ uri }), env)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('File too large')
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  it('accepts a file exactly at the 5 MB limit', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmMaxSize' })
    const maxContent = 'x'.repeat(5 * 1024 * 1024)
    const uri = createDataURI(maxContent)

    const response = await pinFileController(makeRequest({ uri }), env)

    expect(response.status).toBe(200)
  })

  // ---- Pinata / env errors ----

  it('returns 500 when PINATA_JWT is missing', async () => {
    vi.mocked(getPinataClient).mockImplementation(() => {
      throw new Error('PINATA_JWT is required')
    })

    const response = await pinFileController(
      makeRequest({ uri: createDataURI('hello') }),
      { PINATA_JWT: undefined }
    )
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('PINATA_JWT is required')
  })

  it('returns 500 when Pinata returns a response with no CID', async () => {
    mockUploadBase64.mockResolvedValue({})

    const response = await pinFileController(makeRequest({ uri: createDataURI('hello') }), env)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('Invalid response from Pinata: missing CID')
  })

  it('returns 500 and propagates the error message when Pinata upload throws', async () => {
    mockUploadBase64.mockRejectedValue(new Error('Pinata upload failed'))

    const response = await pinFileController(makeRequest({ uri: createDataURI('hello') }), env)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('Pinata upload failed')
  })
})
