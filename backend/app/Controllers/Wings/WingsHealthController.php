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

namespace App\Controllers\Wings;

use App\App;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Panel health for FeatherWings game daemons — GET /api/remote/health.
 *
 * Web hosting nodes use /api/quilld-remote/health instead.
 */
class WingsHealthController
{
    /**
     * GET /api/remote/health — panel connectivity for authenticated game nodes.
     */
    public function getHealth(Request $request): Response
    {
        $node = $request->attributes->get('wings_node');
        if (!is_array($node)) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
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
                'uuid' => (string) ($node['uuid'] ?? ''),
                'name' => (string) ($node['name'] ?? ''),
                'type' => 'game',
                'maintenance_mode' => filter_var($node['maintenance_mode'] ?? false, FILTER_VALIDATE_BOOLEAN),
            ],
        ], 'Panel is healthy', 200);
    }
}
