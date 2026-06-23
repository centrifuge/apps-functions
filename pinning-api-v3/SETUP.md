# Quick Setup Guide

## 1. Create `.env` file

```bash
cd pinning-api-v3
cp .env.example .env
```

Then edit `.env` and add your Pinata JWT token:
```
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get your JWT from: https://app.pinata.cloud/developers/api-keys

## 2. Run Tests

```bash
pnpm test
```

All 10 tests should pass and automatically cleanup test pins.

## 3. Test Locally

Wrangler reads secrets from `.dev.vars` (not `.env`) when running locally.
Create it once from your existing `.env`:

```bash
pnpm dev:setup   # copies .env → .dev.vars (gitignored)
```

Then start the local worker (no build step needed — Wrangler compiles TypeScript directly):

```bash
pnpm dev
```

The worker runs at `http://localhost:8787`. The origin check requires an `Origin`
header that matches an allowed domain, so use `-H "Origin: http://localhost"` with curl:

```bash
# Pin JSON
curl -X POST http://localhost:8787/pinJson \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost" \
  -d '{"json": {"name": "test", "value": 42}}'
# → {"uri":"ipfs://Qm..."}

# Pin a file (base64 data URI — "Hello World" as plain text)
curl -X POST http://localhost:8787/pinFile \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost" \
  -d '{"uri": "data:text/plain;base64,SGVsbG8gV29ybGQ="}'
# → {"uri":"ipfs://Qm..."}

# CORS preflight (should return 204)
curl -v -X OPTIONS http://localhost:8787/pinFile \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST"
```

> **Note:** The worker enforces an origin allowlist (`*.centrifuge.io`, `*.k-f.dev`,
> `*.centrifugelabs.io`, and `localhost`). Requests without a matching `Origin` header
> return 405. This is by design — it only matters for curl/scripts, not browsers.

## 4. Deploy

### Set Cloudflare Worker Secret

```bash
echo "your_jwt_token" | pnpm wrangler secret put PINATA_JWT --env production
```

### Deploy to Production

```bash
pnpm deploy:prod
```

## 5. Setup GitHub Actions

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. `CLOUDFLARE_API_TOKEN` - Get from Cloudflare Dashboard → My Profile → API Tokens
2. `CLOUDFLARE_ACCOUNT_ID` - Get from Cloudflare Dashboard → Workers & Pages → Account ID
3. `PINATA_JWT` - Your Pinata JWT token

Once set, pushing to main will automatically deploy.

## API Endpoints

After deployment, your API will be available at:
- Production: `https://pinning.centrifuge.io/api/pinning/pinFile`
- Production: `https://pinning.centrifuge.io/api/pinning/pinJson`

Same request/response format as before - no client changes needed!

