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

use App\App;
use App\Chat\User;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'PluginWidget',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Widget identifier'),
        new OA\Property(property: 'plugin', type: 'string', description: 'Plugin identifier'),
        new OA\Property(property: 'pluginName', type: 'string', description: 'Plugin display name'),
        new OA\Property(property: 'component', type: 'string', description: 'Component file path'),
        new OA\Property(property: 'enabled', type: 'boolean', description: 'Whether widget is enabled'),
        new OA\Property(property: 'priority', type: 'integer', description: 'Display priority (higher = first)'),
        new OA\Property(property: 'page', type: 'string', description: 'Target page identifier'),
        new OA\Property(property: 'location', type: 'string', description: 'Widget placement location'),
    ]
)]
#[OA\Schema(
    schema: 'PluginWidgetsResponse',
    type: 'object',
    properties: [
        new OA\Property(
            property: 'widgets',
            type: 'object',
            description: 'Widgets organized by page and location',
            additionalProperties: new OA\AdditionalProperties(
                type: 'object',
                additionalProperties: new OA\AdditionalProperties(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/PluginWidget')
                )
            )
        ),
    ]
)]
class PluginWidgetController
{
    #[OA\Get(
        path: '/api/system/plugin-widgets',
        summary: 'Get plugin widget configuration',
        description: 'Retrieve widget configuration from all installed plugins. Widgets are organized by page and location, sorted by priority.',
        tags: ['System'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                required: false,
                description: 'Filter widgets by page identifier (e.g., "server-console")',
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin widget configuration retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/PluginWidgetsResponse')
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve plugin widget configuration'),
        ]
    )]
    public function index(Request $request): Response
    {
        $pageFilter = $request->query->get('page');
        $widgetsByPage = [];

        // Scan plugins for widget configuration
        $pluginDir = __DIR__ . '/../../../storage/addons';
        if (is_dir($pluginDir)) {
            $plugins = array_diff(scandir($pluginDir), ['.', '..']);

            foreach ($plugins as $plugin) {
                $widgetConfigPath = $pluginDir . "/$plugin/Frontend/widgets.json";

                // Check if plugin has widget configuration
                if (file_exists($widgetConfigPath)) {
                    try {
                        $widgetConfig = json_decode(file_get_contents($widgetConfigPath), true);

                        if (json_last_error() === JSON_ERROR_NONE && is_array($widgetConfig)) {
                            foreach ($widgetConfig as $widget) {
                                // Validate widget structure
                                if (
                                    !isset($widget['id'])
                                    || !isset($widget['page'])
                                    || !isset($widget['location'])
                                    || !isset($widget['component'])
                                    || !($widget['enabled'] ?? true)
                                ) {
                                    continue;
                                }

                                // Apply page filter if provided
                                if ($pageFilter !== null && $widget['page'] !== $pageFilter) {
                                    continue;
                                }

                                $page = $widget['page'];
                                $location = $widget['location'];

                                // Initialize page structure if needed
                                if (!isset($widgetsByPage[$page])) {
                                    $widgetsByPage[$page] = [];
                                }

                                // Initialize location array if needed
                                if (!isset($widgetsByPage[$page][$location])) {
                                    $widgetsByPage[$page][$location] = [];
                                }

                                // Enhance component URL with parameters
                                $component = $this->addComponentParameters(
                                    $widget['component'],
                                    $request
                                );

                                // Build widget data
                                $widgetData = [
                                    'id' => $widget['id'],
                                    'plugin' => $plugin,
                                    'pluginName' => ucfirst($plugin),
                                    'component' => $component,
                                    'enabled' => $widget['enabled'] ?? true,
                                    'priority' => $widget['priority'] ?? 100,
                                    'size' => $widget['size'] ?? 'full', // full, half, third, quarter
                                ];

                                // Add widget to location array
                                $widgetsByPage[$page][$location][] = $widgetData;
                            }
                        }
                    } catch (\Exception $e) {
                        // Log error but continue processing other plugins
                        App::getInstance(true)->getLogger()->error('Error processing widget config for plugin ' . $plugin . ': ' . $e->getMessage());
                    }
                }
            }

            // Sort widgets by priority within each location (higher priority first)
            foreach ($widgetsByPage as $page => $locations) {
                foreach ($locations as $location => $widgets) {
                    usort($widgetsByPage[$page][$location], function ($a, $b) {
                        return ($b['priority'] ?? 100) <=> ($a['priority'] ?? 100);
                    });
                }
            }
        }

        return ApiResponse::success([
            'widgets' => $widgetsByPage,
        ], 'Providing widgets', 200);
    }

    /**
     * Add query parameters to component URL.
     *
     * @param string $component Original component URL
     * @param Request $request HTTP request
     *
     * @return string Enhanced component URL with query parameters
     */
    private function addComponentParameters(string $component, Request $request): string
    {
        // Replace placeholders with actual values
        $placeholders = [
            '<userUuid>' => 'testData',
            '<serverUuid>' => 'testData',
        ];
        $component = strtr($component, $placeholders);

        // Build query params
        $queryParams = [];

        // Always add userUuid
        if (strpos($component, 'userUuid=') === false) {
            if (isset($_COOKIE['remember_token'])) {
                $userInfo = User::getUserByRememberToken($_COOKIE['remember_token']);
                if ($userInfo != null && $userInfo['banned'] != 'true') {
                    $queryParams['userUuid'] = $userInfo['uuid'];
                } else {
                    $queryParams['userUuid'] = 'notAuthenticated';
                }
            } else {
                $queryParams['userUuid'] = 'notAuthenticated';
            }
        }

        // Add serverUuid if available from cookie
        if (isset($_COOKIE['serverUuid']) && strpos($component, 'serverUuid=') === false) {
            $queryParams['serverUuid'] = $_COOKIE['serverUuid'];
        }

        if (!empty($queryParams)) {
            $separator = (strpos($component, '?') !== false) ? '&' : '?';
            $component .= $separator . http_build_query($queryParams);
        }

        return $component;
    }
}
