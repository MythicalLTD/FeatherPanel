/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import type { NextConfig } from 'next';
import path from 'path';
import type { Configuration as WebpackConfiguration } from 'webpack';

const nextConfig: NextConfig = {
    reactCompiler: true,

    turbopack: {
        root: path.resolve(__dirname),
    },

    experimental: {
        // Filesystem cache balloons RAM on large apps; use webpack dev by default instead.
        turbopackFileSystemCacheForDev: false,
    },

    webpack: (config: WebpackConfiguration, { dev }) => {
        if (dev) {
            // Keep dev compilation single-threaded to avoid spawning many hungry workers.
            config.parallelism = 1;
            if (config.cache && typeof config.cache === 'object') {
                config.cache = { ...config.cache, maxMemoryGenerations: 1 };
            }
        }
        return config;
    },

    // Enable standalone output for optimized Docker builds
    output: 'standalone',

    allowedDevOrigins: ['testingpanel.mythical.systems'],

    // Prevent caching of HTML so users always get fresh chunk references after deploys
    async headers() {
        return [
            {
                source: '/((?!_next/static)(?!_next/image)(?!api)(?!attachments)(?!addons)(?!components)(?!pma).*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, must-revalidate',
                    },
                ],
            },
        ];
    },

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
            {
                protocol: 'http',
                hostname: '**',
            },
        ],
    },

    // Proxy API requests to backend during development (like Vite proxy)
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
            {
                source: '/pma/:path*',
                destination: 'http://localhost:8721/pma/:path*',
            },
        ];
    },
};

export default nextConfig;
