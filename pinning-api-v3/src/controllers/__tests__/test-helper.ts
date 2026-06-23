import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { PinataSDK } from 'pinata'

const TEST_PINS_FILE = join(process.cwd(), '.test-pins.json')

export interface TestPin {
  cid: string
  type: 'json' | 'file'
  testName: string
  createdAt: string
}

export function saveTestPin(cid: string, type: 'json' | 'file', testName: string): void {
  try {
    const pins: TestPin[] = loadTestPins()
    
    // Remove ipfs:// prefix if present
    const cleanCid = cid.replace(/^ipfs:\/\//, '')
    
    // Avoid duplicates
    if (!pins.some((p) => p.cid === cleanCid)) {
      pins.push({
        cid: cleanCid,
        type,
        testName,
        createdAt: new Date().toISOString(),
      })
      
      writeFileSync(TEST_PINS_FILE, JSON.stringify(pins, null, 2))
    }
  } catch (error) {
    console.warn('Failed to save test pin:', error)
  }
}

export function loadTestPins(): TestPin[] {
  try {
    if (existsSync(TEST_PINS_FILE)) {
      const content = readFileSync(TEST_PINS_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array
  }
  return []
}

export function clearTestPinsFile(): void {
  try {
    if (existsSync(TEST_PINS_FILE)) {
      writeFileSync(TEST_PINS_FILE, '[]')
    }
  } catch (error) {
    console.warn('Failed to clear test pins file:', error)
  }
}

export async function cleanupTestPins(jwt: string): Promise<void> {
  const pins = loadTestPins()
  
  if (pins.length === 0) {
    console.log('No test pins to cleanup')
    return
  }

  console.log(`Cleaning up ${pins.length} test pin(s)...`)
  
  const pinata = new PinataSDK({ pinataJwt: jwt })

  // Pinata V3 delete requires internal file UUIDs, not CIDs.
  // Look up each file's UUID by CID first, then delete by UUID.
  for (const pin of pins) {
    try {
      const list = await pinata.files.public.list().cid(pin.cid)
      const file = list.files?.[0]
      if (!file?.id) {
        console.warn(`  ⚠ No file found for CID ${pin.cid} — already deleted?`)
        continue
      }
      await pinata.files.public.delete([file.id])
      console.log(`  ✓ Deleted ${pin.cid} (id: ${file.id})`)
    } catch (error: any) {
      console.warn(`  ✗ Failed to delete ${pin.cid}:`, error.message)
    }
  }

  clearTestPinsFile()
  console.log('✓ Cleanup complete')
}
