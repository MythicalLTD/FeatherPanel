<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\System;

use OpenApi\Attributes as OA;
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
                        schema: new OA\Schema(type: 'string', example: 'no-store, no-cache, must-revalidate, max-age=0')
                    ),
                ]
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve plugin CSS'),
        ]
    )]
    public function index(Request $request): Response
    {
        $cssContent = "/* Plugin CSS */\n";

        // Append plugin CSS
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

        return new Response($cssContent, 200, [
            'Content-Type' => 'text/css',
            // No cache
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
