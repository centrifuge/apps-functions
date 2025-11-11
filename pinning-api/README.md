# pinning-api

IPFS pinning service using Pinata API, deployed to Cloudflare Workers.

## Overview

This service provides endpoints to pin files and JSON data to IPFS via Pinata. It's designed to run on Cloudflare Workers and handles CORS for Centrifuge domains.

## Endpoints

The API expects requests to be routed to paths ending with the route name:
- `/api/pinning/pinFile` - Pin a file (base64 data URI) to IPFS
- `/api/pinning/pinJson` - Pin JSON data to IPFS

## Setup

### Prerequisites

- Node.js >= 18.0.0
- Yarn or npm
- Cloudflare account with Workers access
- Pinata account with API credentials

### Installation

```bash
# Install dependencies
yarn install
# or
npm install
```

### Configuration

1. Copy the example environment file:
   ```bash
   cp env.yaml.example .env.yaml
   ```

2. Set your Pinata credentials in `.env.yaml`:
   ```yaml
   PINATA_API_KEY: your_api_key
   PINATA_SECRET_API_KEY: your_secret_key
   ```

## Development

### Build

```bash
yarn build
# or
npm run build
```

### Local Development

For local development with Cloudflare Workers:

```bash
yarn dev
# or
npm run dev
```

This will start a local development server using Wrangler.

## Deployment

### Cloudflare Workers Setup

1. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   # or
   yarn global add wrangler
   ```

2. **Authenticate with Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Set secrets** (required for production):
   ```bash
   wrangler secret put PINATA_API_KEY
   wrangler secret put PINATA_SECRET_API_KEY
   ```

### Deploy

Deploy to production:
```bash
yarn deploy:prod
# or
npm run deploy:prod
```

Or deploy to default environment:
```bash
yarn deploy
# or
npm run deploy
```

### Worker Routing

The worker should be configured in Cloudflare to handle routes like:
- `functions.centrifuge.io/api/pinning/*`

The routing logic extracts the last path segment (e.g., `pinFile` or `pinJson`) to determine which controller to use.

## Environment Variables

- `PINATA_API_KEY` - Your Pinata API key
- `PINATA_SECRET_API_KEY` - Your Pinata secret API key

These should be set as Cloudflare Worker secrets using `wrangler secret put` for production deployments.

## Architecture

- **Entry Point**: `src/index.ts` - Main worker handler with routing and CORS
- **Controllers**: 
  - `src/controllers/pinFile.ts` - Handles file pinning (base64 data URI to IPFS)
  - `src/controllers/pinJson.ts` - Handles JSON pinning
- **Utils**: `src/utils/api.ts` - Pinata API client using native fetch

## CORS

The service allows requests from:
- `*.centrifuge.io`
- `*.k-f.dev`
- `*.centrifugelabs.io`
- `localhost` (for development)

## License

ISC
