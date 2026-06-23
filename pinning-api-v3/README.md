# Pinning API V3

IPFS pinning service using Pinata V3 API, deployed to Cloudflare Workers.

## Overview

This service provides endpoints to pin files and JSON data to IPFS via Pinata's V3 API. It runs on Cloudflare Workers and enforces CORS for Centrifuge domains.

## What's New in V3

- **JWT Authentication**: Simplified authentication using Pinata JWT tokens
- **Pinata SDK**: Uses the official Pinata SDK for better reliability and type safety
- **Higher Rate Limits**: V3 API has significantly higher rate limits
- **Better Performance**: Built on Pinata's new serverless infrastructure
- **Same API**: Maintains backward-compatible endpoints for seamless migration

## Endpoints

The API matches routes by the **last path segment**, so `/pinFile`, `/api/pinning/pinFile`, etc. all work.

### `POST /pinFile`

Pin a base64-encoded file (as a data URI) to IPFS.

**Request:**
```json
{ "uri": "data:image/png;base64,iVBORw0KG..." }
```

**Response:**
```json
{ "uri": "ipfs://Qm..." }
```

Errors: `400` if `uri` is missing · `500` for invalid data URI, file > 5 MB, or Pinata errors.

### `POST /pinJson`

Serialize and pin a JSON object to IPFS.

**Request:**
```json
{ "json": { "name": "My Document", "data": {} } }
```

**Response:**
```json
{ "uri": "ipfs://Qm..." }
```

Errors: `400` if `json` is missing or null · `500` for Pinata errors.

## Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm
- Cloudflare account with Workers access
- Pinata account with a JWT token

### Installation

```bash
pnpm install
```

### Configuration

1. Copy the example env file and add your Pinata JWT:
   ```bash
   cp .env.example .env
   # edit .env → set PINATA_JWT=eyJ...
   ```
   Get your JWT from https://app.pinata.cloud/developers/api-keys

## Local Development

Wrangler compiles TypeScript directly — no build step needed. Secrets are read from `.dev.vars` (gitignored), not `.env`.

```bash
# One-time: copy your .env → .dev.vars (Wrangler's local secret file)
pnpm dev:setup

# Start the local worker at http://localhost:8787
pnpm dev
```

Test with curl (the `Origin` header is required by the allowlist):

```bash
# Pin JSON
curl -X POST http://localhost:8787/pinJson \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost" \
  -d '{"json": {"name": "test"}}'

# Pin a file ("Hello World" as plain text)
curl -X POST http://localhost:8787/pinFile \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost" \
  -d '{"uri": "data:text/plain;base64,SGVsbG8gV29ybGQ="}'
```

## Testing

### Unit tests (no network, no JWT required)

Mocks the Pinata client — safe to run anywhere:

```bash
pnpm test:unit
```

Covers:
- `pinFile` — happy path, all invalid data URI forms, 5 MB limit, missing JWT, Pinata error cases
- `pinJson` — happy path, falsy `json` values, Pinata error propagation
- Worker routing — origin allowlist, OPTIONS preflight, route matching, CORS header injection, 500 handling

### Integration tests (hit real Pinata API)

Requires `PINATA_JWT` in `.env`. Creates real pins and cleans them up afterwards:

```bash
pnpm test
```

### Watch mode

```bash
pnpm test:watch
```

## Deployment

### Set the Cloudflare secret

```bash
echo "your_jwt_token" | pnpm wrangler secret put PINATA_JWT --env production
```

### Deploy

```bash
pnpm deploy:prod   # → https://pinning.centrifuge.io
pnpm deploy        # → default environment
```

### Automated deployment (GitHub Actions)

Pushing to `main` triggers the deploy workflow automatically.

**Required GitHub secrets:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `PINATA_JWT`

## Architecture

```
src/
├── index.ts                        Worker entry point — routing, CORS, origin check
├── controllers/
│   ├── pinFile.ts                  Validates data URI, extracts base64, pins via Pinata
│   ├── pinJson.ts                  Serialises JSON to base64, pins via Pinata
│   └── __tests__/
│       ├── pinFile.test.ts         Integration tests (real Pinata API)
│       ├── pinFile.unit.test.ts    Unit tests (mocked Pinata)
│       ├── pinJson.test.ts         Integration tests
│       ├── pinJson.unit.test.ts    Unit tests
│       └── test-helper.ts          Pin tracking + cleanup utilities
├── utils/
│   └── pinata-client.ts            Pinata SDK wrapper
└── __tests__/
    └── worker.test.ts              Worker routing + CORS unit tests
```

## CORS

Allowed origins:
- `https://*.centrifuge.io`
- `https://*.k-f.dev`
- `https://*.centrifugelabs.io`
- `http://localhost` / `http://localhost:<port>`

All other origins receive `405 Not allowed`. `OPTIONS` preflights always return `204`.

## File Size Limit

Maximum decoded file size: **5 MB**. Larger files are rejected with `500 File too large`.

## Accessing Pinned Content

Once pinned, content is available via:
- `https://ipfs.io/ipfs/<cid>`
- `https://gateway.pinata.cloud/ipfs/<cid>`
- The `ipfs://<cid>` URI returned by the API

## License

ISC
