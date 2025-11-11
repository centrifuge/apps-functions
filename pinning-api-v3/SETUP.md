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

```bash
pnpm dev
```

Then test the endpoints:
```bash
# Test pinJson
curl -X POST http://localhost:8787/api/pinning/pinJson \
  -H "Content-Type: application/json" \
  -d '{"json": {"test": "data"}}'

# Test pinFile (with a data URI)
curl -X POST http://localhost:8787/api/pinning/pinFile \
  -H "Content-Type: application/json" \
  -d '{"uri": "data:text/plain;base64,SGVsbG8gV29ybGQ="}'
```

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

