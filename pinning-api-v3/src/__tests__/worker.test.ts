import { vi, describe, it, expect, beforeEach } from 'vitest'
import worker from '../index'

// Mock both controllers so tests don't reach Pinata
vi.mock('../controllers/pinFile', () => ({
  default: vi.fn(),
}))
vi.mock('../controllers/pinJson', () => ({
  default: vi.fn(),
}))

import pinFile from '../controllers/pinFile'
import pinJson from '../controllers/pinJson'

const env = { PINATA_JWT: 'test-jwt' }

function makeRequest(url: string, options: RequestInit = {}) {
  return new Request(url, options)
}

function okResponse() {
  return new Response(JSON.stringify({ uri: 'ipfs://QmTest' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('worker fetch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Origin / CORS validation ----

  describe('origin validation', () => {
    it('returns 405 when no Origin header is present', async () => {
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', { method: 'POST' })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(405)
    })

    it('returns 405 for a disallowed origin', async () => {
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'https://evil.com' },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(405)
    })

    it('allows https://*.centrifuge.io origins', async () => {
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'https://app.centrifuge.io' },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(200)
    })

    it('allows https://*.k-f.dev origins', async () => {
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'https://app.k-f.dev' },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(200)
    })

    it('allows https://*.centrifugelabs.io origins', async () => {
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'https://staging.centrifugelabs.io' },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(200)
    })

    it('allows http://localhost', async () => {
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'http://localhost' },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(200)
    })

    it('allows http://localhost with a port', async () => {
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000' },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(200)
    })

    it('rejects http://localhost with a subdomain (not a valid localhost pattern)', async () => {
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'http://subdomain.localhost' },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(405)
    })
  })

  // ---- OPTIONS preflight ----

  describe('OPTIONS preflight', () => {
    it('returns 204 for OPTIONS from an allowed origin with CORS headers', async () => {
      const origin = 'https://app.centrifuge.io'
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'OPTIONS',
        headers: { Origin: origin },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })

    it('returns 204 for OPTIONS from a disallowed origin without CORS headers', async () => {
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.com' },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('returns 204 for OPTIONS with no origin', async () => {
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'OPTIONS',
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(204)
    })
  })

  // ---- Routing ----

  describe('routing', () => {
    const allowedOrigin = 'http://localhost:3000'

    it('routes POST /pinFile to the pinFile controller', async () => {
      const mockResponse = okResponse()
      vi.mocked(pinFile).mockResolvedValue(mockResponse)
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: allowedOrigin },
      })

      await worker.fetch(request, env)

      expect(vi.mocked(pinFile)).toHaveBeenCalledOnce()
      expect(vi.mocked(pinJson)).not.toHaveBeenCalled()
    })

    it('routes POST /pinJson to the pinJson controller', async () => {
      const mockResponse = okResponse()
      vi.mocked(pinJson).mockResolvedValue(mockResponse)
      const request = makeRequest('https://pinning.centrifuge.io/pinJson', {
        method: 'POST',
        headers: { Origin: allowedOrigin },
      })

      await worker.fetch(request, env)

      expect(vi.mocked(pinJson)).toHaveBeenCalledOnce()
      expect(vi.mocked(pinFile)).not.toHaveBeenCalled()
    })

    it('routes by the last path segment (e.g. /api/v1/pinFile)', async () => {
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/api/v1/pinFile', {
        method: 'POST',
        headers: { Origin: allowedOrigin },
      })

      await worker.fetch(request, env)

      expect(vi.mocked(pinFile)).toHaveBeenCalledOnce()
    })

    it('returns 404 for an unknown route', async () => {
      const request = makeRequest('https://pinning.centrifuge.io/unknownRoute', {
        method: 'POST',
        headers: { Origin: allowedOrigin },
      })

      const response = await worker.fetch(request, env)
      const text = await response.text()

      expect(response.status).toBe(404)
      expect(text).toBe('Route not found')
    })

    it('returns 400 when the request has no path segments', async () => {
      const request = makeRequest('https://pinning.centrifuge.io/', {
        method: 'POST',
        headers: { Origin: allowedOrigin },
      })

      const response = await worker.fetch(request, env)
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toBe('Bad request')
    })

    it('passes the original request and env to the controller', async () => {
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: allowedOrigin },
      })

      await worker.fetch(request, env)

      expect(vi.mocked(pinFile)).toHaveBeenCalledWith(request, env)
    })
  })

  // ---- CORS headers on controller responses ----

  describe('CORS headers on responses', () => {
    it('injects Access-Control-Allow-Origin into the controller response', async () => {
      const origin = 'https://app.centrifuge.io'
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: origin },
      })

      const response = await worker.fetch(request, env)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    })

    it('injects Access-Control-Allow-Methods into the controller response', async () => {
      vi.mocked(pinFile).mockResolvedValue(okResponse())
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'http://localhost' },
      })

      const response = await worker.fetch(request, env)

      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })
  })

  // ---- Error handling ----

  describe('error handling', () => {
    it('returns 500 when a controller throws an unexpected error', async () => {
      vi.mocked(pinFile).mockRejectedValue(new Error('Unexpected crash'))
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: 'http://localhost' },
      })

      const response = await worker.fetch(request, env)
      const text = await response.text()

      expect(response.status).toBe(500)
      expect(text).toBe('An error occurred')
    })

    it('includes CORS headers on 500 responses for allowed origins', async () => {
      const origin = 'http://localhost:3000'
      vi.mocked(pinFile).mockRejectedValue(new Error('Crash'))
      const request = makeRequest('https://pinning.centrifuge.io/pinFile', {
        method: 'POST',
        headers: { Origin: origin },
      })

      const response = await worker.fetch(request, env)

      expect(response.status).toBe(500)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    })
  })
})
