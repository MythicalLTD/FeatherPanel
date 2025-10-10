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

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'PluginSidebar',
    type: 'object',
    properties: [
        new OA\Property(property: 'sidebar', type: 'object', properties: [
            new OA\Property(property: 'server', type: 'object', description: 'Server section sidebar items'),
            new OA\Property(property: 'dashboard', type: 'object', description: 'Dashboard section sidebar items'),
            new OA\Property(property: 'admin', type: 'object', description: 'Admin section sidebar items'),
        ], description: 'Complete sidebar structure with plugin items'),
    ]
)]
#[OA\Schema(
    schema: 'SidebarItem',
    type: 'object',
    properties: [
        new OA\Property(property: 'plugin', type: 'string', description: 'Plugin identifier'),
        new OA\Property(property: 'pluginName', type: 'string', description: 'Plugin display name'),
        new OA\Property(property: 'title', type: 'string', description: 'Sidebar item title'),
        new OA\Property(property: 'url', type: 'string', description: 'Sidebar item URL'),
        new OA\Property(property: 'icon', type: 'string', description: 'Sidebar item icon'),
        new OA\Property(property: 'permission', type: 'string', nullable: true, description: 'Required permission for this item'),
    ]
)]
class PluginSidebarController
{
    #[OA\Get(
        path: '/api/system/plugin-sidebar',
        summary: 'Get plugin sidebar configuration',
        description: 'Retrieve sidebar configuration from all installed plugins. This endpoint aggregates sidebar items from all plugins and organizes them by section (server, dashboard, admin).',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin sidebar configuration retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/PluginSidebar')
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve plugin sidebar configuration'),
        ]
    )]
    public function index(Request $request): Response
    {
        $sidebarData = [
            'server' => [],
            'dashboard' => [],
            'admin' => [],
        ];

        // Scan plugins for sidebar configuration
        $pluginDir = __DIR__ . '/../../../storage/addons';
        if (is_dir($pluginDir)) {
            $plugins = array_diff(scandir($pluginDir), ['.', '..']);

            foreach ($plugins as $plugin) {
                $sidebarConfigPath = $pluginDir . "/$plugin/Frontend/sidebar.json";

                // Check if plugin has sidebar configuration
                if (file_exists($sidebarConfigPath)) {
                    try {
                        $sidebarConfig = json_decode(file_get_contents($sidebarConfigPath), true);

                        if (json_last_error() === JSON_ERROR_NONE && is_array($sidebarConfig)) {
                            // Merge plugin sidebar items into main structure
                            foreach (['server', 'dashboard', 'admin'] as $section) {
                                if (isset($sidebarConfig[$section]) && is_array($sidebarConfig[$section])) {
                                    foreach ($sidebarConfig[$section] as $key => $item) {
                                        // Add plugin identifier to avoid conflicts
                                        $pluginKey = "/{$plugin}" . $key;
                                        $sidebarData[$section][$pluginKey] = array_merge($item, [
                                            'plugin' => $plugin,
                                            'pluginName' => ucfirst($plugin),
                                        ]);
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        // Log error but continue processing other plugins
                        error_log("Error processing sidebar config for plugin {$plugin}: " . $e->getMessage());
                    }
                }

                // Also check for legacy sidebar items (for backward compatibility)
                $legacySidebarPath = $pluginDir . "/$plugin/Frontend/sidebar.php";
                if (file_exists($legacySidebarPath)) {
                    try {
                        $legacySidebar = include $legacySidebarPath;
                        if (is_array($legacySidebar)) {
                            // Process legacy format
                            foreach ($legacySidebar as $section => $items) {
                                if (isset($sidebarData[$section]) && is_array($items)) {
                                    foreach ($items as $key => $item) {
                                        $pluginKey = "/{$plugin}" . $key;
                                        $sidebarData[$section][$pluginKey] = array_merge($item, [
                                            'plugin' => $plugin,
                                            'pluginName' => ucfirst($plugin),
                                        ]);
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        error_log("Error processing legacy sidebar for plugin {$plugin}: " . $e->getMessage());
                    }
                }
            }
        }

        return ApiResponse::success([
            'sidebar' => $sidebarData,
        ], 'Providing sidebar', 200);
    }
}
