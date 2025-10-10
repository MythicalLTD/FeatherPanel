<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
