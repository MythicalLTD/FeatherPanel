import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Enable standalone output for optimized Docker builds
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // Proxy API requests to backend during development (like Vite proxy)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8721/api/:path*",
      },
      {
        source: "/attachments/:path*",
        destination: "http://localhost:8721/attachments/:path*",
      },
      {
        source: "/addons/:path*",
        destination: "http://localhost:8721/addons/:path*",
      },
      {
        source: "/components/:path*",
        destination: "http://localhost:8721/components/:path*",
      },
      {
        source: "/pma/:path*",
        destination: "http://localhost:8721/pma/:path*",
      },
    ];
  },
};

export default nextConfig;
