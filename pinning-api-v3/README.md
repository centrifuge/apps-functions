# Pinning API V3

IPFS pinning service using Pinata V3 API, deployed to Cloudflare Workers.

## Overview

This service provides endpoints to pin files and JSON data to IPFS via Pinata's V3 API. It's designed to run on Cloudflare Workers and handles CORS for Centrifuge domains.

## What's New in V3

- **JWT Authentication**: Simplified authentication using Pinata JWT tokens instead of API key + secret pairs
- **Pinata SDK**: Uses official Pinata SDK for better reliability and type safety
- **Higher Rate Limits**: V3 API has significantly higher rate limits
- **Better Performance**: Built on Pinata's new serverless infrastructure
- **Same API**: Maintains backward-compatible endpoints for seamless migration

## Endpoints

The API expects requests to be routed to paths ending with the route name:
- `/api/pinning/pinFile` - Pin a file (base64 data URI) to IPFS
- `/api/pinning/pinJson` - Pin JSON data to IPFS

### Request/Response Format

#### pinFile
**Request:**
```json
{
  "uri": "data:image/png;base64,iVBORw0KG..."
}
```

**Response:**
```json
{
  "uri": "ipfs://QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

#### pinJson
**Request:**
```json
{
  "json": {
    "name": "My Document",
    "data": { ... }
  }
}
```

**Response:**
```json
{
  "uri": "ipfs://QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

## Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm (recommended)
- Cloudflare account with Workers access
- Pinata account with JWT token

### Installation

```bash
# Install dependencies
pnpm install
```

### Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get your Pinata JWT token:
   - Go to https://app.pinata.cloud/developers/api-keys
   - Create a new API key
   - Copy the JWT token

3. Set your JWT in `.env`:
   ```env
   PINATA_JWT=your_jwt_token_here
   ```

## Development

### Build

```bash
pnpm build
```

### Local Development

For local development with Cloudflare Workers:

```bash
pnpm dev
```

This will start a local development server using Wrangler.

### Testing

The project includes integration tests that make real API calls to Pinata:

```bash
# Run tests (automatically cleans up test pins afterwards)
pnpm test

# Run tests in watch mode
pnpm test:watch
```

**Note**: Tests require `PINATA_JWT` to be set in your `.env` file. All test pins are automatically deleted after tests complete.

## Deployment

### Cloudflare Workers Setup

1. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. **Authenticate with Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Set secrets** (required for production):
   ```bash
   echo "your_jwt_token" | wrangler secret put PINATA_JWT --env production
   ```

### Manual Deploy

Deploy to production:
```bash
pnpm deploy:prod
```

Or deploy to default environment:
```bash
pnpm deploy
```

### Automated Deployment (GitHub Actions)

The repository includes a GitHub Actions workflow that automatically deploys to Cloudflare Workers on push to main.

**Required GitHub Secrets:**
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `PINATA_JWT` - Your Pinata JWT token

The workflow will:
1. Install dependencies
2. Build the project
3. Deploy to Cloudflare Workers
4. Set the PINATA_JWT secret in Cloudflare

## Migration from Legacy API

If you're migrating from the legacy Pinata API:

1. **Get JWT Token**: Create a new API key in Pinata dashboard and copy the JWT
2. **Update Environment**: Replace `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` with `PINATA_JWT`
3. **Deploy**: The API endpoints remain the same, so no client-side changes needed
4. **Update Secrets**: Set `PINATA_JWT` as a Cloudflare Worker secret

## Where Are Files Stored?

When you pin files or JSON data:

1. **IPFS Network**: Content is stored on the IPFS (InterPlanetary File System) network, distributed across multiple nodes worldwide
2. **Pinata Pinning Service**: Pinata ensures content remains available by keeping it pinned on their IPFS nodes
3. **Access**: Files can be accessed via:
   - IPFS gateways: `https://ipfs.io/ipfs/{hash}`
   - Pinata gateway: `https://gateway.pinata.cloud/ipfs/{hash}`
   - Your application using the `ipfs://{hash}` URI format

## Architecture

- **Entry Point**: `src/index.ts` - Main worker handler with routing and CORS
- **Controllers**: 
  - `src/controllers/pinFile.ts` - Handles file pinning (base64 data URI to IPFS)
  - `src/controllers/pinJson.ts` - Handles JSON pinning
- **Utils**: `src/utils/pinata-client.ts` - Pinata SDK client wrapper
- **Tests**: `src/controllers/__tests__/` - Integration tests with automatic cleanup

## CORS

The service allows requests from:
- `*.centrifuge.io`
- `*.k-f.dev`
- `*.centrifugelabs.io`
- `localhost` (for development)

## File Size Limits

- Maximum file size: 5 MB
- Files larger than 5 MB will be rejected with an error

## API Documentation

For more information about Pinata V3 API:
- [Pinata V3 Announcement](https://pinata.cloud/blog/the-v3-pinata-api-is-here/)
- [Uploading Files](https://docs.pinata.cloud/files/uploading-files)
- [Pinata SDK](https://docs.pinata.cloud/sdk)

## License

ISC

