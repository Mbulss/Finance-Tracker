/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/manifest.json", destination: "/api/manifest" },
        { source: "/ServiceWorker.js", destination: "/api/service-worker" },
      ],
    };
  },
};

module.exports = nextConfig;
