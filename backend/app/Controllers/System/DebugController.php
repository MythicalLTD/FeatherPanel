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
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'DebugInfoResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'ip_info', type: 'object', description: 'IP detection debug information'),
        new OA\Property(property: 'headers', type: 'object', description: 'All HTTP headers'),
        new OA\Property(property: 'server_vars', type: 'object', description: 'Relevant $_SERVER variables'),
    ]
)]
class DebugController
{
    #[OA\Get(
        path: '/api/debug/ip',
        summary: 'Get IP detection debug information',
        description: 'Returns debug information about IP detection and all relevant headers. Use this to troubleshoot IP detection issues.',
        tags: ['System - Debug'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Debug information retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/DebugInfoResponse')
            ),
        ]
    )]
    public function getIPDebugInfo(Request $request): Response
    {
        // Get IP debug info
        $ipInfo = CloudFlareRealIP::getDebugInfo();

        // Get all headers
        $headers = [];
        foreach ($request->headers->all() as $name => $values) {
            $headers[$name] = is_array($values) ? implode(', ', $values) : $values;
        }

        if (defined('REQUEST_ID')) {
            $headers['REQUEST_ID'] = REQUEST_ID;
        }

        // Get relevant server variables
        $serverVars = [
            'REMOTE_ADDR' => $_SERVER['REMOTE_ADDR'] ?? '',
            'HTTP_CF_CONNECTING_IP' => $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '',
            'HTTP_X_FORWARDED_FOR' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
            'HTTP_X_REAL_IP' => $_SERVER['HTTP_X_REAL_IP'] ?? '',
            'HTTP_X_CLIENT_IP' => $_SERVER['HTTP_X_CLIENT_IP'] ?? '',
            'HTTP_CLIENT_IP' => $_SERVER['HTTP_CLIENT_IP'] ?? '',
            'HTTP_X_FORWARDED' => $_SERVER['HTTP_X_FORWARDED'] ?? '',
            'HTTP_X_FORWARDED_PROTO' => $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '',
            'HTTP_X_FORWARDED_HOST' => $_SERVER['HTTP_X_FORWARDED_HOST'] ?? '',
            'SERVER_NAME' => $_SERVER['SERVER_NAME'] ?? '',
            'SERVER_ADDR' => $_SERVER['SERVER_ADDR'] ?? '',
            'HTTPS' => $_SERVER['HTTPS'] ?? '',
            'REQUEST_ID' => defined('REQUEST_ID') ? REQUEST_ID : '',
        ];

        return ApiResponse::success([
            'ip_info' => $ipInfo,
            'headers' => $headers,
            'server_vars' => $serverVars,
        ], 'Debug information retrieved successfully', 200);
    }
}
