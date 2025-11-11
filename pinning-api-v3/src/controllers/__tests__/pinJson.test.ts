import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { config } from 'dotenv'
import pinJsonController from '../pinJson'
import { saveTestPin, cleanupTestPins } from './test-helper'

// Load environment variables from .env file
config()

describe('pinJson Controller', () => {
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

  it('should pin JSON data and return IPFS URI', async () => {
    const testJson = {
      name: 'Test Document',
      description: 'This is a test document for pinning',
      timestamp: new Date().toISOString(),
    }

    const request = new Request('http://localhost/api/pinning/pinJson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: testJson }),
    })

    const response = await pinJsonController(request, env)
    
    if (response.status !== 200) {
      const errorText = await response.text()
      throw new Error(`Expected status 200, got ${response.status}: ${errorText}`)
    }
    
    const responseData = await response.json()
    expect(responseData).toHaveProperty('uri')
    expect(responseData.uri).toMatch(/^ipfs:\/\//)
    expect(responseData.uri.length).toBeGreaterThan(10)
    
    // Save for cleanup
    saveTestPin(responseData.uri, 'json', 'should pin JSON data and return IPFS URI')
  })

  it('should return 400 if json is missing', async () => {
    const request = new Request('http://localhost/api/pinning/pinJson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await pinJsonController(request, env)
    const responseText = await response.text()

    expect(response.status).toBe(400)
    expect(responseText).toContain('json is required')
  })

  it('should return 400 if json is null', async () => {
    const request = new Request('http://localhost/api/pinning/pinJson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: null }),
    })

    const response = await pinJsonController(request, env)
    const responseText = await response.text()

    expect(response.status).toBe(400)
    expect(responseText).toContain('json is required')
  })

  it('should handle complex nested JSON objects', async () => {
    const complexJson = {
      metadata: {
        title: 'Complex Document',
        author: {
          name: 'Test Author',
          email: 'test@example.com',
        },
        tags: ['test', 'pinning', 'ipfs'],
      },
      content: {
        sections: [
          { id: 1, text: 'Section 1' },
          { id: 2, text: 'Section 2' },
        ],
      },
    }

    const request = new Request('http://localhost/api/pinning/pinJson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: complexJson }),
    })

    const response = await pinJsonController(request, env)
    
    if (response.status !== 200) {
      const errorText = await response.text()
      throw new Error(`Expected status 200, got ${response.status}: ${errorText}`)
    }
    
    const responseData = await response.json()
    expect(responseData).toHaveProperty('uri')
    expect(responseData.uri).toMatch(/^ipfs:\/\//)
    
    // Save for cleanup
    saveTestPin(responseData.uri, 'json', 'should handle complex nested JSON objects')
  })
})

