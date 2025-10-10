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

namespace App\Controllers\Admin;

use App\Chat\Realm;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\RealmsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Realm',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Realm ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Realm name'),
        new OA\Property(property: 'logo', type: 'string', nullable: true, description: 'Realm logo URL'),
        new OA\Property(property: 'author', type: 'string', nullable: true, description: 'Realm author'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Realm description'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'RealmPagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total_records', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'total_pages', type: 'integer', description: 'Total number of pages'),
        new OA\Property(property: 'has_next', type: 'boolean', description: 'Whether there is a next page'),
        new OA\Property(property: 'has_prev', type: 'boolean', description: 'Whether there is a previous page'),
        new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
        new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
    ]
)]
#[OA\Schema(
    schema: 'RealmCreate',
    type: 'object',
    required: ['name'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Realm name', minLength: 2, maxLength: 255),
        new OA\Property(property: 'logo', type: 'string', nullable: true, description: 'Realm logo URL', maxLength: 255),
        new OA\Property(property: 'author', type: 'string', nullable: true, description: 'Realm author', maxLength: 255),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Realm description', maxLength: 65535),
    ]
)]
#[OA\Schema(
    schema: 'RealmUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Realm name', minLength: 2, maxLength: 255),
        new OA\Property(property: 'logo', type: 'string', nullable: true, description: 'Realm logo URL', maxLength: 255),
        new OA\Property(property: 'author', type: 'string', nullable: true, description: 'Realm author', maxLength: 255),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Realm description', maxLength: 65535),
    ]
)]
class RealmsController
{
    #[OA\Get(
        path: '/api/admin/realms',
        summary: 'Get all realms',
        description: 'Retrieve a paginated list of all realms with optional search functionality.',
        tags: ['Admin - Realms'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter realms by name, author, or description',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Realms retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'realms', type: 'array', items: new OA\Items(ref: '#/components/schemas/Realm')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/RealmPagination'),
                        new OA\Property(property: 'search', type: 'object', properties: [
                            new OA\Property(property: 'query', type: 'string'),
                            new OA\Property(property: 'has_results', type: 'boolean'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $offset = ($page - 1) * $limit;
        $realms = Realm::getAll($search, $limit, $offset);
        $total = Realm::getCount($search);

        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'realms' => $realms,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($realms) > 0,
            ],
        ], 'Realms fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/realms/{id}',
        summary: 'Get realm by ID',
        description: 'Retrieve a specific realm by its ID.',
        tags: ['Admin - Realms'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Realm ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Realm retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'realm', ref: '#/components/schemas/Realm'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid realm ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Realm not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $realm = Realm::getById($id);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        return ApiResponse::success(['realm' => $realm], 'Realm fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/realms',
        summary: 'Create new realm',
        description: 'Create a new realm with name and optional logo, author, and description. Validates field lengths and data types.',
        tags: ['Admin - Realms'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RealmCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Realm created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'realm', ref: '#/components/schemas/Realm'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, invalid data types, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create realm'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        $requiredFields = ['name'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }
        if (!is_string($data['name'])) {
            return ApiResponse::error('Name must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['logo']) && !is_string($data['logo'])) {
            return ApiResponse::error('Logo must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['logo']) && strlen($data['logo']) > 255) {
            return ApiResponse::error('Logo must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['author']) && !is_string($data['author'])) {
            return ApiResponse::error('Author must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['description']) && !is_string($data['description'])) {
            return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE');
        }
        if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
            return ApiResponse::error('Name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['logo']) && strlen($data['logo']) > 255) {
            return ApiResponse::error('Logo must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['author']) && strlen($data['author']) > 255) {
            return ApiResponse::error('Author must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['description']) && strlen($data['description']) > 65535) {
            return ApiResponse::error('Description must be less than 65535 characters', 'INVALID_DATA_LENGTH');
        }
        $id = Realm::create($data);
        if (!$id) {
            return ApiResponse::error('Failed to create realm', 'REALM_CREATE_FAILED', 400);
        }
        $realm = Realm::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_realm',
            'context' => 'Created realm: ' . $realm['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                RealmsEvent::onRealmCreated(),
                [
                    'realm' => $realm,
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['realm' => $realm], 'Realm created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/realms/{id}',
        summary: 'Update realm',
        description: 'Update an existing realm. Only provided fields will be updated. Validates field lengths and data types.',
        tags: ['Admin - Realms'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Realm ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RealmUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Realm updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'realm', ref: '#/components/schemas/Realm'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, no data provided, invalid data types, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Realm not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update realm'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $realm = Realm::getById($id);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }
        if (isset($data['id'])) {
            unset($data['id']);
        }
        if (isset($data['name'])) {
            if (!is_string($data['name'])) {
                return ApiResponse::error('Name must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
                return ApiResponse::error('Name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        if (isset($data['logo']) && !is_string($data['logo'])) {
            return ApiResponse::error('Logo must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['logo']) && strlen($data['logo']) > 255) {
            return ApiResponse::error('Logo must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['author'])) {
            if (!is_string($data['author'])) {
                return ApiResponse::error('Author must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['author']) > 255) {
                return ApiResponse::error('Author must be less than 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        if (isset($data['description'])) {
            if (!is_string($data['description'])) {
                return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['description']) > 65535) {
                return ApiResponse::error('Description must be less than 65535 characters', 'INVALID_DATA_LENGTH');
            }
        }
        $success = Realm::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update realm', 'REALM_UPDATE_FAILED', 400);
        }
        $realm = Realm::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_realm',
            'context' => 'Updated realm: ' . $realm['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                RealmsEvent::onRealmUpdated(),
                [
                    'realm' => $realm,
                    'updated_data' => $data,
                    'updated_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['realm' => $realm], 'Realm updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/realms/{id}',
        summary: 'Delete realm',
        description: 'Permanently delete a realm from the database. This action cannot be undone.',
        tags: ['Admin - Realms'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Realm ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Realm deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid realm ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Realm not found'),
            new OA\Response(response: 400, description: 'Bad request - Realm has spells assigned'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete realm'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $realm = Realm::getById($id);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        // Check if the realm has any spells assigned before allowing deletion
        $spellsCount = \App\Chat\Spell::count(['realm_id' => $id]);
        if ($spellsCount > 0) {
            return ApiResponse::error(
                'Cannot delete realm: there are spells assigned to this realm. Please remove or reassign all spells before deleting the realm.',
                'REALM_HAS_SPELLS',
                400
            );
        }

        // Check if the realm has any subusers assigned before allowing deletion
        $serversCount = \App\Chat\Server::count(['realms_id' => $id]);
        if ($serversCount > 0) {
            return ApiResponse::error('Cannot delete realm: there are servers assigned to this realm. Please remove or reassign all servers before deleting the realm.', 'REALM_HAS_SERVERS', 400);
        }

        $success = Realm::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete realm', 'REALM_DELETE_FAILED', 400);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_realm',
            'context' => 'Deleted realm: ' . $realm['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                RealmsEvent::onRealmDeleted(),
                [
                    'realm' => $realm,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Realm deleted successfully', 200);
    }
}
