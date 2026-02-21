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
        new OA\Property(
            property: 'icons',
            type: 'array',
            description: 'Webapp icons with multiple sizes and purposes',
            items: new OA\Items(
                type: 'object',
                required: ['src', 'sizes', 'type'],
                properties: [
                    new OA\Property(property: 'src', type: 'string', description: 'Icon asset URL'),
                    new OA\Property(property: 'sizes', type: 'string', description: 'Icon dimensions (e.g. 192x192)'),
                    new OA\Property(property: 'type', type: 'string', description: 'MIME type for the icon'),
                    new OA\Property(property: 'purpose', type: 'string', description: 'Icon usage context (any, maskable, monochrome, etc.)'),
                ]
            )
        ),
        new OA\Property(property: 'start_url', type: 'string', description: 'Webapp start URL'),
        new OA\Property(property: 'scope', type: 'string', description: 'Webapp scope'),
        new OA\Property(property: 'display', type: 'string', description: 'Webapp display mode'),
        new OA\Property(property: 'theme_color', type: 'string', description: 'Webapp theme color (indigo-500)'),
        new OA\Property(property: 'background_color', type: 'string', description: 'Webapp background color (darkest theme)'),
        new OA\Property(property: 'orientation', type: 'string', description: 'Webapp orientation'),
        new OA\Property(
            property: 'categories',
            type: 'array',
            description: 'Webapp categories',
            items: new OA\Items(type: 'string')
        ),
        new OA\Property(property: 'lang', type: 'string', description: 'Webapp language'),
        new OA\Property(property: 'dir', type: 'string', description: 'Webapp text direction'),
        new OA\Property(property: 'id', type: 'string', description: 'Webapp unique identifier'),
        new OA\Property(property: 'prefer_related_applications', type: 'boolean', description: 'Prefer related applications'),
        new OA\Property(
            property: 'shortcuts',
            type: 'array',
            description: 'Webapp shortcuts for quick access',
            items: new OA\Items(
                type: 'object',
                required: ['name', 'short_name', 'description', 'url'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', description: 'Shortcut display name'),
                    new OA\Property(property: 'short_name', type: 'string', description: 'Shortcut short name'),
                    new OA\Property(property: 'description', type: 'string', description: 'Shortcut description'),
                    new OA\Property(property: 'url', type: 'string', description: 'Shortcut target URL'),
                    new OA\Property(
                        property: 'icons',
                        type: 'array',
                        description: 'Shortcut icons',
                        items: new OA\Items(
                            type: 'object',
                            required: ['src', 'sizes', 'type'],
                            properties: [
                                new OA\Property(property: 'src', type: 'string', description: 'Icon asset URL'),
                                new OA\Property(property: 'sizes', type: 'string', description: 'Icon dimensions'),
                                new OA\Property(property: 'type', type: 'string', description: 'MIME type for the icon'),
                            ]
                        )
                    ),
                ]
            )
        ),
        new OA\Property(
            property: 'display_override',
            type: 'array',
            description: 'Webapp display override modes',
            items: new OA\Items(type: 'string')
        ),
        new OA\Property(
            property: 'related_applications',
            type: 'array',
            description: 'Related applications',
            items: new OA\Items(
                type: 'object',
                properties: [
                    new OA\Property(property: 'platform', type: 'string', description: 'Platform identifier (e.g. play, itunes)'),
                    new OA\Property(property: 'url', type: 'string', description: 'Related application URL'),
                    new OA\Property(property: 'id', type: 'string', description: 'Application store identifier'),
                ]
            )
        ),
    ]
)]
class WebAppController
{
    #[OA\Get(
        path: '/api/manifest.webmanifest',
        summary: 'Get webapp manifest',
        description: 'Retrieve webapp manifest for PWA functionality.',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Public settings retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/WebAppManifest')
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve settings'),
        ]
    )]
    public function index(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        $appName = $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
        $appLogoWhite = $config->getSetting(ConfigInterface::APP_LOGO_WHITE, 'https://github.com/featherpanel-com.png');
        $appLogoDark = $config->getSetting(ConfigInterface::APP_LOGO_DARK, 'https://github.com/featherpanel-com.png');

        // PWA manifest with accurate FeatherPanel colors and enhanced styling
        $startUrl = '/';
        $display = 'standalone';
        $themeColor = '#6366f1'; // indigo-500 - matches the actual primary accent color
        $backgroundColor = '#020203'; // darkest background color from the app
        $orientation = 'any';
        $scope = '/';
        $categories = ['utilities', 'productivity', 'server', 'management', 'games'];

        $manifest = [
            'name' => $appName,
            'short_name' => $appName,
            'description' => $appName . "'s game server management dashboard",
            'start_url' => $startUrl,
            'scope' => $scope,
            'display' => $display,
            'theme_color' => $themeColor,
            'background_color' => $backgroundColor,
            'orientation' => $orientation,
            'categories' => $categories,
            'lang' => 'en',
            'dir' => 'ltr',
            'id' => '/api/manifest.webmanifest',
            'prefer_related_applications' => false,
            'icons' => [
                [
                    'src' => $appLogoWhite,
                    'sizes' => '72x72',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '96x96',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '128x128',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '144x144',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '152x152',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '384x384',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => $appLogoDark,
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any dark',
                ],
                [
                    'src' => $appLogoDark,
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'any dark',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'maskable',
                ],
                [
                    'src' => $appLogoWhite,
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'maskable',
                ],
            ],
            'shortcuts' => [
                [
                    'name' => 'Dashboard',
                    'short_name' => 'Dashboard',
                    'description' => 'View your game servers',
                    'url' => '/dashboard',
                    'icons' => [
                        [
                            'src' => $appLogoWhite,
                            'sizes' => '192x192',
                            'type' => 'image/png',
                        ],
                    ],
                ],
                [
                    'name' => 'Account Settings',
                    'short_name' => 'Account',
                    'description' => 'Manage your account',
                    'url' => '/dashboard/account',
                    'icons' => [
                        [
                            'src' => $appLogoWhite,
                            'sizes' => '192x192',
                            'type' => 'image/png',
                        ],
                    ],
                ],
            ],
            'display_override' => ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
            'related_applications' => [],
        ];

        return ApiResponse::sendManualResponse($manifest, 200);
    }
}
