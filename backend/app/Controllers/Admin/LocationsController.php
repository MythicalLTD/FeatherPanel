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

use App\Chat\Node;
use App\Chat\Activity;
use App\Chat\Location;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\LocationsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Location',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Location ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Location name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Location description'),
        new OA\Property(property: 'ip_address', type: 'string', nullable: true, description: 'IP address associated with location'),
        new OA\Property(property: 'country', type: 'string', nullable: true, description: 'Country where location is based'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'LocationPagination',
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
    schema: 'LocationCreate',
    type: 'object',
    required: ['name'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Location name', minLength: 2, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Location description'),
        new OA\Property(property: 'ip_address', type: 'string', nullable: true, description: 'IP address associated with location'),
        new OA\Property(property: 'country', type: 'string', nullable: true, description: 'Country where location is based', maxLength: 255),
    ]
)]
#[OA\Schema(
    schema: 'LocationUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Location name', minLength: 2, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Location description'),
        new OA\Property(property: 'ip_address', type: 'string', nullable: true, description: 'IP address associated with location'),
        new OA\Property(property: 'country', type: 'string', nullable: true, description: 'Country where location is based', maxLength: 255),
    ]
)]
class LocationsController
{
    #[OA\Get(
        path: '/api/admin/locations',
        summary: 'Get all locations',
        description: 'Retrieve a paginated list of all locations with optional search functionality.',
        tags: ['Admin - Locations'],
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
                description: 'Search term to filter locations by name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Locations retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'locations', type: 'array', items: new OA\Items(ref: '#/components/schemas/Location')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/LocationPagination'),
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

        // Fetch locations with search, limit, and offset directly from the database
        $offset = ($page - 1) * $limit;
        $locations = Location::getAll($search, $limit, $offset);
        $total = Location::getCount($search);

        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'locations' => $locations,
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
                'has_results' => count($locations) > 0,
            ],
        ], 'Locations fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/locations/{id}',
        summary: 'Get location by ID',
        description: 'Retrieve a specific location by its ID.',
        tags: ['Admin - Locations'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Location ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Location retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'location', ref: '#/components/schemas/Location'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid location ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Location not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $location = Location::getById($id);
        if (!$location) {
            return ApiResponse::error('Location not found', 'LOCATION_NOT_FOUND', 404);
        }

        return ApiResponse::success(['location' => $location], 'Location fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/locations',
        summary: 'Create new location',
        description: 'Create a new location with name and optional description, IP address, and country. Validates IP address format and field lengths.',
        tags: ['Admin - Locations'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/LocationCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Location created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'location', ref: '#/components/schemas/Location'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, invalid data types, invalid IP format, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create location'),
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
        if (isset($data['description']) && !is_string($data['description'])) {
            return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['ip_address']) && !is_string($data['ip_address'])) {
            return ApiResponse::error('IP Address must be a string', 'INVALID_DATA_TYPE');
        }
        if (
            isset($data['ip_address'])
            && $data['ip_address'] !== ''
            && !filter_var($data['ip_address'], FILTER_VALIDATE_IP)
        ) {
            return ApiResponse::error('Invalid IP address format', 'INVALID_IP_FORMAT');
        }
        if (isset($data['country']) && !is_string($data['country'])) {
            return ApiResponse::error('Country must be a string', 'INVALID_DATA_TYPE');
        }
        if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
            return ApiResponse::error('Name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['country']) && strlen($data['country']) > 255) {
            return ApiResponse::error('Country must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        $id = Location::create($data);
        if (!$id) {
            return ApiResponse::error('Failed to create location', 'LOCATION_CREATE_FAILED', 400);
        }
        $location = Location::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_location',
            'context' => 'Created location: ' . $location['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                LocationsEvent::onLocationCreated(),
                [
                    'location' => $location,
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['location' => $location], 'Location created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/locations/{id}',
        summary: 'Update location',
        description: 'Update an existing location. Only provided fields will be updated. Validates IP address format and field lengths.',
        tags: ['Admin - Locations'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Location ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/LocationUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Location updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'location', ref: '#/components/schemas/Location'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, no data provided, invalid data types, invalid IP format, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Location not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update location'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $location = Location::getById($id);
        if (!$location) {
            return ApiResponse::error('Location not found', 'LOCATION_NOT_FOUND', 404);
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
        if (isset($data['description']) && !is_string($data['description'])) {
            return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['ip_address']) && !is_string($data['ip_address'])) {
            return ApiResponse::error('IP Address must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['country'])) {
            if (!is_string($data['country'])) {
                return ApiResponse::error('Country must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['country']) > 255) {
                return ApiResponse::error('Country must be less than 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        $success = Location::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update location', 'LOCATION_UPDATE_FAILED', 400);
        }
        $location = Location::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_location',
            'context' => 'Updated location: ' . $location['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                LocationsEvent::onLocationUpdated(),
                [
                    'location' => $location,
                    'updated_data' => $data,
                    'updated_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['location' => $location], 'Location updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/locations/{id}',
        summary: 'Delete location',
        description: 'Permanently delete a location record.',
        tags: ['Admin - Locations'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Location ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Location deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid location ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Location not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete location'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $location = Location::getById($id);
        if (!$location) {
            return ApiResponse::error('Location not found', 'LOCATION_NOT_FOUND', 404);
        }

        if (Node::count(['location_id' => $id]) > 0) {
            return ApiResponse::error('Cannot delete location: there are nodes assigned to this location. Please remove or reassign all nodes before deleting the location.', 'LOCATION_HAS_NODES', 400);
        }

        $success = Location::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete location', 'LOCATION_DELETE_FAILED', 400);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_location',
            'context' => 'Deleted location: ' . $location['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                LocationsEvent::onLocationDeleted(),
                [
                    'location' => $location,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Location deleted successfully', 200);
    }
}
