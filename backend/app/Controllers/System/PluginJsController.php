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

class PluginJsController
{
    #[OA\Get(
        path: '/api/system/plugin-js',
        summary: 'Get plugin JavaScript',
        description: 'Retrieve combined JavaScript from all installed plugins. This endpoint aggregates JS files from all plugins and returns them as a single script with proper scoping.',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin JavaScript retrieved successfully',
                content: new OA\MediaType(
                    mediaType: 'application/javascript',
                    schema: new OA\Schema(type: 'string', description: 'Combined JavaScript from all plugins with proper scoping')
                ),
                headers: [
                    new OA\Header(
                        header: 'Cache-Control',
                        description: 'Cache control header',
                        schema: new OA\Schema(type: 'string', example: 'no-store, no-cache, must-revalidate, max-age=0')
                    ),
                ]
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve plugin JavaScript'),
        ]
    )]
    public function index(Request $request): Response
    {
        $jsContent = "// Plugin JavaScript\n";

        // Append plugin JS
        $pluginDir = __DIR__ . '/../../../storage/addons';
        if (is_dir($pluginDir)) {
            $plugins = array_diff(scandir($pluginDir), ['.', '..']);
            foreach ($plugins as $plugin) {
                $jsPath = $pluginDir . "/$plugin/Frontend/index.js";
                if (file_exists($jsPath)) {
                    $jsContent .= "\n// Plugin: $plugin\n";
                    $jsContent .= "(function() {\n";
                    $jsContent .= "  // Plugin scope: $plugin\n";
                    $jsContent .= file_get_contents($jsPath) . "\n";
                    $jsContent .= "})();\n";
                }
            }
        }

        return new Response($jsContent, 200, [
            'Content-Type' => 'application/javascript',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
