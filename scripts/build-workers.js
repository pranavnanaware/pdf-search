const esbuild = require('esbuild');


esbuild.build({
  entryPoints: ['app/workers/doc-worker.ts'],
  bundle: true,
  outfile: 'app/workers/doc-worker.js',
  platform: 'node',
  target: 'node16',
  format: 'cjs',
}).catch(() => process.exit(1)); 