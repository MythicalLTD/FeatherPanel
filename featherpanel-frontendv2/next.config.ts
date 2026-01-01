/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
