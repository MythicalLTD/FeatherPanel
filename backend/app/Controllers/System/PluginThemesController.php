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

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\PluginFrontendScanner;
use App\Plugins\Events\Events\PluginUiEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PluginThemesController
{
    /**
     * Allowed CSS custom property names plugins may set via theme tokens.
     *
     * @var list<string>
     */
    private const TOKEN_KEYS = [
        'background',
        'foreground',
        'card',
        'card-foreground',
        'popover',
        'popover-foreground',
        'primary',
        'primary-foreground',
        'secondary',
        'secondary-foreground',
        'muted',
        'muted-foreground',
        'accent',
        'accent-foreground',
        'destructive',
        'destructive-foreground',
        'border',
        'input',
        'ring',
        'radius',
    ];

    #[OA\Get(
        path: '/api/system/plugin-themes',
        summary: 'List plugin theme packs',
        description: 'Aggregate Frontend/theme.json declarations from installed plugins.',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'Theme packs retrieved successfully'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function index(Request $request): Response
    {
        $themes = [
            [
                'id' => 'default',
                'packId' => 'default',
                'plugin' => null,
                'pluginName' => 'FeatherPanel',
                'name' => 'Default',
                'preview' => null,
                'tokens' => ['light' => new \stdClass(), 'dark' => new \stdClass()],
                'accents' => [],
                'defaults' => new \stdClass(),
                'css' => null,
                'cssUrl' => null,
            ],
        ];

        foreach (PluginFrontendScanner::listPluginIdentifiers() as $plugin) {
            $data = PluginFrontendScanner::readJsonFile($plugin, 'Frontend/theme.json');
            if ($data === null) {
                continue;
            }

            // Support either a single theme object or { "themes": [ ... ] }.
            $items = [];
            if (isset($data['themes']) && is_array($data['themes'])) {
                $items = $data['themes'];
            } elseif (isset($data['id']) || isset($data['name']) || isset($data['tokens'])) {
                $items = [$data];
            }

            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $normalized = $this->normalizeTheme($plugin, $item);
                if ($normalized !== null) {
                    $themes[] = $normalized;
                }
            }
        }

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                PluginUiEvent::onThemesRetrieved(),
                ['themes' => $themes]
            );
        }

        return ApiResponse::success(
            ['themes' => $themes],
            'Providing plugin themes',
            200
        );
    }

    #[OA\Get(
        path: '/api/system/plugin-theme-css',
        summary: 'Get active plugin theme CSS',
        description: 'Serve Frontend theme CSS for a specific pack id (plugin:packId).',
        tags: ['System'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'query',
                required: true,
                schema: new OA\Schema(type: 'string'),
                description: 'Theme pack id in the form pluginId:themeId'
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Theme CSS'),
            new OA\Response(response: 404, description: 'Theme CSS not found'),
        ]
    )]
    public function css(Request $request): Response
    {
        $id = trim((string) $request->query->get('id', ''));
        if ($id === '' || $id === 'default' || !str_contains($id, ':')) {
            return new Response("/* no theme css */\n", 200, [
                'Content-Type' => 'text/css; charset=utf-8',
                'Cache-Control' => 'public, max-age=60',
            ]);
        }

        [$plugin, $themeId] = explode(':', $id, 2);
        $plugin = preg_replace('/[^a-zA-Z0-9_\-]/', '', $plugin) ?? '';
        $themeId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $themeId) ?? '';
        if ($plugin === '' || $themeId === '') {
            return new Response("/* invalid theme id */\n", 404, [
                'Content-Type' => 'text/css; charset=utf-8',
            ]);
        }

        $data = PluginFrontendScanner::readJsonFile($plugin, 'Frontend/theme.json');
        if ($data === null) {
            return new Response("/* theme not found */\n", 404, [
                'Content-Type' => 'text/css; charset=utf-8',
            ]);
        }

        $items = [];
        if (isset($data['themes']) && is_array($data['themes'])) {
            $items = $data['themes'];
        } else {
            $items = [$data];
        }

        $cssRelative = null;
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $itemId = (string) ($item['id'] ?? 'default');
            if ($itemId !== $themeId) {
                continue;
            }
            $css = $item['css'] ?? null;
            if (is_string($css) && $css !== '') {
                $cssRelative = ltrim(str_replace('\\', '/', $css), '/');
            }
            break;
        }

        if ($cssRelative === null) {
            return new Response("/* no css for theme */\n", 200, [
                'Content-Type' => 'text/css; charset=utf-8',
                'Cache-Control' => 'public, max-age=60',
            ]);
        }

        // Only allow files under Frontend/
        if (str_contains($cssRelative, '..') || str_starts_with($cssRelative, '/')) {
            return new Response("/* invalid css path */\n", 400, [
                'Content-Type' => 'text/css; charset=utf-8',
            ]);
        }

        $path = PluginFrontendScanner::getAddonsDir() . '/' . $plugin . '/Frontend/' . $cssRelative;
        if (!is_file($path) || !is_readable($path)) {
            return new Response("/* css file missing */\n", 404, [
                'Content-Type' => 'text/css; charset=utf-8',
            ]);
        }

        $body = "/* Plugin theme: {$plugin}:{$themeId} */\n" . file_get_contents($path) . "\n";
        $etag = '"' . hash('sha256', $body) . '"';

        if ($request->headers->get('If-None-Match') === $etag) {
            return new Response('', 304, [
                'ETag' => $etag,
                'Cache-Control' => 'public, max-age=60',
            ]);
        }

        return new Response($body, 200, [
            'Content-Type' => 'text/css; charset=utf-8',
            'ETag' => $etag,
            'Cache-Control' => 'public, max-age=60',
        ]);
    }

    /**
     * @param array<string, mixed> $item
     *
     * @return array<string, mixed>|null
     */
    private function normalizeTheme(string $plugin, array $item): ?array
    {
        $packId = trim((string) ($item['id'] ?? 'default'));
        if ($packId === '') {
            $packId = 'default';
        }
        $packId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $packId) ?? 'default';

        $name = trim((string) ($item['name'] ?? $packId));
        if ($name === '') {
            $name = $packId;
        }

        $preview = null;
        if (isset($item['preview']) && is_string($item['preview']) && $item['preview'] !== '') {
            $previewRel = ltrim(str_replace('\\', '/', $item['preview']), '/');
            if (!str_contains($previewRel, '..')) {
                $preview = PluginFrontendScanner::componentPublicUrl($plugin, $previewRel);
            }
        }

        $tokens = [
            'light' => $this->sanitizeTokens(is_array($item['tokens']['light'] ?? null) ? $item['tokens']['light'] : []),
            'dark' => $this->sanitizeTokens(is_array($item['tokens']['dark'] ?? null) ? $item['tokens']['dark'] : []),
        ];

        $accents = [];
        if (isset($item['accents']) && is_array($item['accents'])) {
            foreach ($item['accents'] as $accent) {
                if (is_string($accent) && $accent !== '') {
                    $accents[] = $accent;
                }
            }
        }

        $defaults = [];
        if (isset($item['defaults']) && is_array($item['defaults'])) {
            foreach (['backgroundType', 'fontFamily', 'accentColor'] as $key) {
                if (isset($item['defaults'][$key]) && is_string($item['defaults'][$key])) {
                    $defaults[$key] = $item['defaults'][$key];
                }
            }
        }

        $css = null;
        $cssUrl = null;
        if (isset($item['css']) && is_string($item['css']) && $item['css'] !== '') {
            $css = ltrim(str_replace('\\', '/', $item['css']), '/');
            if (!str_contains($css, '..')) {
                $cssUrl = '/api/system/plugin-theme-css?id=' . rawurlencode($plugin . ':' . $packId);
            } else {
                $css = null;
            }
        }

        return [
            'id' => $plugin . ':' . $packId,
            'packId' => $packId,
            'plugin' => $plugin,
            'pluginName' => PluginFrontendScanner::pluginDisplayName($plugin),
            'name' => $name,
            'preview' => $preview,
            'tokens' => $tokens,
            'accents' => $accents,
            'defaults' => $defaults,
            'css' => $css,
            'cssUrl' => $cssUrl,
        ];
    }

    /**
     * @param array<mixed> $tokens
     *
     * @return array<string, string>
     */
    private function sanitizeTokens(array $tokens): array
    {
        $out = [];
        foreach ($tokens as $key => $value) {
            if (!is_string($key) || !is_string($value)) {
                continue;
            }
            if (!in_array($key, self::TOKEN_KEYS, true)) {
                continue;
            }
            // HSL components like "210 40% 98%" or radius like "0.5rem"
            $trimmed = trim($value);
            if ($trimmed === '' || strlen($trimmed) > 64) {
                continue;
            }
            if (!preg_match('/^[0-9a-zA-Z%#.\s\/(),-]+$/', $trimmed)) {
                continue;
            }
            $out[$key] = $trimmed;
        }

        return $out;
    }
}
