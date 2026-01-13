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

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Chat\KnowledgebaseArticle;
use App\Chat\KnowledgebaseCategory;
use App\CloudFlare\CloudFlareRealIP;
use App\Chat\KnowledgebaseArticleTag;
use App\Chat\KnowledgebaseArticleAttachment;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\KnowledgebaseEvent;

#[OA\Schema(
    schema: 'KnowledgebaseCategory',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Category ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Category name'),
        new OA\Property(property: 'slug', type: 'string', description: 'Category slug'),
        new OA\Property(property: 'icon', type: 'string', description: 'Category icon URL'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Category description'),
        new OA\Property(property: 'position', type: 'integer', description: 'Category position for sorting'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'KnowledgebaseArticle',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Article ID'),
        new OA\Property(property: 'category_id', type: 'integer', description: 'Category ID'),
        new OA\Property(property: 'title', type: 'string', description: 'Article title'),
        new OA\Property(property: 'slug', type: 'string', description: 'Article slug'),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Article icon/logo URL'),
        new OA\Property(property: 'content', type: 'string', description: 'Article content'),
        new OA\Property(property: 'author_id', type: 'integer', description: 'Author user ID'),
        new OA\Property(property: 'status', type: 'string', enum: ['draft', 'published', 'archived'], description: 'Article status'),
        new OA\Property(property: 'pinned', type: 'string', enum: ['false', 'true'], description: 'Whether article is pinned'),
        new OA\Property(property: 'published_at', type: 'string', format: 'date-time', nullable: true, description: 'Publication timestamp'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'KnowledgebasePagination',
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
    schema: 'KnowledgebaseCategoryCreate',
    type: 'object',
    required: ['name', 'icon'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Category name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'slug', type: 'string', description: 'Category slug', minLength: 1, maxLength: 255),
        new OA\Property(property: 'icon', type: 'string', description: 'Category icon URL', minLength: 1, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Category description'),
        new OA\Property(property: 'position', type: 'integer', nullable: true, description: 'Category position for sorting', default: 0),
    ]
)]
#[OA\Schema(
    schema: 'KnowledgebaseCategoryUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Category name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'slug', type: 'string', description: 'Category slug', minLength: 1, maxLength: 255),
        new OA\Property(property: 'icon', type: 'string', description: 'Category icon URL', minLength: 1, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Category description'),
        new OA\Property(property: 'position', type: 'integer', nullable: true, description: 'Category position for sorting'),
    ]
)]
#[OA\Schema(
    schema: 'KnowledgebaseArticleCreate',
    type: 'object',
    required: ['category_id', 'title', 'content', 'author_id'],
    properties: [
        new OA\Property(property: 'category_id', type: 'integer', description: 'Category ID'),
        new OA\Property(property: 'title', type: 'string', description: 'Article title', minLength: 1, maxLength: 255),
        new OA\Property(property: 'slug', type: 'string', description: 'Article slug', minLength: 1, maxLength: 255),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Article icon/logo URL', maxLength: 255),
        new OA\Property(property: 'content', type: 'string', description: 'Article content'),
        new OA\Property(property: 'author_id', type: 'integer', description: 'Author user ID'),
        new OA\Property(property: 'status', type: 'string', enum: ['draft', 'published', 'archived'], nullable: true, description: 'Article status', default: 'draft'),
        new OA\Property(property: 'pinned', type: 'boolean', nullable: true, description: 'Whether article is pinned', default: false),
        new OA\Property(property: 'published_at', type: 'string', format: 'date-time', nullable: true, description: 'Publication timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'KnowledgebaseArticleUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'category_id', type: 'integer', description: 'Category ID'),
        new OA\Property(property: 'title', type: 'string', description: 'Article title', minLength: 1, maxLength: 255),
        new OA\Property(property: 'slug', type: 'string', description: 'Article slug', minLength: 1, maxLength: 255),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Article icon/logo URL', maxLength: 255),
        new OA\Property(property: 'content', type: 'string', description: 'Article content'),
        new OA\Property(property: 'author_id', type: 'integer', description: 'Author user ID'),
        new OA\Property(property: 'status', type: 'string', enum: ['draft', 'published', 'archived'], description: 'Article status'),
        new OA\Property(property: 'pinned', type: 'boolean', description: 'Whether article is pinned'),
        new OA\Property(property: 'published_at', type: 'string', format: 'date-time', nullable: true, description: 'Publication timestamp'),
    ]
)]
class KnowledgebaseController
{
    // ==================== CATEGORIES ====================

