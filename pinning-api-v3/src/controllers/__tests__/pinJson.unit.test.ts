import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getPinataClient } from '../../utils/pinata-client'
import pinJsonController from '../pinJson'

vi.mock('../../utils/pinata-client', () => ({
  getPinataClient: vi.fn(),
}))

const mockUploadBase64 = vi.fn()
const mockClient = {
  upload: { public: { base64: mockUploadBase64 } },
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/pinJson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('pinJson controller (unit)', () => {
  const env = { PINATA_JWT: 'test-jwt-token' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPinataClient).mockReturnValue(mockClient as any)
  })

  // ---- Happy path ----

  it('returns { uri: "ipfs://..." } on success', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmTestCid456' })
    const json = { name: 'test', value: 42 }

    const response = await pinJsonController(makeRequest({ json }), env)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ uri: 'ipfs://QmTestCid456' })
    expect(mockUploadBase64).toHaveBeenCalledOnce()
  })

  it('returns application/json content-type on success', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmTest' })

    const response = await pinJsonController(makeRequest({ json: { x: 1 } }), env)

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('passes a base64-encoded JSON string to Pinata', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmABC' })
    const json = { key: 'value', number: 99 }
    const expectedBase64 = Buffer.from(JSON.stringify(json), 'utf-8').toString('base64')

    await pinJsonController(makeRequest({ json }), env)

    expect(mockUploadBase64).toHaveBeenCalledWith(expectedBase64)
  })

  it('calls getPinataClient with the provided env', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmABC' })

    await pinJsonController(makeRequest({ json: { x: 1 } }), env)

    expect(vi.mocked(getPinataClient)).toHaveBeenCalledWith(env)
  })

  it('handles complex nested objects', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmComplex' })
    const json = {
      metadata: { title: 'Test', tags: ['a', 'b'] },
      data: [{ id: 1 }, { id: 2 }],
    }

    const response = await pinJsonController(makeRequest({ json }), env)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.uri).toBe('ipfs://QmComplex')
  })

  it('handles arrays as the json value', async () => {
    mockUploadBase64.mockResolvedValue({ cid: 'QmArray' })

    const response = await pinJsonController(makeRequest({ json: [1, 2, 3] }), env)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.uri).toBe('ipfs://QmArray')
  })

  // ---- Missing / falsy json field ----

  it('returns 400 when json field is absent', async () => {
    const response = await pinJsonController(makeRequest({}), env)
    const text = await response.text()

    expect(response.status).toBe(400)
    expect(text).toContain('json is required')
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  it('returns 400 when json is null', async () => {
    const response = await pinJsonController(makeRequest({ json: null }), env)
    const text = await response.text()

    expect(response.status).toBe(400)
    expect(text).toContain('json is required')
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  it('returns 400 when json is 0 (falsy number)', async () => {
    const response = await pinJsonController(makeRequest({ json: 0 }), env)

    expect(response.status).toBe(400)
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  it('returns 400 when json is an empty string', async () => {
    const response = await pinJsonController(makeRequest({ json: '' }), env)

    expect(response.status).toBe(400)
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  it('returns 400 when json is false', async () => {
    const response = await pinJsonController(makeRequest({ json: false }), env)

    expect(response.status).toBe(400)
    expect(mockUploadBase64).not.toHaveBeenCalled()
  })

  // ---- Pinata / env errors ----

  it('returns 500 when PINATA_JWT is missing', async () => {
    vi.mocked(getPinataClient).mockImplementation(() => {
      throw new Error('PINATA_JWT is required')
    })

    const response = await pinJsonController(
      makeRequest({ json: { x: 1 } }),
      { PINATA_JWT: undefined }
    )
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('PINATA_JWT is required')
  })

  it('returns 500 when Pinata returns a response with no CID', async () => {
    mockUploadBase64.mockResolvedValue({})

    const response = await pinJsonController(makeRequest({ json: { x: 1 } }), env)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('Invalid response from Pinata: missing CID')
  })

  it('returns 500 and propagates the error message when Pinata upload throws', async () => {
    mockUploadBase64.mockRejectedValue(new Error('Network error'))

    const response = await pinJsonController(makeRequest({ json: { x: 1 } }), env)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).toContain('Network error')
  })
})
