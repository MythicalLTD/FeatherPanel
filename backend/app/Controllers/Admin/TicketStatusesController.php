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

use App\Chat\Activity;
use App\Chat\TicketStatus;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'TicketStatus',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Status ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Status name'),
        new OA\Property(property: 'color', type: 'string', description: 'Status color'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true, description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'TicketStatusPagination',
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
    schema: 'TicketStatusCreate',
    type: 'object',
    required: ['name'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Status name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'color', type: 'string', nullable: true, description: 'Status color', default: '#000000'),
    ]
)]
#[OA\Schema(
    schema: 'TicketStatusUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Status name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'color', type: 'string', nullable: true, description: 'Status color'),
    ]
)]
class TicketStatusesController
{
    #[OA\Get(
        path: '/api/admin/tickets/statuses',
        summary: 'Get all ticket statuses',
        description: 'Retrieve a paginated list of all ticket statuses with optional search functionality.',
        tags: ['Admin - Ticket Statuses'],
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
                description: 'Search term to filter statuses',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Statuses retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'statuses', type: 'array', items: new OA\Items(ref: '#/components/schemas/TicketStatus')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/TicketStatusPagination'),
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
        $statuses = TicketStatus::getAll($search, $limit, $offset);
        $total = TicketStatus::getCount($search);

        $totalPages = (int) ceil($total / $limit);
        $from = $total > 0 ? $offset + 1 : 0;
        $to = min($offset + $limit, $total);

        return ApiResponse::success([
            'statuses' => $statuses,
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
                'has_results' => count($statuses) > 0,
            ],
        ], 'Statuses fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/tickets/statuses/{id}',
        summary: 'Get ticket status by ID',
        description: 'Retrieve a specific ticket status by its ID.',
        tags: ['Admin - Ticket Statuses'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Status ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Status retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', ref: '#/components/schemas/TicketStatus'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Status not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $status = TicketStatus::getById($id);
        if (!$status) {
            return ApiResponse::error('Status not found', 'STATUS_NOT_FOUND', 404);
        }

        return ApiResponse::success(['status' => $status], 'Status fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/tickets/statuses',
        summary: 'Create new ticket status',
        description: 'Create a new ticket status.',
        tags: ['Admin - Ticket Statuses'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TicketStatusCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Status created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status_id', type: 'integer', description: 'Created status ID'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (!$data) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        if (!isset($data['name']) || trim($data['name']) === '') {
            return ApiResponse::error('Missing required field: name', 'MISSING_REQUIRED_FIELDS', 400);
        }

        $statusId = TicketStatus::create($data);

        if (!$statusId) {
            return ApiResponse::error('Failed to create status', 'CREATE_FAILED', 500);
        }

        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'] ?? null,
            'name' => 'create_ticket_status',
            'context' => 'Created ticket status: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['status_id' => $statusId], 'Status created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/tickets/statuses/{id}',
        summary: 'Update ticket status',
        description: 'Update an existing ticket status.',
        tags: ['Admin - Ticket Statuses'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Status ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TicketStatusUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Status updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Status not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $status = TicketStatus::getById($id);
        if (!$status) {
            return ApiResponse::error('Status not found', 'STATUS_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!$data) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::error('No data to update', 'NO_DATA', 400);
        }

        $updated = TicketStatus::update($id, $data);

        if (!$updated) {
            return ApiResponse::error('Failed to update status', 'UPDATE_FAILED', 500);
        }

        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'] ?? null,
            'name' => 'update_ticket_status',
            'context' => 'Updated ticket status: ' . ($data['name'] ?? $status['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Status updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/tickets/statuses/{id}',
        summary: 'Delete ticket status',
        description: 'Permanently delete a ticket status.',
        tags: ['Admin - Ticket Statuses'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Status ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Status deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Status not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $status = TicketStatus::getById($id);
        if (!$status) {
            return ApiResponse::error('Status not found', 'STATUS_NOT_FOUND', 404);
        }

        $deleted = TicketStatus::delete($id);

        if (!$deleted) {
            return ApiResponse::error('Failed to delete status', 'DELETE_FAILED', 500);
        }

        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'] ?? null,
            'name' => 'delete_ticket_status',
            'context' => 'Deleted ticket status: ' . $status['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Status deleted successfully', 200);
    }
}
