<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

use App\App;
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

        $cssContent .= "\n/* ===== FeatherPanel: Start of Custom CSS ===== */\n";
        $cssContent .= "/* This section is reserved for user-defined or system-injected CSS. */\n";
        $cssContent .= App::getInstance(true)->getConfig()->getSetting(
            ConfigInterface::CUSTOM_CSS,
            "/* dummy css - does nothing */\n/* Feel free to override the 'custom_css' setting in your configuration. */"
        ) . "\n";
        $cssContent .= "/* ===== FeatherPanel: End of Custom CSS ===== */\n";

        return new Response($cssContent, 200, [
            'Content-Type' => 'text/css',
            // No cache
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
