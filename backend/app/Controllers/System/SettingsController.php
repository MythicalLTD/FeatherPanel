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

use App\App;
use App\Config\PublicConfig;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'PublicSettings',
    type: 'object',
    properties: [
        new OA\Property(property: 'settings', type: 'object', description: 'Public application settings with default values'),
    ]
)]
class SettingsController
{
    #[OA\Get(
        path: '/api/system/settings',
        summary: 'Get public settings',
        description: 'Retrieve public application settings with default values. These settings are safe to expose to frontend clients.',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Public settings retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/PublicSettings')
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve settings'),
        ]
    )]
    public function index(Request $request): Response
    {
        $appInstance = App::getInstance(true);
        $settingsPublic = PublicConfig::getPublicSettingsWithDefaults();
        $settings = $appInstance->getConfig()->getSettings(array_keys($settingsPublic));
        // Fill in any missing settings with defaults
        foreach ($settingsPublic as $key => $defaultValue) {
            if (!isset($settings[$key])) {
                $settings[$key] = $defaultValue;
            }
        }

        return ApiResponse::success(['settings' => $settings], 'Providing settings', 200);
    }
}
