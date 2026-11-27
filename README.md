# Centrifuge apps functions

Serverless functions that support the Centrifuge apps. Each function lives in its own folder with its own dependencies, tests and deployment config.

## Functions

| Folder | What it does | Runs on |
| --- | --- | --- |
| [`pinning-api-v3`](pinning-api-v3) | Pins files and JSON to IPFS through the Pinata V3 API | Cloudflare Workers |

The function's own README covers its endpoints, configuration, local development and deployment.

## Getting started

You need Node.js 18 or later and [pnpm](https://pnpm.io).

```bash
cd pinning-api-v3
pnpm install
pnpm test:unit
```

The unit tests need no network access or credentials. Running the worker locally or against Pinata needs a Pinata JWT; see [`pinning-api-v3/SETUP.md`](pinning-api-v3/SETUP.md).

## Deployment

Merging to `main` deploys the changed function to production through GitHub Actions. See [`.github/workflows`](.github/workflows).

## Contributing

Issues and pull requests are welcome. Please keep each pull request focused on one change, include tests for behaviour changes, and run the function's unit tests before opening it.

## License

[Apache License 2.0](LICENSE)
