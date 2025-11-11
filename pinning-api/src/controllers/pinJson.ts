import { pinJson } from '../utils/api'

const ipfsHashToURI = (hash: string) => `ipfs://${hash}`

interface Env {
  PINATA_API_KEY?: string
  PINATA_SECRET_API_KEY?: string
}

export default async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json() as { json?: any }
    const { json } = body
    
    if (!json) {
      return new Response('Bad request: json is required', { status: 400 })
    }

    const pinJsonResponse = await pinJson(json, env)
    
    // Validate response structure
    if (!pinJsonResponse?.data?.IpfsHash) {
      throw new Error('Invalid response from Pinata API: missing IpfsHash')
    }
    
    const jsonHash = pinJsonResponse.data.IpfsHash
    
    // Validate hash is not empty
    if (!jsonHash || typeof jsonHash !== 'string' || jsonHash.trim().length === 0) {
      throw new Error('Invalid IPFS hash received from Pinata API')
    }
    
    const jsonURL = ipfsHashToURI(jsonHash)

    return new Response(JSON.stringify({ uri: jsonURL }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(e.message || 'Server error', { status: 500 })
  }
}
