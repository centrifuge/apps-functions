import esbuild from 'esbuild'

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    minify: true,
    platform: 'neutral', // Cloudflare Workers use neutral platform
    format: 'esm', // Workers use ES modules
    sourcemap: true,
    target: 'es2022',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })
  .catch(() => process.exit(1))
