const esbuild = require('esbuild');
const path = require('path');

async function buildWorker() {
  try {
    await esbuild.build({
      entryPoints: ['app/workers/worker.ts'],
      bundle: true,
      outfile: 'app/workers/worker.js',
      platform: 'node',
      target: 'node16',
      format: 'cjs',
      external: ['worker_threads'],
      sourcemap: true,
    });
    console.log('✅ Worker built successfully');
  } catch (error) {
    console.error('❌ Error building worker:', error);
    process.exit(1);
  }
}

buildWorker(); 