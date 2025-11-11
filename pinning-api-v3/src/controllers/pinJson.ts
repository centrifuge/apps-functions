import { getPinataClient } from '../utils/pinata-client'

const ipfsHashToURI = (hash: string) => `ipfs://${hash}`

interface Env {
  PINATA_JWT?: string
}

export default async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json() as { json?: any }
    const { json } = body
    
    if (!json) {
      return new Response('Bad request: json is required', { status: 400 })
    }

    // Get Pinata client and pin JSON to public IPFS
    // Convert JSON to base64 string since SDK's json() method requires File object
    const jsonString = JSON.stringify(json)
    const base64Json = Buffer.from(jsonString, 'utf-8').toString('base64')
    
    const pinata = getPinataClient(env)
    const upload = await pinata.upload.public.base64(base64Json)
    
    // Validate response
    if (!upload?.cid) {
      throw new Error('Invalid response from Pinata: missing CID')
    }
    
    const jsonURL = ipfsHashToURI(upload.cid)

    return new Response(JSON.stringify({ uri: jsonURL }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Error in pinJson:', e)
    return new Response(e.message || 'Server error', { status: 500 })
  }
}

