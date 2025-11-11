import esbuild from 'esbuild'

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    minify: true,
    platform: 'neutral',
    format: 'esm',
    sourcemap: true,
    target: 'es2022',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })
  .catch(() => process.exit(1))