    #[OA\Get(
        path: '/api/admin/knowledgebase/categories',
        summary: 'Get all knowledgebase categories',
        description: 'Retrieve a paginated list of all knowledgebase categories with optional search functionality.',
        tags: ['Admin - Knowledgebase'],
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
                        new OA\Property(property: 'categories', type: 'array', items: new OA\Items(ref: '#/components/schemas/KnowledgebaseCategory')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/KnowledgebasePagination'),
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
    public function categoriesIndex(Request $request): Response
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
        $categories = KnowledgebaseCategory::getAll($search, $limit, $offset);
        $total = KnowledgebaseCategory::getCount($search);

        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? $offset + 1 : 0;
        $to = min($offset + $limit, $total);

        $responseData = [
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
        ];

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseCategoriesRetrieved(),
                $responseData
            );
        }

        return ApiResponse::success($responseData, 'Categories fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/knowledgebase/categories/{id}',
        summary: 'Get knowledgebase category by ID',
        description: 'Retrieve a specific knowledgebase category by its ID.',
        tags: ['Admin - Knowledgebase'],
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
                        new OA\Property(property: 'category', ref: '#/components/schemas/KnowledgebaseCategory'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Category not found'),
        ]
    )]
    public function categoriesShow(Request $request, int $id): Response
    {
        $category = KnowledgebaseCategory::getById($id);
        if (!$category) {
            return ApiResponse::error('Category not found', 'CATEGORY_NOT_FOUND', 404);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseCategoryRetrieved(),
                [
                    'category' => $category,
                ]
            );
        }

        return ApiResponse::success(['category' => $category], 'Category fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/knowledgebase/categories',
        summary: 'Create new knowledgebase category',
        description: 'Create a new knowledgebase category with name, slug, and icon.',
        tags: ['Admin - Knowledgebase'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/KnowledgebaseCategoryCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Category created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'category', ref: '#/components/schemas/KnowledgebaseCategory'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function categoriesCreate(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $requiredFields = ['name', 'icon'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Auto-generate slug from name if not provided
        if (!isset($data['slug']) || trim($data['slug']) === '') {
            $data['slug'] = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $data['name']));
            $data['slug'] = trim($data['slug'], '-');
        }

        // Validate field types
        foreach (['name', 'slug', 'icon'] as $field) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }
            $data[$field] = trim($data[$field]);
        }

        // Validate lengths
        if (strlen($data['name']) > 255) {
            return ApiResponse::error('Name must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }
        if (strlen($data['slug']) > 255) {
            return ApiResponse::error('Slug must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }
        if (strlen($data['icon']) > 255) {
            return ApiResponse::error('Icon URL must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }

        // Validate position if provided
        if (isset($data['position'])) {
            if (!is_numeric($data['position'])) {
                return ApiResponse::error('Position must be a number', 'INVALID_DATA_TYPE', 400);
            }
            $data['position'] = (int) $data['position'];
        }

        // Check if slug already exists
        $existing = KnowledgebaseCategory::getBySlug($data['slug']);
        if ($existing) {
            return ApiResponse::error('Category with this slug already exists', 'DUPLICATE_SLUG', 409);
        }

        $id = KnowledgebaseCategory::create($data);
        if (!$id) {
            return ApiResponse::error('Failed to create category', 'CATEGORY_CREATE_FAILED', 500);
        }

        $category = KnowledgebaseCategory::getById($id);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_knowledgebase_category',
            'context' => 'Created knowledgebase category: ' . $category['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseCategoryCreated(),
                [
                    'category' => $category,
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['category' => $category], 'Category created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/knowledgebase/categories/{id}',
        summary: 'Update knowledgebase category',
        description: 'Update an existing knowledgebase category. Only provided fields will be updated.',
        tags: ['Admin - Knowledgebase'],
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
            content: new OA\JsonContent(ref: '#/components/schemas/KnowledgebaseCategoryUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Category updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'category', ref: '#/components/schemas/KnowledgebaseCategory'),
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
    public function categoriesUpdate(Request $request, int $id): Response
    {
        $category = KnowledgebaseCategory::getById($id);
        if (!$category) {
            return ApiResponse::error('Category not found', 'CATEGORY_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Validate field types
        foreach (['name', 'slug', 'icon', 'description'] as $field) {
            if (isset($data[$field]) && !is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }
            if (isset($data[$field])) {
                $data[$field] = trim($data[$field]);
            }
        }

        // Validate lengths
        if (isset($data['name']) && strlen($data['name']) > 255) {
            return ApiResponse::error('Name must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }
        if (isset($data['slug']) && strlen($data['slug']) > 255) {
            return ApiResponse::error('Slug must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }
        if (isset($data['icon']) && strlen($data['icon']) > 255) {
            return ApiResponse::error('Icon URL must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }

        // Check if slug already exists (if changing slug)
        if (isset($data['slug']) && $data['slug'] !== $category['slug']) {
            $existing = KnowledgebaseCategory::getBySlug($data['slug']);
            if ($existing) {
                return ApiResponse::error('Category with this slug already exists', 'DUPLICATE_SLUG', 409);
            }
        }

        $success = KnowledgebaseCategory::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update category', 'CATEGORY_UPDATE_FAILED', 500);
        }

        $category = KnowledgebaseCategory::getById($id);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_knowledgebase_category',
            'context' => 'Updated knowledgebase category: ' . $category['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseCategoryUpdated(),
                [
                    'category' => $category,
                    'updated_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['category' => $category], 'Category updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/knowledgebase/categories/{id}',
        summary: 'Delete knowledgebase category',
        description: 'Permanently delete a knowledgebase category. This will also delete all articles in this category.',
        tags: ['Admin - Knowledgebase'],
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
            new OA\Response(response: 400, description: 'Bad request - Invalid category ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Category not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function categoriesDelete(Request $request, int $id): Response
    {
        $category = KnowledgebaseCategory::getById($id);
        if (!$category) {
            return ApiResponse::error('Category not found', 'CATEGORY_NOT_FOUND', 404);
        }

        $success = KnowledgebaseCategory::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete category', 'CATEGORY_DELETE_FAILED', 500);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_knowledgebase_category',
            'context' => 'Deleted knowledgebase category: ' . $category['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseCategoryDeleted(),
                [
                    'category' => $category,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Category deleted successfully', 200);
    }

    // ==================== ARTICLES ====================

    #[OA\Get(
        path: '/api/admin/knowledgebase/articles',
        summary: 'Get all knowledgebase articles',
        description: 'Retrieve a paginated list of all knowledgebase articles with optional filters.',
        tags: ['Admin - Knowledgebase'],
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
                description: 'Search term to filter articles',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'category_id',
                in: 'query',
                description: 'Filter by category ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'status',
                in: 'query',
                description: 'Filter by status',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['draft', 'published', 'archived'])
            ),
            new OA\Parameter(
                name: 'pinned',
                in: 'query',
                description: 'Filter by pinned status',
                required: false,
                schema: new OA\Schema(type: 'boolean')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Articles retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'articles', type: 'array', items: new OA\Items(ref: '#/components/schemas/KnowledgebaseArticle')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/KnowledgebasePagination'),
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
    public function articlesIndex(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $categoryId = $request->query->get('category_id');
        $status = $request->query->get('status');
        $pinned = $request->query->get('pinned');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $categoryId = $categoryId !== null && is_numeric($categoryId) ? (int) $categoryId : null;
        $pinned = $pinned !== null ? filter_var($pinned, FILTER_VALIDATE_BOOLEAN) : null;

        $articles = KnowledgebaseArticle::searchArticles($page, $limit, $search, $categoryId, $status, $pinned);
        $total = KnowledgebaseArticle::getCount($search, $categoryId, $status, $pinned);

        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? ($page - 1) * $limit + 1 : 0;
        $to = min(($page - 1) * $limit + $limit, $total);

        $responseData = [
            'articles' => $articles,
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
                'has_results' => count($articles) > 0,
            ],
        ];

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseArticlesRetrieved(),
                $responseData
            );
        }

        return ApiResponse::success($responseData, 'Articles fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/knowledgebase/articles/{id}',
        summary: 'Get knowledgebase article by ID',
        description: 'Retrieve a specific knowledgebase article by its ID.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Article retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'article', ref: '#/components/schemas/KnowledgebaseArticle'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article not found'),
        ]
    )]
    public function articlesShow(Request $request, int $id): Response
    {
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseArticleRetrieved(),
                [
                    'article' => $article,
                ]
            );
        }

        return ApiResponse::success(['article' => $article], 'Article fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/knowledgebase/articles',
        summary: 'Create new knowledgebase article',
        description: 'Create a new knowledgebase article with title, slug, content, and optional icon.',
        tags: ['Admin - Knowledgebase'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/KnowledgebaseArticleCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Article created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'article', ref: '#/components/schemas/KnowledgebaseArticle'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function articlesCreate(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $requiredFields = ['category_id', 'title', 'content', 'author_id'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field])) {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Auto-generate slug from title if not provided
        if (!isset($data['slug']) || trim($data['slug']) === '') {
            $data['slug'] = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $data['title']));
            $data['slug'] = trim($data['slug'], '-');
        }

        // Validate field types
        foreach (['title', 'slug', 'content', 'icon'] as $field) {
            if (isset($data[$field]) && !is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }
            if (isset($data[$field])) {
                $data[$field] = trim($data[$field]);
            }
        }

        // Validate numeric fields
        foreach (['category_id', 'author_id'] as $field) {
            if (!is_numeric($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a number', 'INVALID_DATA_TYPE', 400);
            }
            $data[$field] = (int) $data[$field];
        }

        // Validate lengths
        if (strlen($data['title']) > 255) {
            return ApiResponse::error('Title must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }
        if (strlen($data['slug']) > 255) {
            return ApiResponse::error('Slug must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }
        if (isset($data['icon']) && strlen($data['icon']) > 255) {
            return ApiResponse::error('Icon URL must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }

        // Validate status
        if (isset($data['status']) && !in_array($data['status'], ['draft', 'published', 'archived'], true)) {
            return ApiResponse::error('Status must be one of: draft, published, archived', 'INVALID_STATUS', 400);
        }

        // Validate pinned
        if (isset($data['pinned'])) {
            $data['pinned'] = filter_var($data['pinned'], FILTER_VALIDATE_BOOLEAN);
        }

        // Check if slug already exists
        $existing = KnowledgebaseArticle::getBySlug($data['slug']);
        if ($existing) {
            return ApiResponse::error('Article with this slug already exists', 'DUPLICATE_SLUG', 409);
        }

        $id = KnowledgebaseArticle::create($data);
        if (!$id) {
            return ApiResponse::error('Failed to create article', 'ARTICLE_CREATE_FAILED', 500);
        }

        $article = KnowledgebaseArticle::getById($id);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_knowledgebase_article',
            'context' => 'Created knowledgebase article: ' . $article['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseArticleCreated(),
                [
                    'article' => $article,
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['article' => $article], 'Article created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/knowledgebase/articles/{id}',
        summary: 'Update knowledgebase article',
        description: 'Update an existing knowledgebase article. Only provided fields will be updated.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/KnowledgebaseArticleUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Article updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'article', ref: '#/components/schemas/KnowledgebaseArticle'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function articlesUpdate(Request $request, int $id): Response
    {
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Validate field types
        foreach (['title', 'slug', 'content', 'icon'] as $field) {
            if (isset($data[$field]) && !is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }
            if (isset($data[$field])) {
                $data[$field] = trim($data[$field]);
            }
        }

        // Validate numeric fields
        foreach (['category_id', 'author_id'] as $field) {
            if (isset($data[$field]) && !is_numeric($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a number', 'INVALID_DATA_TYPE', 400);
            }
            if (isset($data[$field])) {
                $data[$field] = (int) $data[$field];
            }
        }

        // Validate lengths
        if (isset($data['title']) && strlen($data['title']) > 255) {
            return ApiResponse::error('Title must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }
        if (isset($data['slug']) && strlen($data['slug']) > 255) {
            return ApiResponse::error('Slug must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }
        if (isset($data['icon']) && strlen($data['icon']) > 255) {
            return ApiResponse::error('Icon URL must be less than 255 characters', 'INVALID_DATA_LENGTH', 400);
        }

        // Validate status
        if (isset($data['status']) && !in_array($data['status'], ['draft', 'published', 'archived'], true)) {
            return ApiResponse::error('Status must be one of: draft, published, archived', 'INVALID_STATUS', 400);
        }

        // Validate pinned
        if (isset($data['pinned'])) {
            $data['pinned'] = filter_var($data['pinned'], FILTER_VALIDATE_BOOLEAN);
        }

        // Auto-generate slug from title if title changed and slug not provided
        if (isset($data['title']) && (!isset($data['slug']) || trim($data['slug']) === '')) {
            $data['slug'] = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $data['title']));
            $data['slug'] = trim($data['slug'], '-');
        }

        // Check if slug already exists (if changing slug)
        if (isset($data['slug']) && $data['slug'] !== $article['slug']) {
            $existing = KnowledgebaseArticle::getBySlug($data['slug']);
            if ($existing) {
                return ApiResponse::error('Article with this slug already exists', 'DUPLICATE_SLUG', 409);
            }
        }

        $success = KnowledgebaseArticle::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update article', 'ARTICLE_UPDATE_FAILED', 500);
        }

        $article = KnowledgebaseArticle::getById($id);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_knowledgebase_article',
            'context' => 'Updated knowledgebase article: ' . $article['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseArticleUpdated(),
                [
                    'article' => $article,
                    'updated_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['article' => $article], 'Article updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/knowledgebase/articles/{id}',
        summary: 'Delete knowledgebase article',
        description: 'Permanently delete a knowledgebase article. This will also delete all tags and attachments.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Article deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid article ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function articlesDelete(Request $request, int $id): Response
    {
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        $success = KnowledgebaseArticle::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete article', 'ARTICLE_DELETE_FAILED', 500);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_knowledgebase_article',
            'context' => 'Deleted knowledgebase article: ' . $article['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseArticleDeleted(),
                [
                    'article' => $article,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Article deleted successfully', 200);
    }

    // ==================== FILE UPLOADS ====================

    #[OA\Post(
        path: '/api/admin/knowledgebase/upload-icon',
        summary: 'Upload icon for category or article',
        description: 'Upload an icon image file for knowledgebase categories or articles. Supports JPG, PNG, GIF, and WebP formats with a maximum size of 5MB.',
        tags: ['Admin - Knowledgebase'],
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
        $filename = uniqid() . '_kb_icon.' . $extension;
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
            'name' => 'upload_knowledgebase_icon',
            'context' => 'Uploaded knowledgebase icon: ' . $filename,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseIconUploaded(),
                [
                    'url' => $url,
                    'filename' => $filename,
                    'uploaded_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([
            'url' => $url,
            'filename' => $filename,
        ], 'Icon uploaded successfully', 201);
    }

    #[OA\Post(
        path: '/api/admin/knowledgebase/articles/{id}/upload-attachment',
        summary: 'Upload attachment for article',
        description: 'Upload an attachment file for a knowledgebase article. Supports various file types with a maximum size of 50MB.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    type: 'object',
                    required: ['file'],
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Attachment file (max 50MB)'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Attachment uploaded successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'attachment', type: 'object', description: 'Attachment record'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No file provided, invalid file type, or file too large'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to save file'),
        ]
    )]
    public function uploadAttachment(Request $request, int $id): Response
    {
        // Verify article exists
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        // Check if file was uploaded
        if (!$request->files->has('file')) {
            return ApiResponse::error('No file provided', 'NO_FILE_PROVIDED', 400);
        }

        $file = $request->files->get('file');

        // Validate file
        if (!$file->isValid()) {
            return ApiResponse::error('Invalid file upload', 'INVALID_FILE', 400);
        }

        // Get file size BEFORE moving the file (must be done before move())
        $fileSize = $file->getSize();

        // Check file size (max 50MB)
        if ($fileSize > 50 * 1024 * 1024) {
            return ApiResponse::error('File size too large. Maximum size is 50MB', 'FILE_TOO_LARGE', 400);
        }

        // Define allowed MIME types for knowledgebase attachments
        $allowedMimeTypes = [
            // Images (for screenshots)
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'text/plain',
            'text/csv',
            // Spreadsheets
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            // Archives
            'application/zip',
            'application/x-rar-compressed',
            'application/x-tar',
            'application/gzip',
        ];

        // Define allowed file extensions (must match MIME types)
        $allowedExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
            'pdf', 'doc', 'docx', 'txt', 'csv',
            'xls', 'xlsx',
            'zip', 'rar', 'tar', 'gz',
        ];

        // Explicitly block dangerous executable extensions
        $blockedExtensions = [
            'php', 'phar', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8',
            'cgi', 'pl', 'py', 'rb', 'sh', 'bash',
            'jsp', 'jspx', 'asp', 'aspx', 'asmx',
            'exe', 'bat', 'cmd', 'com', 'scr', 'vbs', 'wsf',
            'jar', 'war', 'ear',
        ];

        // Get file extension from original filename
        $originalName = $file->getClientOriginalName();
        $pathInfo = pathinfo($originalName);
        $originalExtension = strtolower($pathInfo['extension'] ?? '');
        $originalExtension = preg_replace('/[^a-zA-Z0-9]/', '', $originalExtension);

        // Validate extension - check blocked first
        if (!empty($originalExtension) && in_array($originalExtension, $blockedExtensions, true)) {
            return ApiResponse::error(
                'File type not allowed. Executable files are not permitted.',
                'INVALID_FILE_TYPE',
                400
            );
        }

        // Validate extension against allowlist
        if (empty($originalExtension) || !in_array($originalExtension, $allowedExtensions, true)) {
            $allowedList = implode(', ', array_map('strtoupper', $allowedExtensions));

            return ApiResponse::error(
                'File type not allowed. Allowed file types: ' . $allowedList,
                'INVALID_FILE_TYPE',
                400
            );
        }

        // Get MIME type using reliable server-side detection
        $detectedMimeType = null;
        if (extension_loaded('fileinfo')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $tempPath = $file->getPathname();
            if ($tempPath && file_exists($tempPath)) {
                $detectedMimeType = finfo_file($finfo, $tempPath);
            }
        }

        // Fallback to uploaded file's MIME type if finfo failed
        if (!$detectedMimeType) {
            $detectedMimeType = $file->getMimeType();
        }

        // Validate MIME type
        if (empty($detectedMimeType) || !in_array($detectedMimeType, $allowedMimeTypes, true)) {
            return ApiResponse::error(
                'File type not allowed. Please upload a valid file type (images, documents, PDF, archives).',
                'INVALID_MIME_TYPE',
                400
            );
        }

        // Create attachments directory if it doesn't exist
        $attachmentsDir = APP_PUBLIC . '/attachments/';
        if (!is_dir($attachmentsDir)) {
            mkdir($attachmentsDir, 0755, true);
        }

        // Generate unique filename with sanitized extension
        $sanitizedBase = preg_replace('/[^a-zA-Z0-9._-]/', '_', $pathInfo['filename'] ?? 'attachment');
        $filename = uniqid() . '_kb_' . $sanitizedBase . '.' . $originalExtension;
        $filePath = $attachmentsDir . $filename;

        // Move uploaded file
        try {
            $file->move($attachmentsDir, $filename);

            // Set safe file permissions (read-only for owner and group, no execute)
            // This prevents accidental execution even if PHP execution is somehow enabled
            @chmod($filePath, 0644);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save file: ' . $e->getMessage(), 'SAVE_FAILED', 500);
        }

        // Use detected MIME type for storage
        $mimeType = $detectedMimeType ?: 'application/octet-stream';

        // Generate URL (relative path for reverse proxy)
        $url = '/attachments/' . $filename;

        // Get user_downloadable from request (default to false)
        $userDownloadable = filter_var($request->request->get('user_downloadable', false), FILTER_VALIDATE_BOOLEAN);

        // Create attachment record
        $data = [
            'article_id' => $id,
            'file_name' => $originalName,
            'file_path' => $url,
            'file_size' => $fileSize,
            'file_type' => $mimeType,
            'user_downloadable' => $userDownloadable,
        ];

        $attachmentId = KnowledgebaseArticleAttachment::create($data);
        if (!$attachmentId) {
            // Clean up uploaded file if database insert fails
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            return ApiResponse::error('Failed to create attachment record', 'ATTACHMENT_CREATE_FAILED', 500);
        }

        $attachment = KnowledgebaseArticleAttachment::getById($attachmentId);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'upload_knowledgebase_attachment',
            'context' => 'Uploaded attachment for article: ' . $article['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseAttachmentUploaded(),
                [
                    'article' => $article,
                    'attachment' => $attachment,
                    'uploaded_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([
            'attachment' => $attachment,
        ], 'Attachment uploaded successfully', 201);
    }

    #[OA\Get(
        path: '/api/admin/knowledgebase/articles/{id}/attachments',
        summary: 'Get all attachments for an article',
        description: 'Retrieve all attachments for a specific knowledgebase article.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Attachments retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'attachments', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article not found'),
        ]
    )]
    public function getAttachments(Request $request, int $id): Response
    {
        // Verify article exists
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        $attachments = KnowledgebaseArticleAttachment::getByArticleId($id);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseAttachmentsRetrieved(),
                [
                    'article' => $article,
                    'attachments' => $attachments,
                ]
            );
        }

        return ApiResponse::success([
            'attachments' => $attachments,
        ], 'Attachments fetched successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/knowledgebase/articles/{id}/attachments/{attachmentId}',
        summary: 'Delete an attachment',
        description: 'Permanently delete an attachment from a knowledgebase article.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'attachmentId',
                in: 'path',
                description: 'Attachment ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Attachment deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid attachment ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article or attachment not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function deleteAttachment(Request $request, int $id, int $attachmentId): Response
    {
        // Verify article exists
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        // Verify attachment exists and belongs to this article
        $attachment = KnowledgebaseArticleAttachment::getById($attachmentId);
        if (!$attachment || $attachment['article_id'] != $id) {
            return ApiResponse::error('Attachment not found', 'ATTACHMENT_NOT_FOUND', 404);
        }

        // Delete the file from disk
        if (isset($attachment['file_path'])) {
            $filePath = parse_url($attachment['file_path'], PHP_URL_PATH);
            if ($filePath) {
                // Remove leading slash and get relative path
                $filePath = ltrim($filePath, '/');
                $fullPath = APP_PUBLIC . '/' . $filePath;
                if (file_exists($fullPath)) {
                    @unlink($fullPath);
                }
            }
        }

        // Delete attachment record
        $success = KnowledgebaseArticleAttachment::delete($attachmentId);
        if (!$success) {
            return ApiResponse::error('Failed to delete attachment', 'ATTACHMENT_DELETE_FAILED', 500);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_knowledgebase_attachment',
            'context' => 'Deleted attachment from article: ' . $article['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseAttachmentDeleted(),
                [
                    'article' => $article,
                    'attachment' => $attachment,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Attachment deleted successfully', 200);
    }

    // ==================== TAGS ====================

    #[OA\Get(
        path: '/api/admin/knowledgebase/articles/{id}/tags',
        summary: 'Get all tags for an article',
        description: 'Retrieve all tags associated with a specific knowledgebase article.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Tags retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'tags', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article not found'),
        ]
    )]
    public function getTags(Request $request, int $id): Response
    {
        // Verify article exists
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        $tags = KnowledgebaseArticleTag::getByArticleId($id);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseTagsRetrieved(),
                [
                    'article' => $article,
                    'tags' => $tags,
                ]
            );
        }

        return ApiResponse::success([
            'tags' => $tags,
        ], 'Tags fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/knowledgebase/articles/{id}/tags',
        summary: 'Add a tag to an article',
        description: 'Add a new tag to a knowledgebase article.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['tag_name'],
                properties: [
                    new OA\Property(property: 'tag_name', type: 'string', description: 'Tag name', example: 'tutorial'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Tag added successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'tag', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article not found'),
            new OA\Response(response: 409, description: 'Tag already exists for this article'),
        ]
    )]
    public function createTag(Request $request, int $id): Response
    {
        // Verify article exists
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (empty($data) || !isset($data['tag_name']) || trim($data['tag_name']) === '') {
            return ApiResponse::error('Tag name is required', 'TAG_NAME_REQUIRED', 400);
        }

        $tagData = [
            'article_id' => $id,
            'tag_name' => trim($data['tag_name']),
        ];

        $tagId = KnowledgebaseArticleTag::create($tagData);
        if (!$tagId) {
            // Check if it's a duplicate
            $existing = KnowledgebaseArticleTag::getByArticleId($id);
            foreach ($existing as $tag) {
                if ($tag['tag_name'] === $tagData['tag_name']) {
                    return ApiResponse::error('Tag already exists for this article', 'TAG_EXISTS', 409);
                }
            }

            return ApiResponse::error('Failed to create tag', 'TAG_CREATE_FAILED', 500);
        }

        $tag = KnowledgebaseArticleTag::getById($tagId);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'add_knowledgebase_tag',
            'context' => 'Added tag "' . $tagData['tag_name'] . '" to article: ' . $article['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseTagCreated(),
                [
                    'article' => $article,
                    'tag' => $tag,
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([
            'tag' => $tag,
        ], 'Tag added successfully', 201);
    }

    #[OA\Delete(
        path: '/api/admin/knowledgebase/articles/{id}/tags/{tagId}',
        summary: 'Delete a tag from an article',
        description: 'Remove a tag from a knowledgebase article.',
        tags: ['Admin - Knowledgebase'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Article ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'tagId',
                in: 'path',
                description: 'Tag ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Tag deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid tag ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Article or tag not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function deleteTag(Request $request, int $id, int $tagId): Response
    {
        // Verify article exists
        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        // Verify tag exists and belongs to this article
        $tag = KnowledgebaseArticleTag::getById($tagId);
        if (!$tag || $tag['article_id'] != $id) {
            return ApiResponse::error('Tag not found', 'TAG_NOT_FOUND', 404);
        }

        // Delete tag
        $success = KnowledgebaseArticleTag::delete($tagId);
        if (!$success) {
            return ApiResponse::error('Failed to delete tag', 'TAG_DELETE_FAILED', 500);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_knowledgebase_tag',
            'context' => 'Deleted tag "' . $tag['tag_name'] . '" from article: ' . $article['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onKnowledgebaseTagDeleted(),
                [
                    'article' => $article,
                    'tag' => $tag,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Tag deleted successfully', 200);
    }
}
