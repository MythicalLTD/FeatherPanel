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
        new OA\Property(property: 'title', type: 'string', nullable: true, description: 'Optional title to display above the widget content'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Optional description text for the widget'),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Optional icon identifier used in the widget header'),
        new OA\Property(
            property: 'size',
            oneOf: [
                new OA\Schema(type: 'string', enum: ['full', 'half', 'third', 'quarter']),
                new OA\Schema(
                    type: 'object',
                    additionalProperties: new OA\AdditionalProperties(type: 'integer'),
                    description: 'Responsive column span configuration per breakpoint'
                ),
            ],
            description: 'Widget size preset or explicit responsive column configuration'
        ),
        new OA\Property(
            property: 'layout',
            type: 'object',
            nullable: true,
            description: 'Advanced layout overrides (columns, breakpoints, row span)',
            additionalProperties: new OA\AdditionalProperties(type: 'integer')
        ),
        new OA\Property(
            property: 'card',
            type: 'object',
            nullable: true,
            description: 'Card presentation options',
            properties: [
                new OA\Property(property: 'enabled', type: 'boolean', description: 'Wrap widget in a card container'),
                new OA\Property(property: 'variant', type: 'string', description: 'Card variant style'),
                new OA\Property(property: 'padding', type: 'string', description: 'Card content padding size'),
                new OA\Property(
                    property: 'header',
                    type: 'object',
                    nullable: true,
                    properties: [
                        new OA\Property(property: 'show', type: 'boolean', description: 'Display the card header'),
                        new OA\Property(property: 'title', type: 'string', nullable: true, description: 'Header title override'),
                        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Header description text'),
                        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Header icon identifier'),
                    ]
                ),
                new OA\Property(property: 'bodyClass', type: 'string', nullable: true, description: 'Additional classes for the card body'),
                new OA\Property(
                    property: 'footer',
                    type: 'object',
                    nullable: true,
                    properties: [
                        new OA\Property(property: 'show', type: 'boolean', description: 'Display the card footer'),
                        new OA\Property(property: 'text', type: 'string', nullable: true, description: 'Footer helper text'),
                    ]
                ),
            ]
        ),
        new OA\Property(
            property: 'behavior',
            type: 'object',
            nullable: true,
            description: 'Behavior overrides for loading and error states',
            properties: [
                new OA\Property(property: 'loadingMessage', type: 'string', nullable: true, description: 'Custom loading message'),
                new OA\Property(property: 'errorMessage', type: 'string', nullable: true, description: 'Custom error message'),
                new OA\Property(property: 'retryLabel', type: 'string', nullable: true, description: 'Custom label for retry button'),
                new OA\Property(property: 'emptyStateMessage', type: 'string', nullable: true, description: 'Custom empty state message'),
            ]
        ),
        new OA\Property(
            property: 'iframe',
            type: 'object',
            nullable: true,
            description: 'Iframe attribute overrides',
            properties: [
                new OA\Property(property: 'minHeight', type: 'string', nullable: true),
                new OA\Property(property: 'maxHeight', type: 'string', nullable: true),
                new OA\Property(property: 'sandbox', type: 'string', nullable: true),
                new OA\Property(property: 'allow', type: 'string', nullable: true),
                new OA\Property(property: 'loading', type: 'string', nullable: true),
                new OA\Property(property: 'referrerPolicy', type: 'string', nullable: true),
                new OA\Property(property: 'title', type: 'string', nullable: true),
                new OA\Property(property: 'ariaLabel', type: 'string', nullable: true),
            ]
        ),
        new OA\Property(
            property: 'classes',
            type: 'object',
            nullable: true,
            description: 'Optional CSS class overrides',
            properties: [
                new OA\Property(property: 'container', type: 'string', nullable: true),
                new OA\Property(property: 'card', type: 'string', nullable: true),
                new OA\Property(property: 'header', type: 'string', nullable: true),
                new OA\Property(property: 'content', type: 'string', nullable: true),
                new OA\Property(property: 'iframe', type: 'string', nullable: true),
                new OA\Property(property: 'footer', type: 'string', nullable: true),
            ]
        ),
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
                                    'pluginName' => $widget['pluginName'] ?? ucfirst(str_replace(['-', '_'], ' ', $plugin)),
                                    'component' => $component,
                                    'enabled' => $widget['enabled'] ?? true,
                                    'priority' => $widget['priority'] ?? 100,
                                    'page' => $page,
                                    'location' => $location,
                                    'title' => isset($widget['title']) ? (string) $widget['title'] : null,
                                    'description' => isset($widget['description']) ? (string) $widget['description'] : null,
                                    'icon' => isset($widget['icon']) ? (string) $widget['icon'] : null,
                                    'size' => $this->normalizeWidgetSize($widget['size'] ?? null),
                                    'layout' => $this->normalizeWidgetLayout($widget),
                                    'card' => $this->normalizeCardOptions($widget['card'] ?? null),
                                    'behavior' => $this->normalizeBehaviorOptions($widget['behavior'] ?? null),
                                    'iframe' => $this->normalizeIframeOptions($widget['iframe'] ?? null),
                                    'classes' => $this->normalizeClassOptions($widget['classes'] ?? null),
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
            '<realmUuid>' => 'testData',
            '<spellUuid>' => 'testData',
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

    /**
     * Normalize widget size configuration.
     *
     * @param mixed $size Size configuration from widget definition
     *
     * @return string|array<string, int>
     */
    private function normalizeWidgetSize(mixed $size): string | array
    {
        if ($size === null) {
            return 'full';
        }

        if (is_string($size)) {
            $allowed = ['full', 'half', 'third', 'quarter'];

            if (in_array($size, $allowed, true)) {
                return $size;
            }

            if (is_numeric($size)) {
                $size = (int) $size;
            }
        }

        if (is_int($size)) {
            return [
                'default' => $this->clampGridColumns($size),
            ];
        }

        if (!is_array($size)) {
            return 'full';
        }

        $normalized = [];
        $allowedBreakpoints = ['default', 'sm', 'md', 'lg', 'xl'];

        foreach ($allowedBreakpoints as $breakpoint) {
            if (isset($size[$breakpoint]) && is_numeric($size[$breakpoint])) {
                $normalized[$breakpoint] = $this->clampGridColumns((int) $size[$breakpoint]);
            }
        }

        return empty($normalized) ? 'full' : $normalized;
    }

    /**
     * Normalize layout configuration to provide more granular control over columns and spans.
     *
     * @param array<string, mixed> $widget
     *
     * @return array<string, int>|null
     */
    private function normalizeWidgetLayout(array $widget): ?array
    {
        $layout = $widget['layout'] ?? null;

        if (!is_array($layout)) {
            return null;
        }

        $normalized = [];
        $allowedKeys = ['columns', 'sm', 'md', 'lg', 'xl', 'rowSpan', 'colSpan'];

        foreach ($allowedKeys as $key) {
            if (isset($layout[$key]) && is_numeric($layout[$key])) {
                $normalized[$key] = $this->clampGridColumns((int) $layout[$key]);
            }
        }

        return empty($normalized) ? null : $normalized;
    }

    /**
     * Normalize card presentation options.
     *
     * @return array<string, mixed>|null
     */
    private function normalizeCardOptions(mixed $card): ?array
    {
        if ($card === null) {
            return [
                'enabled' => true,
                'variant' => 'default',
                'padding' => 'md',
            ];
        }

        if (!is_array($card)) {
            return [
                'enabled' => (bool) $card,
                'variant' => 'default',
                'padding' => 'md',
            ];
        }

        $normalized = [
            'enabled' => array_key_exists('enabled', $card) ? (bool) $card['enabled'] : true,
            'variant' => isset($card['variant']) && is_string($card['variant']) ? $card['variant'] : 'default',
            'padding' => isset($card['padding']) && is_string($card['padding']) ? $card['padding'] : 'md',
        ];

        if (isset($card['header']) && is_array($card['header'])) {
            $normalized['header'] = [
                'show' => array_key_exists('show', $card['header']) ? (bool) $card['header']['show'] : true,
                'title' => isset($card['header']['title']) ? (string) $card['header']['title'] : null,
                'description' => isset($card['header']['description']) ? (string) $card['header']['description'] : null,
                'icon' => isset($card['header']['icon']) ? (string) $card['header']['icon'] : null,
            ];
        }

        if (isset($card['bodyClass']) && is_string($card['bodyClass'])) {
            $normalized['bodyClass'] = $card['bodyClass'];
        }

        if (isset($card['footer']) && is_array($card['footer'])) {
            $normalized['footer'] = [
                'show' => array_key_exists('show', $card['footer']) ? (bool) $card['footer']['show'] : false,
                'text' => isset($card['footer']['text']) ? (string) $card['footer']['text'] : null,
            ];
        }

        return $normalized;
    }

    /**
     * Normalize widget behavior overrides (loading/error messages, retry labels).
     *
     * @return array<string, string>|null
     */
    private function normalizeBehaviorOptions(mixed $behavior): ?array
    {
        if (!is_array($behavior)) {
            return null;
        }

        $normalized = [];

        if (isset($behavior['loadingMessage']) && is_string($behavior['loadingMessage'])) {
            $normalized['loadingMessage'] = $behavior['loadingMessage'];
        }

        if (isset($behavior['errorMessage']) && is_string($behavior['errorMessage'])) {
            $normalized['errorMessage'] = $behavior['errorMessage'];
        }

        if (isset($behavior['retryLabel']) && is_string($behavior['retryLabel'])) {
            $normalized['retryLabel'] = $behavior['retryLabel'];
        }

        if (isset($behavior['emptyStateMessage']) && is_string($behavior['emptyStateMessage'])) {
            $normalized['emptyStateMessage'] = $behavior['emptyStateMessage'];
        }

        return empty($normalized) ? null : $normalized;
    }

    /**
     * Normalize iframe attribute overrides.
     *
     * @return array<string, string>|null
     */
    private function normalizeIframeOptions(mixed $iframe): ?array
    {
        if (!is_array($iframe)) {
            return null;
        }

        $normalized = [];
        $stringKeys = ['minHeight', 'maxHeight', 'sandbox', 'allow', 'loading', 'referrerPolicy', 'title', 'ariaLabel'];

        foreach ($stringKeys as $key) {
            if (isset($iframe[$key]) && is_string($iframe[$key])) {
                $normalized[$key] = $iframe[$key];
            }
        }

        return empty($normalized) ? null : $normalized;
    }

    /**
     * Normalize CSS class overrides for various widget parts.
     *
     * @return array<string, string>|null
     */
    private function normalizeClassOptions(mixed $classes): ?array
    {
        if (!is_array($classes)) {
            return null;
        }

        $normalized = [];
        $allowedKeys = ['container', 'card', 'header', 'content', 'iframe', 'footer'];

        foreach ($allowedKeys as $key) {
            if (isset($classes[$key]) && is_string($classes[$key])) {
                $normalized[$key] = $classes[$key];
            }
        }

        return empty($normalized) ? null : $normalized;
    }

    /**
     * Ensure grid column values stay within the 1-12 range.
     */
    private function clampGridColumns(int $value): int
    {
        return max(1, min(12, $value));
    }
}
