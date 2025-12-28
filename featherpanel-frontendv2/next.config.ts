import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8721/api/:path*',
      },
      {
        source: '/attachments/:path*',
        destination: 'http://localhost:8721/attachments/:path*',
      },
      {
        source: '/addons/:path*',
        destination: 'http://localhost:8721/addons/:path*',
      },
      {
        source: '/components/:path*',
        destination: 'http://localhost:8721/components/:path*',
      },
    ];
  },
};

export default nextConfig;
