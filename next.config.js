/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'worker_threads': 'commonjs worker_threads',
      });
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['worker_threads'],
  },
}

module.exports = nextConfig 