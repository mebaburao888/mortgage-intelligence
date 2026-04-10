/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['chromadb', 'ml-kmeans'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Chromadb tries to load optional embedding modules via HTTPS — ignore them
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        'chromadb-default-embed',
        '@xenova/transformers',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
