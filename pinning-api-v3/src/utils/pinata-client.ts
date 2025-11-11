import { PinataSDK } from 'pinata'

export function createPinataClient(jwt: string) {
  return new PinataSDK({
    pinataJwt: jwt,
  })
}

export function getPinataClient(env: { PINATA_JWT?: string }) {
  if (!env.PINATA_JWT) {
    throw new Error('PINATA_JWT is required')
  }
  return createPinataClient(env.PINATA_JWT)
}

