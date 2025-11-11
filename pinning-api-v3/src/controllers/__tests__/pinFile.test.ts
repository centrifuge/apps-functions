import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { config } from 'dotenv'
import pinFileController from '../pinFile'
import { saveTestPin, cleanupTestPins } from './test-helper'

// Load environment variables from .env file
config()

// Helper function to create a data URI from text
function createDataURI(text: string, mimeType: string = 'text/plain'): string {
  const base64 = Buffer.from(text, 'utf-8').toString('base64')
  return `data:${mimeType};base64,${base64}`
}

// Helper function to create a simple SVG data URI (more reliable than tiny PNG)
function createImageDataURI(): string {
  const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>'
  const base64 = Buffer.from(svgContent, 'utf-8').toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

describe('pinFile Controller', () => {
  const env = {
    PINATA_JWT: process.env.PINATA_JWT,
  }

  beforeAll(() => {
    if (!env.PINATA_JWT) {
      throw new Error('PINATA_JWT must be set in .env file for tests')
    }
  })

  afterAll(async () => {
    // Cleanup all test pins
    if (env.PINATA_JWT) {
      await cleanupTestPins(env.PINATA_JWT)
    }
  })

  it('should pin a file and return IPFS URI', async () => {
    const dataURI = createImageDataURI()

    const request = new Request('http://localhost/api/pinning/pinFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: dataURI }),
    })

    const response = await pinFileController(request, env)
    
    if (response.status !== 200) {
      const errorText = await response.text()
      throw new Error(`Expected status 200, got ${response.status}: ${errorText}`)
    }
    
    const responseData = await response.json()
    expect(responseData).toHaveProperty('uri')
    expect(responseData.uri).toMatch(/^ipfs:\/\//)
    expect(responseData.uri.length).toBeGreaterThan(10)
    
    // Save for cleanup
    saveTestPin(responseData.uri, 'file', 'should pin a file and return IPFS URI')
  })

  it('should return 400 if uri is missing', async () => {
    const request = new Request('http://localhost/api/pinning/pinFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await pinFileController(request, env)
    const responseText = await response.text()

    expect(response.status).toBe(400)
    expect(responseText).toContain('uri is required')
  })

  it('should handle text files', async () => {
    const textContent = 'This is a test text file for IPFS pinning'
    const dataURI = createDataURI(textContent, 'text/plain')

    const request = new Request('http://localhost/api/pinning/pinFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: dataURI }),
    })

    const response = await pinFileController(request, env)
    
    if (response.status !== 200) {
      const errorText = await response.text()
      throw new Error(`Expected status 200, got ${response.status}: ${errorText}`)
    }
    
    const responseData = await response.json()
    expect(responseData).toHaveProperty('uri')
    expect(responseData.uri).toMatch(/^ipfs:\/\//)
    
    // Save for cleanup
    saveTestPin(responseData.uri, 'file', 'should handle text files')
  })

  it('should handle JSON files', async () => {
    const jsonContent = JSON.stringify({ test: 'data', number: 123 })
    const dataURI = createDataURI(jsonContent, 'application/json')

    const request = new Request('http://localhost/api/pinning/pinFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: dataURI }),
    })

    const response = await pinFileController(request, env)
    
    if (response.status !== 200) {
      const errorText = await response.text()
      throw new Error(`Expected status 200, got ${response.status}: ${errorText}`)
    }
    
    const responseData = await response.json()
    expect(responseData).toHaveProperty('uri')
    expect(responseData.uri).toMatch(/^ipfs:\/\//)
    
    // Save for cleanup
    saveTestPin(responseData.uri, 'file', 'should handle JSON files')
  })

  it('should reject files larger than 5MB', async () => {
    // Create a large data URI (5MB + 1 byte)
    const largeContent = 'x'.repeat(5 * 1024 * 1024 + 1)
    const dataURI = createDataURI(largeContent)

    const request = new Request('http://localhost/api/pinning/pinFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: dataURI }),
    })

    const response = await pinFileController(request, env)
    const responseText = await response.text()

    expect(response.status).toBe(500)
    expect(responseText).toContain('File too large')
  })

  it('should handle invalid data URI format gracefully', async () => {
    const invalidDataURI = 'not-a-valid-data-uri'

    const request = new Request('http://localhost/api/pinning/pinFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: invalidDataURI }),
    })

    const response = await pinFileController(request, env)

    // Should return 500 for invalid format
    expect(response.status).toBe(500)
  })
})

