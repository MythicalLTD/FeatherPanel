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

namespace App\Controllers\User\Vds;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\VmInstanceActivity;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * User-facing VM instance activity log (separate table, like ServerActivityController for servers).
 */
#[OA\Tag(name: 'User - VM Instance Activities', description: 'VM instance activity history')]
#[OA\Schema(
    schema: 'UserVmInstanceActivity',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'vm_instance_id', type: 'integer'),
        new OA\Property(property: 'vm_node_id', type: 'integer'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true),
        new OA\Property(property: 'event', type: 'string'),
        new OA\Property(property: 'metadata', type: 'object', nullable: true),
        new OA\Property(property: 'ip', type: 'string', nullable: true),
        new OA\Property(property: 'timestamp', type: 'string', format: 'date-time'),
        new OA\Property(property: 'user', type: 'object', nullable: true, properties: [
            new OA\Property(property: 'username', type: 'string'),
            new OA\Property(property: 'avatar', type: 'string', nullable: true),
            new OA\Property(property: 'role', type: 'string', nullable: true),
        ]),
    ]
)]
#[OA\Schema(
    schema: 'VmInstanceActivityPagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer'),
        new OA\Property(property: 'per_page', type: 'integer'),
        new OA\Property(property: 'total', type: 'integer'),
        new OA\Property(property: 'last_page', type: 'integer'),
        new OA\Property(property: 'from', type: 'integer'),
        new OA\Property(property: 'to', type: 'integer'),
    ]
)]
class VmUserActivityController
{
    #[OA\Get(
        path: '/api/user/vm-instances/{id}/activities',
        summary: 'Get VM instance activities',
        description: 'Retrieve paginated activity log for this VM instance (power, subuser, etc.). Uses dedicated vm_instance_activities table.',
        tags: ['User - VM Instance Activities'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 50)),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Activities retrieved',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'activities', type: 'array', items: new OA\Items(ref: '#/components/schemas/UserVmInstanceActivity')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/VmInstanceActivityPagination'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function getVmInstanceActivities(Request $request, int $id): Response
    {
        $vmInstance = $request->attributes->get('vmInstance');
        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 50)));
        $search = is_string($request->query->get('search', '')) ? trim($request->query->get('search', '')) : '';

        $result = VmInstanceActivity::getActivitiesWithPagination(
            page: $page,
            perPage: $perPage,
            search: $search,
            vmInstanceId: (int) $vmInstance['id'],
        );

        return ApiResponse::success([
            'activities' => $result['data'],
            'pagination' => $result['pagination'],
        ], 'Activities fetched', 200);
    }
}
