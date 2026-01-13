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
        $settings['app_version'] = str_replace('v', '', APP_VERSION);
        $core = [
            'version' => APP_VERSION,
            'upstream' => APP_UPSTREAM,
            'os' => PHP_OS,
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'server_name' => $_SERVER['SERVER_NAME'] ?? 'Unknown',
            'kernel' => SYSTEM_KERNEL_NAME,
            'os_name' => SYSTEM_OS_NAME,
            'hostname' => gethostname(),
            'telemetry' => TELEMETRY,
            'startup' => defined('APP_START') ? number_format((microtime(true) - APP_START) * 1000, 2) . ' ms' : 'N/A',
            'request_id' => defined('REQUEST_ID') ? REQUEST_ID : '',
        ];

        return ApiResponse::success(['settings' => $settings, 'core' => $core], 'Providing settings', 200);
    }
}
