/// <reference types="@cloudflare/workers-types" />

import pinFile from './controllers/pinFile'
import pinJson from './controllers/pinJson'

const routes = [
  {
    name: 'pinFile',
    controller: pinFile,
  },
  {
    name: 'pinJson',
    controller: pinJson,
  },
]

const centrifugeDomains = [
  /^(https:\/\/.*centrifuge\.io)/,
  /^(https:\/\/.*k-f\.dev)/,
  /^(https:\/\/.*centrifugelabs\.io)/,
]

function checkOrigin(origin: string | null): boolean {
  if (!origin) return false
  const isCentrifugeDomain = centrifugeDomains.some((regex) => regex.test(origin))
  const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin)
  return isCentrifugeDomain || isLocalhost
}

function createCorsResponse(origin: string | null, status: number = 200): Response {
  const headers = new Headers()
  if (origin && checkOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
    headers.set('Access-Control-Max-Age', '3600')
  }
  return new Response(null, { status, headers })
}

interface Env {
  PINATA_API_KEY?: string
  PINATA_SECRET_API_KEY?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (routes.length < 0) {
        return new Response('No functions defined', { status: 400 })
      }

      const origin = request.headers.get('origin')
      
      // Handle preflight OPTIONS requests - always return CORS headers
      if (request.method === 'OPTIONS') {
        return createCorsResponse(origin, 204)
      }

      // Check origin for actual requests
      const isAllowed = checkOrigin(origin)
      
      if (!isAllowed) {
        // Still return CORS headers even for rejected requests
        const response = new Response('Not allowed', { status: 405 })
        if (origin && checkOrigin(origin)) {
          response.headers.set('Access-Control-Allow-Origin', origin)
        }
        return response
      }

      const url = new URL(request.url)
      const pathParts = url.pathname.split('/').filter(Boolean)
      const routeName = pathParts[pathParts.length - 1]

      // Find matching route
      for (const route of routes) {
        if (routeName === route.name) {
          const response = await route.controller(request, env)
          // Add CORS headers to the response
          if (origin) {
            response.headers.set('Access-Control-Allow-Origin', origin)
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
          }
          return response
        }
      }

      // If no route matches, return 404 with CORS headers
      if (pathParts.length > 0) {
        const response = new Response('Route not found', { status: 404 })
        if (origin && isAllowed) {
          response.headers.set('Access-Control-Allow-Origin', origin)
        }
        return response
      }
      
      const response = new Response('Bad request', { status: 400 })
      if (origin && isAllowed) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
      return response
    } catch (error) {
      console.error(error)
      const origin = request.headers.get('origin')
      const response = new Response('An error occurred', { status: 500 })
      if (origin && checkOrigin(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
      return response
    }
  },
}
