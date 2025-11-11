import { pinFile } from '../utils/api'

const MAX_FILE_SIZE_IN_BYTES = 5 * 1024 ** 2 // 5 MB limit

const dataUriToBlob = (uri: string): Blob => {
  const base64String = uri.replace(/.+;base64,/, '')
  const binaryString = atob(base64String)
  const bytes = new Uint8Array(binaryString.length)
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  if (bytes.byteLength > MAX_FILE_SIZE_IN_BYTES) {
    throw new Error('File too large')
  }

  // Extract MIME type from data URI
  const mimeMatch = uri.match(/data:([^;]+);base64/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  
  return new Blob([bytes], { type: mimeType })
}

const ipfsHashToURI = (hash: string) => `ipfs://${hash}`

interface Env {
  PINATA_API_KEY?: string
  PINATA_SECRET_API_KEY?: string
}

export default async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json()
    const { uri } = body

    // check incoming data
    if (!uri) {
      return new Response('Bad request: uri is required', { status: 400 })
    }

    const blob = dataUriToBlob(uri)

    // pin the image file
    const pinFileResponse = await pinFile(blob, env)
    
    // Validate response structure
    if (!pinFileResponse?.data?.IpfsHash) {
      throw new Error('Invalid response from Pinata API: missing IpfsHash')
    }
    
    const fileHash = pinFileResponse.data.IpfsHash
    
    // Validate hash is not empty
    if (!fileHash || typeof fileHash !== 'string' || fileHash.trim().length === 0) {
      throw new Error('Invalid IPFS hash received from Pinata API')
    }
    
    const fileURL = ipfsHashToURI(fileHash)

    return new Response(JSON.stringify({ uri: fileURL }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(e.message || 'Server error', { status: 500 })
  }
}
