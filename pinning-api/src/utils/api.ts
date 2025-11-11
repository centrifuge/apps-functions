const PINATA_BASE_URL = 'https://api.pinata.cloud'

function getAuthHeaders(env: { PINATA_API_KEY?: string; PINATA_SECRET_API_KEY?: string }) {
  return {
    pinata_api_key: env.PINATA_API_KEY || '',
    pinata_secret_api_key: env.PINATA_SECRET_API_KEY || '',
  }
}

export const pinJson = async (
  jsonBody: any,
  env: { PINATA_API_KEY?: string; PINATA_SECRET_API_KEY?: string }
) => {
  const url = `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(env),
    },
    body: JSON.stringify(jsonBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Pinata API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return { data: { IpfsHash: data.IpfsHash } }
}

export const unpinFile = async (
  hashToUnpin: string,
  env: { PINATA_API_KEY?: string; PINATA_SECRET_API_KEY?: string }
) => {
  const url = `${PINATA_BASE_URL}/pinning/unpin/${hashToUnpin}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(env),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Pinata API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return { data: { IpfsHash: data.IpfsHash } }
}

export const pinFile = async (
  blob: Blob,
  env: { PINATA_API_KEY?: string; PINATA_SECRET_API_KEY?: string }
) => {
  const formData = new FormData()
  formData.append('file', blob)

  const response = await fetch(`${PINATA_BASE_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: getAuthHeaders(env),
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Pinata API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return { data: { IpfsHash: data.IpfsHash } }
}

export const ipfsHashToURI = (hash: string) => `ipfs://${hash}`
