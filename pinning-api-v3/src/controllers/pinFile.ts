import { getPinataClient } from '../utils/pinata-client'

const MAX_FILE_SIZE_IN_BYTES = 5 * 1024 ** 2 // 5 MB limit

const extractBase64FromDataUri = (uri: string): string => {
  // Check if it's a valid data URI format
  if (!uri.startsWith('data:')) {
    throw new Error('Invalid data URI format')
  }
  
  // Extract base64 part from data URI (everything after 'base64,')
  const parts = uri.split('base64,')
  if (parts.length !== 2) {
    throw new Error('Invalid data URI: missing base64 data')
  }
  
  const base64String = parts[1]
  
  // Validate it's not empty (don't trim - base64 can have padding)
  if (!base64String || base64String.length === 0) {
    throw new Error('Invalid data URI: empty base64 data')
  }
  
  // Validate size by decoding
  try {
    const binaryString = atob(base64String)
    if (binaryString.length === 0) {
      throw new Error('Invalid data URI: decoded to 0 bytes')
    }
    if (binaryString.length > MAX_FILE_SIZE_IN_BYTES) {
      throw new Error('File too large')
    }
  } catch (e: any) {
    if (e.message.includes('File too large') || e.message.includes('decoded to 0 bytes')) {
      throw e
    }
    throw new Error('Invalid base64 encoding')
  }
  
  return base64String
}

const ipfsHashToURI = (hash: string) => `ipfs://${hash}`

interface Env {
  PINATA_JWT?: string
}

export default async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json() as { uri?: string }
    const { uri } = body

    // check incoming data
    if (!uri) {
      return new Response('Bad request: uri is required', { status: 400 })
    }

    // Extract base64 from data URI and validate size
    const base64String = extractBase64FromDataUri(uri)

    // Get Pinata client and pin the file to public IPFS using base64
    const pinata = getPinataClient(env)
    const upload = await pinata.upload.public.base64(base64String)
    
    // Validate response
    if (!upload?.cid) {
      throw new Error('Invalid response from Pinata: missing CID')
    }
    
    const fileURL = ipfsHashToURI(upload.cid)

    return new Response(JSON.stringify({ uri: fileURL }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Error in pinFile:', e)
    return new Response(e.message || 'Server error', { status: 500 })
  }
}

