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
use App\Chat\Server;
use App\Chat\User;
use App\Plugins\PluginSettings;
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
            new OA\Property(property: 'client', type: 'object', description: 'Client section sidebar items'),
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
        new OA\Property(property: 'icon', type: 'string', description: 'Sidebar item icon (emoji or URL). Used as fallback if lucideIcon is not provided.'),
        new OA\Property(property: 'lucideIcon', type: 'string', nullable: true, description: 'Lucide icon name (e.g., "camera", "search"). If provided, this will be used instead of the icon field. See https://lucide.dev/icons/ for available icons.'),
        new OA\Property(property: 'permission', type: 'string', nullable: true, description: 'Required permission for this item'),
        new OA\Property(property: 'group', type: 'string', nullable: true, description: 'Group name for organizing items (e.g., "Minecraft Java Edition"). Items with the same group name will be grouped together.'),
    ]
)]
class PluginSidebarController
{
    #[OA\Get(
        path: '/api/system/plugin-sidebar',
        summary: 'Get plugin sidebar configuration',
        description: 'Retrieve sidebar configuration from all installed plugins. This endpoint aggregates sidebar items from all plugins and organizes them by section (server, client, admin).',
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
            'client' => [],
            'admin' => [],
        ];

        // Get current server's spell_id if we're in server context
        $currentServerSpellId = null;
        if (isset($_COOKIE['serverUuid'])) {
            $serverUuid = $_COOKIE['serverUuid'];
            $server = Server::getServerByUuid($serverUuid);
            if ($server && isset($server['spell_id'])) {
                $currentServerSpellId = (int) $server['spell_id'];
            }
        }

        // Scan plugins for sidebar configuration
        $pluginDir = __DIR__ . '/../../../storage/addons';
        if (is_dir($pluginDir)) {
            $plugins = array_diff(scandir($pluginDir), ['.', '..']);

            foreach ($plugins as $plugin) {
                // Check if plugin has spell restrictions for server sidebar
                if ($currentServerSpellId !== null) {
                    $allowedOnlyOnSpells = PluginSettings::getSetting($plugin, 'plugin-sidebar-server-allowedOnlyOnSpells');
                    if ($allowedOnlyOnSpells !== null && $allowedOnlyOnSpells !== '') {
                        $allowedSpellIds = json_decode($allowedOnlyOnSpells, true);
                        if (is_array($allowedSpellIds) && !empty($allowedSpellIds)) {
                            // Plugin has restrictions - check if current server's spell is allowed
                            $allowedSpellIds = array_map('intval', $allowedSpellIds);
                            if (!in_array($currentServerSpellId, $allowedSpellIds, true)) {
                                // Skip this plugin's server sidebar items - not allowed on this spell
                                continue;
                            }
                        }
                    }
                }
                $sidebarConfigPath = $pluginDir . "/$plugin/Frontend/sidebar.json";

                // Check if plugin has sidebar configuration
                if (file_exists($sidebarConfigPath)) {
                    try {
                        $sidebarConfig = json_decode(file_get_contents($sidebarConfigPath), true);

                        if (json_last_error() === JSON_ERROR_NONE && is_array($sidebarConfig)) {
                            // Merge plugin sidebar items into main structure
                            foreach (['server', 'client', 'admin'] as $section) {
                                if (isset($sidebarConfig[$section]) && is_array($sidebarConfig[$section])) {
                                    foreach ($sidebarConfig[$section] as $key => $item) {
                                        // Add plugin identifier to avoid conflicts
                                        $pluginKey = "/{$plugin}" . $key;

                                        // Enhance component URL with parameters for all sections
                                        if (isset($item['component'])) {
                                            $item['component'] = $this->addComponentParameters($item['component'], $section, $request);
                                        }

                                        // Add spell restrictions info for frontend filtering (only for server section)
                                        $spellRestrictions = null;
                                        if ($section === 'server') {
                                            $allowedOnlyOnSpells = PluginSettings::getSetting($plugin, 'plugin-sidebar-server-allowedOnlyOnSpells');
                                            if ($allowedOnlyOnSpells !== null && $allowedOnlyOnSpells !== '') {
                                                $decoded = json_decode($allowedOnlyOnSpells, true);
                                                if (is_array($decoded) && !empty($decoded)) {
                                                    $spellRestrictions = array_map('intval', $decoded);
                                                }
                                            }
                                        }

                                        $sidebarData[$section][$pluginKey] = array_merge($item, [
                                            'plugin' => $plugin,
                                            'pluginName' => ucfirst($plugin),
                                            'allowedOnlyOnSpells' => $spellRestrictions, // null if no restrictions, array of spell IDs if restricted
                                        ]);
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        // Log error but continue processing other plugins
                        App::getInstance(true)->getLogger()->error('Error processing sidebar config for plugin ' . $plugin . ': ' . $e->getMessage());
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
                                // Skip server section if plugin has spell restrictions and doesn't match
                                if ($section === 'server' && $currentServerSpellId !== null) {
                                    $allowedOnlyOnSpells = PluginSettings::getSetting($plugin, 'plugin-sidebar-server-allowedOnlyOnSpells');
                                    if ($allowedOnlyOnSpells !== null && $allowedOnlyOnSpells !== '') {
                                        $allowedSpellIds = json_decode($allowedOnlyOnSpells, true);
                                        if (is_array($allowedSpellIds) && !empty($allowedSpellIds)) {
                                            $allowedSpellIds = array_map('intval', $allowedSpellIds);
                                            if (!in_array($currentServerSpellId, $allowedSpellIds, true)) {
                                                continue; // Skip this plugin's server sidebar items
                                            }
                                        }
                                    }
                                }

                                if (isset($sidebarData[$section]) && is_array($items)) {
                                    foreach ($items as $key => $item) {
                                        $pluginKey = "/{$plugin}" . $key;

                                        // Enhance component URL with parameters for all sections
                                        if (isset($item['component'])) {
                                            $item['component'] = $this->addComponentParameters($item['component'], $section, $request);
                                        }

                                        // Add spell restrictions info for frontend filtering (only for server section)
                                        $spellRestrictions = null;
                                        if ($section === 'server') {
                                            $allowedOnlyOnSpells = PluginSettings::getSetting($plugin, 'plugin-sidebar-server-allowedOnlyOnSpells');
                                            if ($allowedOnlyOnSpells !== null && $allowedOnlyOnSpells !== '') {
                                                $decoded = json_decode($allowedOnlyOnSpells, true);
                                                if (is_array($decoded) && !empty($decoded)) {
                                                    $spellRestrictions = array_map('intval', $decoded);
                                                }
                                            }
                                        }

                                        $sidebarData[$section][$pluginKey] = array_merge($item, [
                                            'plugin' => $plugin,
                                            'pluginName' => ucfirst($plugin),
                                            'allowedOnlyOnSpells' => $spellRestrictions, // null if no restrictions, array of spell IDs if restricted
                                        ]);
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        App::getInstance(true)->getLogger()->error('Error processing legacy sidebar for plugin ' . $plugin . ': ' . $e->getMessage());
                    }
                }
            }
        }

        return ApiResponse::success([
            'sidebar' => $sidebarData,
        ], 'Providing sidebar', 200);
    }

    /**
     * Add query parameters to component URL based on section.
     *
     * @param string $component Original component URL
     * @param string $section Section type (server, client, admin)
     *
     * @return string Enhanced component URL with placeholders
     */
    private function addComponentParameters(string $component, string $section, Request $request): string
    {
        // Replace all placeholders with testData and always add userUuid
        $placeholders = [
            '<userUuid>' => 'testData',
            '<serverUuid>' => 'testData',
        ];
        $component = strtr($component, $placeholders);

        // Build query params based on section
        $queryParams = [];

        // Always add userUuid=testData
        if (strpos($component, 'userUuid=testData') === false) {
            if (isset($_COOKIE['remember_token'])) {
                $userInfo = User::getUserByRememberToken($_COOKIE['remember_token']);
                if ($userInfo == null) {
                    return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
                }
                if ($userInfo['banned'] == 'true') {
                    return ApiResponse::error('User is banned', 'USER_BANNED');
                }
                $queryParams['userUuid'] = 'userUuid=' . $userInfo['uuid'];
            } else {
                $queryParams['userUuid'] = 'notAuthenticated';
            }
        }

        // Dynamically add section-specific params
        if ($section === 'server' && strpos($component, 'serverUuid=testData') === false) {
            if (isset($_COOKIE['serverUuid'])) {
                $queryParams['serverUuid'] = 'serverUuid=' . $_COOKIE['serverUuid'];
            } else {
                $queryParams['serverUuid'] = 'notFound';
            }
        }

        if (!empty($queryParams)) {
            $separator = (strpos($component, '?') !== false) ? '&' : '?';
            $component .= $separator . implode('&', $queryParams);
        }

        return $component;
    }
}
