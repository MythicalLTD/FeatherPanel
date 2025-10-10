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
        ];

        return ApiResponse::success(['settings' => $settings, 'core' => $core], 'Providing settings', 200);
    }
}
