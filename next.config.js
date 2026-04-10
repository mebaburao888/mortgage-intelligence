/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['chromadb', 'ml-kmeans'],
  },
  webpack: (config, { isServer }) => {
    // Chromadb and optional deps must never be bundled by webpack — server only
    const extraExternals = ['chromadb', 'chromadb-default-embed', '@xenova/transformers', 'ml-kmeans'];
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        ...extraExternals,
      ];
    } else {
      // Client-side: mark these as empty modules so webpack doesn't try to bundle them
      for (const pkg of extraExternals) {
        config.resolve = config.resolve || {};
        config.resolve.alias = config.resolve.alias || {};
        config.resolve.alias[pkg] = false;
      }
    }
    return config;
  },
};

module.exports = nextConfig;
