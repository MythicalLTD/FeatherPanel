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

use App\App;
use App\Chat\Activity;
use App\Chat\TicketCategory;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'TicketCategory',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Category ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Category name'),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Category icon'),
        new OA\Property(property: 'color', type: 'string', description: 'Category color'),
        new OA\Property(property: 'support_email', type: 'string', description: 'Support email for this category'),
        new OA\Property(property: 'open_hours', type: 'string', nullable: true, description: 'Open hours'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Category description'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true, description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'TicketCategoryPagination',
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
    schema: 'TicketCategoryCreate',
    type: 'object',
    required: ['name'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Category name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Category icon'),
        new OA\Property(property: 'color', type: 'string', nullable: true, description: 'Category color', default: '#000000'),
        new OA\Property(property: 'support_email', type: 'string', nullable: true, description: 'Support email for this category', default: ''),
        new OA\Property(property: 'open_hours', type: 'string', nullable: true, description: 'Open hours'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Category description'),
    ]
)]
#[OA\Schema(
    schema: 'TicketCategoryUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Category name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Category icon'),
        new OA\Property(property: 'color', type: 'string', nullable: true, description: 'Category color'),
        new OA\Property(property: 'support_email', type: 'string', nullable: true, description: 'Support email for this category'),
        new OA\Property(property: 'open_hours', type: 'string', nullable: true, description: 'Open hours'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Category description'),
    ]
)]
class TicketCategoriesController
{
    #[OA\Get(
        path: '/api/admin/tickets/categories',
        summary: 'Get all ticket categories',
        description: 'Retrieve a paginated list of all ticket categories with optional search functionality.',
        tags: ['Admin - Ticket Categories'],
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
                description: 'Search term to filter categories',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Categories retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'categories', type: 'array', items: new OA\Items(ref: '#/components/schemas/TicketCategory')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/TicketCategoryPagination'),
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
        $categories = TicketCategory::getAll($search, $limit, $offset);
        $total = TicketCategory::getCount($search);

        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? $offset + 1 : 0;
        $to = min($offset + $limit, $total);

        return ApiResponse::success([
            'categories' => $categories,
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
                'has_results' => count($categories) > 0,
            ],
        ], 'Categories fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/tickets/categories/{id}',
        summary: 'Get ticket category by ID',
        description: 'Retrieve a specific ticket category by its ID.',
        tags: ['Admin - Ticket Categories'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Category ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Category retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'category', ref: '#/components/schemas/TicketCategory'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Category not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $category = TicketCategory::getById($id);
        if (!$category) {
            return ApiResponse::error('Category not found', 'CATEGORY_NOT_FOUND', 404);
        }

        return ApiResponse::success(['category' => $category], 'Category fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/tickets/categories',
        summary: 'Create new ticket category',
        description: 'Create a new ticket category with comprehensive validation.',
        tags: ['Admin - Ticket Categories'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TicketCategoryCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Category created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'category_id', type: 'integer', description: 'Created category ID'),
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

        $requiredFields = ['name'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        $categoryId = TicketCategory::create($data);

        if (!$categoryId) {
            return ApiResponse::error('Failed to create category', 'CREATE_FAILED', 500);
        }

        // Log activity
        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'create_ticket_category',
            'context' => 'Created ticket category: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['category_id' => $categoryId], 'Category created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/tickets/categories/{id}',
        summary: 'Update ticket category',
        description: 'Update an existing ticket category with comprehensive validation.',
        tags: ['Admin - Ticket Categories'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Category ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TicketCategoryUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Category updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Category not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $category = TicketCategory::getById($id);
        if (!$category) {
            return ApiResponse::error('Category not found', 'CATEGORY_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!$data) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::error('No data to update', 'NO_DATA', 400);
        }

        $updated = TicketCategory::update($id, $data);

        if (!$updated) {
            return ApiResponse::error('Failed to update category', 'UPDATE_FAILED', 500);
        }

        // Log activity
        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'update_ticket_category',
            'context' => 'Updated ticket category: ' . ($data['name'] ?? $category['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Category updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/tickets/categories/{id}',
        summary: 'Delete ticket category',
        description: 'Permanently delete a ticket category.',
        tags: ['Admin - Ticket Categories'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Category ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Category deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Category not found'),
            new OA\Response(response: 409, description: 'Conflict - Cannot delete (tickets exist)'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $category = TicketCategory::getById($id);
        if (!$category) {
            return ApiResponse::error('Category not found', 'CATEGORY_NOT_FOUND', 404);
        }

        // Check if category has tickets (would be handled by foreign key constraint, but we can check first)
        // This is optional - the database will enforce it

        $deleted = TicketCategory::delete($id);

        if (!$deleted) {
            return ApiResponse::error('Failed to delete category', 'DELETE_FAILED', 500);
        }

        // Log activity
        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'delete_ticket_category',
            'context' => 'Deleted ticket category: ' . $category['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Category deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/tickets/categories/upload-icon',
        summary: 'Upload icon for ticket category',
        description: 'Upload an icon image file for ticket categories. Supports JPG, PNG, GIF, and WebP formats with a maximum size of 5MB.',
        tags: ['Admin - Ticket Categories'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    type: 'object',
                    required: ['icon'],
                    properties: [
                        new OA\Property(property: 'icon', type: 'string', format: 'binary', description: 'Icon image file (JPG, PNG, GIF, WebP, max 5MB)'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Icon uploaded successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'url', type: 'string', description: 'Public URL of the uploaded icon'),
                        new OA\Property(property: 'filename', type: 'string', description: 'Filename of the uploaded icon'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No file provided, invalid file type, or file too large'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to save file'),
        ]
    )]
    public function uploadIcon(Request $request): Response
    {
        // Check if file was uploaded
        if (!$request->files->has('icon')) {
            return ApiResponse::error('No icon file provided', 'NO_FILE_PROVIDED', 400);
        }

        $file = $request->files->get('icon');

        // Validate file
        if (!$file->isValid()) {
            return ApiResponse::error('Invalid file upload', 'INVALID_FILE', 400);
        }

        // Check file size (max 5MB)
        if ($file->getSize() > 5 * 1024 * 1024) {
            return ApiResponse::error('File size too large. Maximum size is 5MB', 'FILE_TOO_LARGE', 400);
        }

        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return ApiResponse::error('Invalid file type. Allowed types: JPG, PNG, GIF, WebP', 'INVALID_FILE_TYPE', 400);
        }

        // Create attachments directory if it doesn't exist
        $attachmentsDir = APP_PUBLIC . '/attachments/';
        if (!is_dir($attachmentsDir)) {
            mkdir($attachmentsDir, 0755, true);
        }

        // Generate unique filename
        $extension = $file->guessExtension();
        $filename = uniqid() . '_ticket_cat_icon.' . $extension;
        $filePath = $attachmentsDir . $filename;

        // Move uploaded file
        try {
            $file->move($attachmentsDir, $filename);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save file: ' . $e->getMessage(), 'SAVE_FAILED', 500);
        }

        // Generate URL
        $baseUrl = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
        $url = $baseUrl . '/attachments/' . $filename;

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'upload_ticket_category_icon',
            'context' => 'Uploaded ticket category icon: ' . $filename,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'url' => $url,
            'filename' => $filename,
        ], 'Icon uploaded successfully', 201);
    }
}
