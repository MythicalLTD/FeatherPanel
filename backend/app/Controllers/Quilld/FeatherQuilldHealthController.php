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

namespace App\Controllers\Quilld;

use App\App;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Panel health for FeatherQuilld daemons — GET /api/quilld-remote/health.
 */
class FeatherQuilldHealthController
{
    public function getHealth(Request $request): Response
    {
        $webNode = $request->attributes->get('quilld_node');
        if (!is_array($webNode)) {
            return ApiResponse::error('Invalid FeatherQuilld authentication', 'INVALID_QUILLD_AUTH', 403);
        }

        try {
            $appName = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
            $appName = is_string($appName) && trim($appName) !== '' ? trim($appName) : 'FeatherPanel';
        } catch (\Throwable) {
            $appName = 'FeatherPanel';
        }

        return ApiResponse::success([
            'status' => 'healthy',
            'panel' => [
                'app_name' => $appName,
                'time' => gmdate('c'),
            ],
            'node' => [
                'uuid' => (string) ($webNode['uuid'] ?? ''),
                'name' => (string) ($webNode['name'] ?? ''),
                'type' => 'web',
                'maintenance_mode' => filter_var($webNode['maintenance_mode'] ?? false, FILTER_VALIDATE_BOOLEAN),
            ],
        ], 'Panel is healthy', 200);
    }
}
