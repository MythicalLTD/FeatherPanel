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
  async rewrites() {
    // Use environment variable for backend URL in production (Docker)
    // Falls back to localhost for local development
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8721";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/attachments/:path*",
        destination: `${backendUrl}/attachments/:path*`,
      },
      {
        source: "/addons/:path*",
        destination: `${backendUrl}/addons/:path*`,
      },
      {
        source: "/components/:path*",
        destination: `${backendUrl}/components/:path*`,
      },
    ];
  },
};

export default nextConfig;
