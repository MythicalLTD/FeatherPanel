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

use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
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
        ];
        
        return ApiResponse::success([
            'ip_info' => $ipInfo,
            'headers' => $headers,
            'server_vars' => $serverVars,
        ], 'Debug information retrieved successfully', 200);
    }
}
