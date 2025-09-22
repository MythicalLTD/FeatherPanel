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

use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PluginSidebarController
{
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
