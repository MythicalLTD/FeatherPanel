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

use App\Chat\VmInstanceActivity;
use App\Chat\VmSubuser;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * User-facing VM instance subuser management (list, add, remove). Same idea as Server SubuserController.
 */
#[OA\Tag(name: 'User - VM Instance Subusers', description: 'VM instance subuser management')]
class VmUserSubuserController
{
    #[OA\Get(
        path: '/api/user/vm-instances/{id}/subusers',
        summary: 'List subusers',
        description: 'List subusers for this VM instance. Only the VM owner can manage subusers.',
        tags: ['User - VM Instance Subusers'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Subusers listed', content: new OA\JsonContent(properties: [new OA\Property(property: 'subusers', type: 'array', items: new OA\Items(type: 'object'))])),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Only the VM owner can manage subusers'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function listSubusers(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!isset($vmInstance['user_uuid']) || $vmInstance['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('Only the VM owner can manage subusers', 'PERMISSION_DENIED', 403);
        }

        $subusers = VmSubuser::getSubusersByVmInstance($id);

        return ApiResponse::success(['subusers' => $subusers], 'Subusers listed', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/subusers',
        summary: 'Add subuser',
        description: 'Add a subuser to this VM instance with given permissions. Only the VM owner can add subusers.',
        tags: ['User - VM Instance Subusers'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'permissions'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', description: 'Target user email'),
                    new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'e.g. power, console'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Subuser added', content: new OA\JsonContent(properties: [new OA\Property(property: 'subuser', type: 'object')])),
            new OA\Response(response: 400, description: 'email and permissions required'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Only the VM owner can add subusers'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Create failed'),
        ]
    )]
    public function createSubuser(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!isset($vmInstance['user_uuid']) || $vmInstance['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('Only the VM owner can add subusers', 'PERMISSION_DENIED', 403);
        }

        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? '';
        $permissions = $data['permissions'] ?? [];

        if (empty($email) || empty($permissions)) {
            return ApiResponse::error('email and permissions are required', 'VALIDATION_FAILED', 400);
        }

        $targetUser = \App\Chat\User::getUserByEmail($email);
        if (!$targetUser) {
            return ApiResponse::error('User with this email not found', 'USER_NOT_FOUND', 404);
        }
        
        $targetUserId = (int) $targetUser['id'];
        if ($targetUserId === (int) $user['id']) {
            return ApiResponse::error('You cannot add yourself as a subuser', 'VALIDATION_FAILED', 400);
        }

        $subuser = VmSubuser::create([
            'user_id' => $targetUserId,
            'vm_instance_id' => $id,
            'permissions' => $permissions,
        ]);

        if (!$subuser) {
            return ApiResponse::error('Failed to create subuser', 'CREATE_FAILED', 500);
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) $vmInstance['vm_node_id'],
            'user_id' => (int) $user['id'],
            'event' => 'vm:subuser.create',
            'metadata' => ['target_user_id' => $targetUserId, 'permissions' => $permissions],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['subuser' => $subuser], 'Subuser added', 201);
    }

    #[OA\Delete(
        path: '/api/user/vm-instances/{id}/subusers/{subuserId}',
        summary: 'Remove subuser',
        description: 'Remove a subuser from this VM instance. Only the VM owner can remove subusers.',
        tags: ['User - VM Instance Subusers'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'subuserId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Subuser removed'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Only the VM owner can remove subusers'),
            new OA\Response(response: 404, description: 'VM instance or subuser not found'),
        ]
    )]
    public function deleteSubuser(Request $request, int $id, int $subuserId): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!isset($vmInstance['user_uuid']) || $vmInstance['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('Only the VM owner can remove subusers', 'PERMISSION_DENIED', 403);
        }

        $deleted = VmSubuser::delete($subuserId);
        if (!$deleted) {
            return ApiResponse::error('Subuser not found', 'NOT_FOUND', 404);
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) $vmInstance['vm_node_id'],
            'user_id' => (int) $user['id'],
            'event' => 'vm:subuser.delete',
            'metadata' => ['subuser_id' => $subuserId],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Subuser removed', 200);
    }
}
