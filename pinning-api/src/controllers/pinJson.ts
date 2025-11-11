import { pinJson } from '../utils/api'

const ipfsHashToURI = (hash: string) => `ipfs://${hash}`

interface Env {
  PINATA_API_KEY?: string
  PINATA_SECRET_API_KEY?: string
}

export default async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json()
    const { json } = body
    
    if (!json) {
      return new Response('Bad request: json is required', { status: 400 })
    }

    const pinJsonResponse = await pinJson(json, env)
    const jsonHash = pinJsonResponse.data.IpfsHash
    const jsonURL = ipfsHashToURI(jsonHash)

    return new Response(JSON.stringify({ uri: jsonURL }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(e.message || 'Server error', { status: 500 })
  }
}
