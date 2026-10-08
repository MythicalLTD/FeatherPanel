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
use App\Helpers\AppUrlHelper;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'WebAppManifest',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Webapp name'),
        new OA\Property(property: 'short_name', type: 'string', description: 'Webapp short name'),
        new OA\Property(property: 'description', type: 'string', description: 'Webapp description'),
        new OA\Property(property: 'icons', type: 'array', items: new OA\Items(type: 'object')),
        new OA\Property(property: 'start_url', type: 'string'),
        new OA\Property(property: 'scope', type: 'string'),
        new OA\Property(property: 'display', type: 'string'),
        new OA\Property(property: 'theme_color', type: 'string'),
        new OA\Property(property: 'background_color', type: 'string'),
    ]
)]
class WebAppController
{
    #[OA\Get(
        path: '/api/manifest.webmanifest',
        summary: 'Get webapp manifest',
        description: 'Retrieve webapp manifest for PWA functionality using panel branding settings.',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'Manifest retrieved successfully'),
            new OA\Response(response: 404, description: 'PWA disabled'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function index(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        $enabled = $config->getSetting(ConfigInterface::APP_PWA_ENABLED, 'false') === 'true';

        $appName = trim((string) $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'));
        if ($appName === '') {
            $appName = 'FeatherPanel';
        }

        $shortName = trim((string) $config->getSetting(ConfigInterface::APP_PWA_SHORT_NAME, ''));
        if ($shortName === '') {
            $shortName = $appName;
        }

        $description = trim((string) $config->getSetting(ConfigInterface::APP_PWA_DESCRIPTION, ''));
        if ($description === '') {
            $description = trim((string) $config->getSetting(ConfigInterface::APP_SEO_DESCRIPTION, ''));
        }
        if ($description === '') {
            $description = $appName;
        }

        $themeColor = $this->sanitizeHexColor(
            (string) $config->getSetting(ConfigInterface::APP_PWA_THEME_COLOR, '#000000'),
            '#000000'
        );
        $backgroundColor = $this->sanitizeHexColor(
            (string) $config->getSetting(ConfigInterface::APP_PWA_BG_COLOR, '#ffffff'),
            '#ffffff'
        );

        $iconAny = $this->resolveIconUrl(
            (string) $config->getSetting(ConfigInterface::APP_LOGO_DARK, ''),
            (string) $config->getSetting(ConfigInterface::APP_LOGO_WHITE, '')
        );
        $iconDark = $this->resolveIconUrl(
            (string) $config->getSetting(ConfigInterface::APP_LOGO_WHITE, ''),
            (string) $config->getSetting(ConfigInterface::APP_LOGO_DARK, '')
        );

        if (!$enabled) {
            return ApiResponse::sendManualResponse([
                'name' => $appName,
                'short_name' => $shortName,
                'description' => $description,
                'start_url' => '/',
                'scope' => '/',
                'display' => 'browser',
                'theme_color' => $themeColor,
                'background_color' => $backgroundColor,
                'icons' => [],
            ], 200);
        }

        $icons = [];
        foreach (['192x192', '512x512'] as $size) {
            $icons[] = [
                'src' => $iconAny,
                'sizes' => $size,
                'type' => $this->guessImageType($iconAny),
                'purpose' => 'any',
            ];
            $icons[] = [
                'src' => $iconAny,
                'sizes' => $size,
                'type' => $this->guessImageType($iconAny),
                'purpose' => 'maskable',
            ];
        }
        if ($iconDark !== $iconAny) {
            $icons[] = [
                'src' => $iconDark,
                'sizes' => '512x512',
                'type' => $this->guessImageType($iconDark),
                'purpose' => 'any',
            ];
        }

        $shortName = function_exists('mb_substr')
            ? mb_substr($shortName, 0, 12)
            : substr($shortName, 0, 12);

        $manifest = [
            'name' => $appName,
            'short_name' => $shortName,
            'description' => $description,
            'start_url' => '/dashboard',
            'scope' => '/',
            'id' => '/',
            'display' => 'standalone',
            'display_override' => ['standalone', 'minimal-ui', 'browser'],
            'theme_color' => $themeColor,
            'background_color' => $backgroundColor,
            'orientation' => 'any',
            'lang' => 'en',
            'dir' => 'ltr',
            'categories' => ['productivity', 'utilities'],
            'prefer_related_applications' => false,
            'icons' => $icons,
            'shortcuts' => [
                [
                    'name' => 'Dashboard',
                    'short_name' => 'Dashboard',
                    'description' => 'Open your dashboard',
                    'url' => '/dashboard',
                    'icons' => [
                        [
                            'src' => $iconAny,
                            'sizes' => '192x192',
                            'type' => $this->guessImageType($iconAny),
                        ],
                    ],
                ],
                [
                    'name' => 'Account',
                    'short_name' => 'Account',
                    'description' => 'Manage your account',
                    'url' => '/dashboard/account',
                    'icons' => [
                        [
                            'src' => $iconAny,
                            'sizes' => '192x192',
                            'type' => $this->guessImageType($iconAny),
                        ],
                    ],
                ],
            ],
        ];

        return ApiResponse::sendManualResponse($manifest, 200);
    }

    private function sanitizeHexColor(string $value, string $fallback): string
    {
        $value = trim($value);
        if (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value) === 1) {
            return $value;
        }

        return $fallback;
    }

    private function resolveIconUrl(string $primary, string $fallback): string
    {
        $candidate = trim($primary) !== '' ? trim($primary) : trim($fallback);
        if ($candidate === '') {
            $candidate = '/assets/logo.png';
        }

        if (str_starts_with($candidate, 'http://') || str_starts_with($candidate, 'https://')) {
            return $candidate;
        }

        if (str_starts_with($candidate, '//')) {
            return 'https:' . $candidate;
        }

        if (!str_starts_with($candidate, '/')) {
            $candidate = '/' . $candidate;
        }

        return AppUrlHelper::baseUrl() . $candidate;
    }

    private function guessImageType(string $url): string
    {
        $path = strtolower(parse_url($url, PHP_URL_PATH) ?? '');
        if (str_ends_with($path, '.svg')) {
            return 'image/svg+xml';
        }
        if (str_ends_with($path, '.jpg') || str_ends_with($path, '.jpeg')) {
            return 'image/jpeg';
        }
        if (str_ends_with($path, '.webp')) {
            return 'image/webp';
        }
        if (str_ends_with($path, '.ico')) {
            return 'image/x-icon';
        }

        return 'image/png';
    }
}
