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
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\PluginSettings;
use App\Plugins\Events\Events\PluginUiEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Aggregates Frontend/public.json from installed plugins so the panel can host
 * unauthenticated plugin pages without hardcoding addon routes in core.
 */
class PluginPublicPagesController
{
    /**
     * Paths plugins may not claim as public pages.
     *
     * @var list<string>
     */
    private const RESERVED_PREFIXES = [
        '/admin',
        '/dashboard',
        '/server',
        '/vds',
        '/auth',
        '/api',
        '/status',
        '/knowledgebase',
        '/knowladgebase',
        '/maintenance',
        '/components',
        '/addons',
        '/attachments',
        '/_next',
        '/locales',
    ];

    #[OA\Get(
        path: '/api/system/plugin-public-pages',
        summary: 'Get plugin public page registry',
        description: 'Aggregate public page declarations from addon Frontend/public.json files. Only enabled plugins and currently enabled pages are returned for auth allowlisting and public navigation.',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'Plugin public pages retrieved successfully'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function index(Request $request): Response
    {
        $pages = [];
        $pluginDir = __DIR__ . '/../../../storage/addons';

        if (is_dir($pluginDir)) {
            $plugins = array_diff(scandir($pluginDir), ['.', '..']);

            foreach ($plugins as $plugin) {
                if (!is_string($plugin) || $plugin === '' || !is_dir($pluginDir . '/' . $plugin)) {
                    continue;
                }

                $configPath = $pluginDir . '/' . $plugin . '/Frontend/public.json';
                if (!file_exists($configPath)) {
                    continue;
                }

                try {
                    $config = json_decode((string) file_get_contents($configPath), true);
                    if (json_last_error() !== JSON_ERROR_NONE || !is_array($config)) {
                        continue;
                    }

                    $declared = $config['pages'] ?? null;
                    if (!is_array($declared)) {
                        continue;
                    }

                    foreach ($declared as $item) {
                        if (!is_array($item)) {
                            continue;
                        }

                        $normalized = $this->normalizePage($plugin, $item);
                        if ($normalized === null) {
                            continue;
                        }

                        $pages[] = $normalized;
                    }
                } catch (\Throwable $e) {
                    App::getInstance(true)->getLogger()->error(
                        'Error processing public pages for plugin ' . $plugin . ': ' . $e->getMessage()
                    );

                    global $eventManager;
                    if (isset($eventManager) && $eventManager !== null) {
                        $eventManager->emit(
                            PluginUiEvent::onUiError(),
                            [
                                'source' => 'plugin_public_json',
                                'message' => $e->getMessage(),
                                'context' => ['plugin' => $plugin],
                            ]
                        );
                    }
                }
            }
        }

        usort($pages, static function (array $a, array $b): int {
            $orderA = (int) ($a['nav']['order'] ?? 100);
            $orderB = (int) ($b['nav']['order'] ?? 100);
            if ($orderA !== $orderB) {
                return $orderA <=> $orderB;
            }

            return strcmp((string) $a['path'], (string) $b['path']);
        });

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                PluginUiEvent::onPublicPagesRetrieved(),
                [
                    'pages' => $pages,
                ]
            );
        }

        return ApiResponse::success(
            [
                'pages' => array_values($pages),
            ],
            'Providing plugin public pages',
            200
        );
    }

    /**
     * @param array<string, mixed> $item
     *
     * @return array<string, mixed>|null
     */
    private function normalizePage(string $plugin, array $item): ?array
    {
        $path = $this->normalizePath((string) ($item['path'] ?? ''));
        $component = trim((string) ($item['component'] ?? ''));

        if ($path === '' || $component === '') {
            return null;
        }

        if ($this->isReservedPath($path)) {
            App::getInstance(true)->getLogger()->warning(
                "Plugin {$plugin} public page path '{$path}' is reserved and was ignored"
            );

            return null;
        }

        $query = [];
        if (isset($item['query']) && is_array($item['query'])) {
            foreach ($item['query'] as $key => $value) {
                if (!is_string($key) || $key === '') {
                    continue;
                }
                $query[$key] = is_scalar($value) ? (string) $value : '';
            }
        }

        $fallbackPath = $this->normalizePath((string) ($item['fallbackPath'] ?? ('/dashboard' . $path)));
        if ($fallbackPath === '') {
            $fallbackPath = '/dashboard' . $path;
        }

        $nav = null;
        if (isset($item['nav']) && is_array($item['nav'])) {
            $label = trim((string) ($item['nav']['label'] ?? $item['name'] ?? ''));
            if ($label !== '') {
                $nav = [
                    'label' => $label,
                    'order' => (int) ($item['nav']['order'] ?? 100),
                ];
            }
        }

        $enabled = $this->evaluateEnabled($plugin, $item['enabled'] ?? ['type' => 'always']);

        $componentPath = ltrim($component, '/');

        return [
            'plugin' => $plugin,
            'path' => $path,
            'name' => (string) ($item['name'] ?? ucfirst($plugin)),
            'component' => $componentPath,
            'query' => $query,
            'fallbackPath' => $fallbackPath,
            'nav' => $nav,
            'enabled' => $enabled,
        ];
    }

    private function normalizePath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '';
        }

        if ($path[0] !== '/') {
            $path = '/' . $path;
        }

        // Collapse duplicate slashes and strip trailing slash (except root).
        $path = preg_replace('#/+#', '/', $path) ?? $path;
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        return $path;
    }

    private function isReservedPath(string $path): bool
    {
        if ($path === '/' || $path === '') {
            return true;
        }

        foreach (self::RESERVED_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix . '/')) {
                return true;
            }
        }

        return false;
    }

    private function evaluateEnabled(string $plugin, $enabledConfig): bool
    {
        if ($enabledConfig === true || $enabledConfig === 'true' || $enabledConfig === 1 || $enabledConfig === '1') {
            return true;
        }

        if ($enabledConfig === false || $enabledConfig === 'false' || $enabledConfig === 0 || $enabledConfig === '0') {
            return false;
        }

        if (!is_array($enabledConfig)) {
            return true;
        }

        $type = (string) ($enabledConfig['type'] ?? 'always');

        if ($type === 'always') {
            return true;
        }

        if ($type === 'never') {
            return false;
        }

        if ($type === 'plugin_setting') {
            $key = trim((string) ($enabledConfig['key'] ?? ''));
            if ($key === '') {
                return false;
            }

            $expected = (string) ($enabledConfig['equals'] ?? 'true');
            $actual = PluginSettings::getSetting($plugin, $key);

            if ($actual === null || $actual === '') {
                return false;
            }

            return (string) $actual === $expected;
        }

        return false;
    }
}
