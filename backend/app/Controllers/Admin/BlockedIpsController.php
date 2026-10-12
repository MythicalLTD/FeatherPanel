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

namespace App\Controllers\Admin;

use App\Chat\Activity;
use App\Chat\BlockedIp;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'BlockedIpRow',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'ip', type: 'string'),
        new OA\Property(property: 'reason', type: 'string', nullable: true),
        new OA\Property(property: 'expires_at', type: 'string', nullable: true, description: 'UTC datetime; null = permanent'),
        new OA\Property(property: 'created_by_uuid', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'is_permanent', type: 'boolean'),
    ]
)]
class BlockedIpsController
{
    #[OA\Get(
        path: '/api/admin/blocked-ips',
        summary: 'List banned panel IPs',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', minimum: 1)),
            new OA\Parameter(name: 'limit', in: 'query', schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100)),
            new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'active_only', in: 'query', schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 20)));
        $search = trim((string) $request->query->get('search', ''));
        $activeOnlyParam = $request->query->get('active_only', 'false');
        $activeOnly = $activeOnlyParam === 'true' || $activeOnlyParam === '1' || $activeOnlyParam === true;

        $rows = BlockedIp::search($page, $limit, $search, $activeOnly);
        $total = BlockedIp::countSearch($search, $activeOnly);
        $now = time();

        foreach ($rows as &$row) {
            $expiresAt = $row['expires_at'] ?? null;
            $row['is_permanent'] = $expiresAt === null || $expiresAt === '';
            $row['is_active'] = BlockedIp::isActive($expiresAt, $now);
        }
        unset($row);

        return ApiResponse::success([
            'ips' => $rows,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => (int) max(1, ceil($total / $limit)),
            ],
        ], 'OK', 200);
    }

    #[OA\Put(
        path: '/api/admin/blocked-ips',
        summary: 'Ban an IP from panel registration',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['ip'],
                properties: [
                    new OA\Property(property: 'ip', type: 'string', description: 'IPv4/IPv6 or CIDR'),
                    new OA\Property(property: 'reason', type: 'string', nullable: true),
                    new OA\Property(
                        property: 'duration',
                        type: 'string',
                        nullable: true,
                        description: 'Timestring e.g. 1m, 1h, 24h, 7d, 1w, 1h30m; empty/permanent = forever'
                    ),
                    new OA\Property(
                        property: 'expires_at',
                        type: 'string',
                        nullable: true,
                        description: 'Explicit UTC/ISO expiry; overrides duration when set'
                    ),
                ]
            )
        ),
        tags: ['Admin - Users'],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Validation error'),
            new OA\Response(response: 409, description: 'Duplicate'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['ip']) || !is_string($data['ip'])) {
            return ApiResponse::error('Field ip is required', 'VALIDATION_ERROR', 400);
        }

        $normalized = BlockedIp::normalizeIpInput($data['ip']);
        if ($normalized === null) {
            return ApiResponse::error('Invalid IP address or CIDR', 'INVALID_IP', 400);
        }

        $reason = null;
        if (isset($data['reason']) && is_string($data['reason'])) {
            $reason = trim($data['reason']);
            if (strlen($reason) > 1000) {
                return ApiResponse::error('Reason must be at most 1000 characters', 'INVALID_REASON', 400);
            }
            if ($reason === '') {
                $reason = null;
            }
        }

        $duration = isset($data['duration']) && is_string($data['duration']) ? $data['duration'] : null;
        $expiresAtInput = isset($data['expires_at']) && is_string($data['expires_at']) ? $data['expires_at'] : null;
        $resolved = BlockedIp::resolveExpiresAt($duration, $expiresAtInput);
        if (isset($resolved['error'])) {
            return ApiResponse::error($resolved['error'], $resolved['code'] ?? 'VALIDATION_ERROR', 400);
        }

        $staffUuid = $request->attributes->get('user')['uuid'] ?? null;
        $id = BlockedIp::create($normalized, $reason, $resolved['expires_at'], is_string($staffUuid) ? $staffUuid : null);
        if ($id === false) {
            return ApiResponse::error('IP already banned or could not be saved', 'DUPLICATE_IP', 409);
        }

        Activity::createActivity([
            'user_uuid' => is_string($staffUuid) ? $staffUuid : null,
            'name' => 'blocked_ip_create',
            'context' => 'Banned panel IP: ' . $normalized
                . ($resolved['expires_at'] === null ? ' (permanent)' : ' until ' . $resolved['expires_at']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'id' => $id,
            'ip' => $normalized,
            'reason' => $reason,
            'expires_at' => $resolved['expires_at'],
            'is_permanent' => $resolved['expires_at'] === null,
            'is_active' => true,
        ], 'IP banned', 201);
    }

    #[OA\Delete(
        path: '/api/admin/blocked-ips/{id}',
        summary: 'Remove a panel IP ban',
        tags: ['Admin - Users'],
        responses: [
            new OA\Response(response: 200, description: 'Removed'),
            new OA\Response(response: 404, description: 'Not found'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        if ($id <= 0) {
            return ApiResponse::error('Invalid id', 'INVALID_ID', 400);
        }

        $existing = BlockedIp::getById($id);
        if ($existing === null) {
            return ApiResponse::error('IP ban not found', 'NOT_FOUND', 404);
        }

        if (!BlockedIp::deleteById($id)) {
            return ApiResponse::error('IP ban not found', 'NOT_FOUND', 404);
        }

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'blocked_ip_delete',
            'context' => 'Removed panel IP ban: ' . ($existing['ip'] ?? ('id ' . $id)),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'IP ban removed', 200);
    }
}
