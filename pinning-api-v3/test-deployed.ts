/**
 * End-to-end smoke test for the deployed pinning-api worker.
 * Cleans up all created IPFS pins at the end.
 *
 * Usage:
 *   pnpm tsx test-deployed.ts [worker-base-url]
 *   pnpm tsx test-deployed.ts https://pinning-api-dev.kf-dev.workers.dev
 */

import { config } from 'dotenv'
import { PinataSDK } from 'pinata'

config()

const BASE_URL = process.argv[2] ?? 'https://pinning.centrifugelabs.io'
const ORIGIN = 'http://localhost'
const PINATA_JWT = process.env.PINATA_JWT ?? ''

let passed = 0
let failed = 0
const pinnedCids: string[] = []

// ── Helpers ────────────────────────────────────────────────────────────────

const green = (msg: string) => console.log(`\x1b[32m✔ ${msg}\x1b[0m`)
const red   = (msg: string) => console.log(`\x1b[31m✘ ${msg}\x1b[0m`)
const bold  = (msg: string) => console.log(`\x1b[1m${msg}\x1b[0m`)

function check(name: string, expected: number, actual: number, body?: string) {
  if (actual === expected) {
    green(`${name} (HTTP ${actual})`)
    passed++
  } else {
    red(`${name} — expected HTTP ${expected}, got ${actual}`)
    if (body) console.log(`   Body: ${body}`)
    failed++
  }
}

async function post(path: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...extraHeaders },
    body: JSON.stringify(body),
  })
}

// ── Cleanup ────────────────────────────────────────────────────────────────

async function cleanup() {
  if (pinnedCids.length === 0) {
    console.log('\nNo pins to clean up.')
    return
  }
  if (!PINATA_JWT) {
    console.log(`\n⚠️  No PINATA_JWT in .env — skipping cleanup of ${pinnedCids.length} pin(s)`)
    return
  }

  bold(`\nCleaning up ${pinnedCids.length} test pin(s)...`)
  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT })
  let cleaned = 0

  for (const cid of pinnedCids) {
    try {
      const list = await pinata.files.public.list().cid(cid)
      const fileId = list.files?.[0]?.id
      if (!fileId) {
        console.log(`  ⚠ No file found for CID ${cid} — already deleted?`)
        continue
      }
      await pinata.files.public.delete([fileId])
      green(`Deleted ${cid} (id: ${fileId})`)
      cleaned++
    } catch (err: any) {
      red(`Failed to delete ${cid}: ${err.message}`)
    }
  }

  console.log(`Cleanup: ${cleaned} removed, ${pinnedCids.length - cleaned} failed`)
}

// ── Tests ──────────────────────────────────────────────────────────────────

bold(`Testing ${BASE_URL}\n`)

// 1. CORS preflight
bold('1. CORS preflight OPTIONS')
{
  const res = await fetch(`${BASE_URL}/api/pinning/pinJson`, {
    method: 'OPTIONS',
    headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' },
  })
  check('OPTIONS /api/pinning/pinJson', 204, res.status)
}

// 2. pinJson — happy path
bold('\n2. POST /api/pinning/pinJson (valid payload)')
{
  const res = await post('/api/pinning/pinJson', {
    json: { name: 'test', description: 'pinning-api-dev smoke test' },
  })
  const body = await res.json().catch(() => ({})) as any
  check('POST /api/pinning/pinJson', 200, res.status, JSON.stringify(body))
  if (res.status === 200 && body.uri) {
    const cid = body.uri.replace('ipfs://', '')
    console.log(`   IPFS CID: ${cid}`)
    pinnedCids.push(cid)
  }
}

// 3. pinJson — missing json field
bold('\n3. POST /api/pinning/pinJson (missing json field)')
{
  const res = await post('/api/pinning/pinJson', {})
  check('POST /api/pinning/pinJson missing field', 400, res.status)
}

// 4. pinFile — happy path
bold('\n4. POST /api/pinning/pinFile (valid SVG data URI)')
{
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>'
  const b64 = Buffer.from(svg).toString('base64')
  const uri = `data:image/svg+xml;base64,${b64}`

  const res = await post('/api/pinning/pinFile', { uri })
  const body = await res.json().catch(() => ({})) as any
  check('POST /api/pinning/pinFile', 200, res.status, JSON.stringify(body))
  if (res.status === 200 && body.uri) {
    const cid = body.uri.replace('ipfs://', '')
    console.log(`   IPFS CID: ${cid}`)
    pinnedCids.push(cid)
  }
}

// 5. pinFile — missing uri field
bold('\n5. POST /api/pinning/pinFile (missing uri field)')
{
  const res = await post('/api/pinning/pinFile', {})
  check('POST /api/pinning/pinFile missing field', 400, res.status)
}

// 6. Unknown route
bold('\n6. GET /api/pinning/unknown (unknown route)')
{
  const res = await fetch(`${BASE_URL}/api/pinning/unknown`, {
    headers: { Origin: ORIGIN },
  })
  check('GET /api/pinning/unknown', 404, res.status)
}

// 7. No Origin → rejected
bold('\n7. POST without Origin header (should be 405)')
{
  const res = await fetch(`${BASE_URL}/api/pinning/pinJson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { test: true } }),
  })
  check('POST without Origin', 405, res.status)
}

// ── Cleanup + summary ──────────────────────────────────────────────────────

await cleanup()

console.log('')
bold(`Results: ${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
