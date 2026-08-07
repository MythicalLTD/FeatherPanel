<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Controllers\System;

use App\App;
use App\Cache\Cache;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PluginCssController
{
    #[OA\Get(
        path: '/api/system/plugin-css',
        summary: 'Get plugin CSS',
        description: 'Retrieve combined CSS from all installed plugins. This endpoint aggregates CSS files from all plugins and returns them as a single stylesheet.',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin CSS retrieved successfully',
                content: new OA\MediaType(
                    mediaType: 'text/css',
                    schema: new OA\Schema(type: 'string', description: 'Combined CSS from all plugins')
                ),
                headers: [
                    new OA\Header(
                        header: 'Cache-Control',
                        description: 'Cache control header',
                        schema: new OA\Schema(type: 'string', example: 'public, max-age=60')
                    ),
                ]
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve plugin CSS'),
        ]
    )]
    public function index(Request $request): Response
    {
        $cacheKey = 'plugin_css_bundle';
        $cached = Cache::get($cacheKey);
        if (is_array($cached) && isset($cached['body'], $cached['etag'])) {
            $cssContent = (string) $cached['body'];
            $etag = (string) $cached['etag'];
        } else {
            $cssContent = "/* Plugin CSS */\n";

            $pluginDir = __DIR__ . '/../../../storage/addons';
            if (is_dir($pluginDir)) {
                $plugins = array_diff(scandir($pluginDir), ['.', '..']);
                foreach ($plugins as $plugin) {
                    $cssPath = $pluginDir . "/$plugin/Frontend/index.css";
                    if (file_exists($cssPath)) {
                        $cssContent .= "\n/* Plugin: $plugin */\n";
                        $cssContent .= file_get_contents($cssPath) . "\n";
                    }
                }
            }

            $cssContent .= "\n/* ===== FeatherPanel: Start of Custom CSS ===== */\n";
            $cssContent .= "/* This section is reserved for user-defined or system-injected CSS. */\n";
            $cssContent .= App::getInstance(true)->getConfig()->getSetting(
                ConfigInterface::CUSTOM_CSS,
                "/* dummy css - does nothing */\n/* Feel free to override the 'custom_css' setting in your configuration. */"
            ) . "\n";
            $cssContent .= "/* ===== FeatherPanel: End of Custom CSS ===== */\n";

            $etag = '"' . hash('sha256', $cssContent) . '"';
            Cache::put($cacheKey, ['body' => $cssContent, 'etag' => $etag], 2);
        }

        if ($request->headers->get('If-None-Match') === $etag) {
            return new Response('', 304, [
                'ETag' => $etag,
                'Cache-Control' => 'public, max-age=60',
            ]);
        }

        return new Response($cssContent, 200, [
            'Content-Type' => 'text/css',
            'ETag' => $etag,
            'Cache-Control' => 'public, max-age=60',
        ]);
    }
}
