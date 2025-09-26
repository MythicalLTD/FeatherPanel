<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\Chat\Activity;
use App\Chat\RedirectLink;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'RedirectLink',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Redirect link ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Redirect link name'),
        new OA\Property(property: 'slug', type: 'string', description: 'Redirect link slug'),
        new OA\Property(property: 'url', type: 'string', description: 'Redirect link URL'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'RedirectLinkPagination',
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
    schema: 'RedirectLinkCreate',
    type: 'object',
    required: ['name', 'url'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Redirect link name', minLength: 1, maxLength: 191),
        new OA\Property(property: 'slug', type: 'string', nullable: true, description: 'Redirect link slug (auto-generated if not provided)', minLength: 1, maxLength: 191),
        new OA\Property(property: 'url', type: 'string', description: 'Redirect link URL', minLength: 1, maxLength: 191, format: 'uri'),
    ]
)]
#[OA\Schema(
    schema: 'RedirectLinkUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Redirect link name', minLength: 1, maxLength: 191),
        new OA\Property(property: 'slug', type: 'string', nullable: true, description: 'Redirect link slug', minLength: 1, maxLength: 191),
        new OA\Property(property: 'url', type: 'string', description: 'Redirect link URL', minLength: 1, maxLength: 191, format: 'uri'),
    ]
)]
class RedirectLinksController
{
    #[OA\Get(
        path: '/api/admin/redirect-links',
        summary: 'Get all redirect links',
        description: 'Retrieve a paginated list of all redirect links with optional search functionality.',
        tags: ['Admin - Redirect Links'],
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
                description: 'Search term to filter redirect links by name, slug, or URL',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Redirect links retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'redirect_links', type: 'array', items: new OA\Items(ref: '#/components/schemas/RedirectLink')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/RedirectLinkPagination'),
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

        if ($search) {
            $redirectLinks = RedirectLink::searchRedirectLinks($search, $page, $limit);
            $totalRecords = RedirectLink::getSearchCount($search);
        } else {
            $redirectLinks = RedirectLink::getAll($page, $limit);
            $totalRecords = RedirectLink::getCount();
        }

        $totalPages = ceil($totalRecords / $limit);
        $hasNext = $page < $totalPages;
        $hasPrev = $page > 1;
        $from = $totalRecords > 0 ? (($page - 1) * $limit) + 1 : 0;
        $to = min($page * $limit, $totalRecords);

        return ApiResponse::success([
            'redirect_links' => $redirectLinks,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => $totalPages,
                'has_next' => $hasNext,
                'has_prev' => $hasPrev,
                'from' => $from,
                'to' => $to,
            ],
        ], 'Redirect links fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/redirect-links/{id}',
        summary: 'Get redirect link by ID',
        description: 'Retrieve a specific redirect link by its ID.',
        tags: ['Admin - Redirect Links'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Redirect link ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Redirect link retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'redirect_link', ref: '#/components/schemas/RedirectLink'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid redirect link ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Redirect link not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $redirectLink = RedirectLink::getById($id);
        if (!$redirectLink) {
            return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
        }

        return ApiResponse::success(['redirect_link' => $redirectLink], 'Redirect link fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/redirect-links',
        summary: 'Create new redirect link',
        description: 'Create a new redirect link with name and URL. Slug is auto-generated if not provided. Validates URL format, slug format, and uniqueness constraints.',
        tags: ['Admin - Redirect Links'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RedirectLinkCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Redirect link created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'redirect_link_id', type: 'integer', description: 'ID of the created redirect link'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No data provided, missing required fields, invalid data types, invalid URL format, invalid slug format, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 409, description: 'Conflict - Redirect link name, slug, or URL already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create redirect link'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Required fields validation
        $requiredFields = ['name', 'url'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Generate slug if not provided
        if (!isset($data['slug']) || empty($data['slug'])) {
            $data['slug'] = RedirectLink::generateSlug($data['name']);
        }

        // Validate data types and length
        $validationRules = [
            'name' => ['string', 1, 191],
            'slug' => ['string', 1, 191],
            'url' => ['string', 1, 191],
        ];

        foreach ($validationRules as $field => [$type, $minLength, $maxLength]) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }

            $length = strlen($data[$field]);
            if ($length < $minLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
            if ($length > $maxLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
        }

        // Validate URL format
        if (!filter_var($data['url'], FILTER_VALIDATE_URL)) {
            return ApiResponse::error('Invalid URL format', 'INVALID_URL_FORMAT', 400);
        }

        // Validate slug format (only lowercase letters, numbers, and hyphens)
        if (!preg_match('/^[a-z0-9-]+$/', $data['slug'])) {
            return ApiResponse::error('Slug can only contain lowercase letters, numbers, and hyphens', 'INVALID_SLUG_FORMAT', 400);
        }

        // Check if redirect link name already exists
        $existingRedirectLink = RedirectLink::getByName($data['name']);
        if ($existingRedirectLink) {
            return ApiResponse::error('Redirect link name already exists', 'REDIRECT_LINK_NAME_EXISTS', 409);
        }

        // Check if redirect link slug already exists
        $existingRedirectLinkBySlug = RedirectLink::getBySlug($data['slug']);
        if ($existingRedirectLinkBySlug) {
            return ApiResponse::error('Redirect link slug already exists', 'REDIRECT_LINK_SLUG_EXISTS', 409);
        }

        // Check if redirect link URL already exists
        $existingRedirectLinkByUrl = RedirectLink::getByUrl($data['url']);
        if ($existingRedirectLinkByUrl) {
            return ApiResponse::error('Redirect link URL already exists', 'REDIRECT_LINK_URL_EXISTS', 409);
        }

        // Set timestamps
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $redirectLinkId = RedirectLink::create($data);
        if (!$redirectLinkId) {
            return ApiResponse::error('Failed to create redirect link', 'FAILED_TO_CREATE_REDIRECT_LINK', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'create_redirect_link',
            'context' => 'Created redirect link: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['redirect_link_id' => $redirectLinkId], 'Redirect link created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/redirect-links/{id}',
        summary: 'Update redirect link',
        description: 'Update an existing redirect link. Only provided fields will be updated. Validates URL format, slug format, and uniqueness constraints.',
        tags: ['Admin - Redirect Links'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Redirect link ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RedirectLinkUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Redirect link updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No data provided, invalid data types, invalid URL format, invalid slug format, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Redirect link not found'),
            new OA\Response(response: 409, description: 'Conflict - Redirect link name, slug, or URL already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update redirect link'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $redirectLink = RedirectLink::getById($id);
        if (!$redirectLink) {
            return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Generate slug if not provided and name is being updated
        if (isset($data['name']) && (!isset($data['slug']) || empty($data['slug']))) {
            $data['slug'] = RedirectLink::generateSlug($data['name']);
        }

        // Validate data types and length
        $validationRules = [
            'name' => ['string', 1, 191],
            'slug' => ['string', 1, 191],
            'url' => ['string', 1, 191],
        ];

        foreach ($validationRules as $field => [$type, $minLength, $maxLength]) {
            if (isset($data[$field])) {
                if (!is_string($data[$field])) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
                }

                $length = strlen($data[$field]);
                if ($length < $minLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
                if ($length > $maxLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
            }
        }

        // Validate URL format if provided
        if (isset($data['url']) && !filter_var($data['url'], FILTER_VALIDATE_URL)) {
            return ApiResponse::error('Invalid URL format', 'INVALID_URL_FORMAT', 400);
        }

        // Validate slug format if provided
        if (isset($data['slug']) && !preg_match('/^[a-z0-9-]+$/', $data['slug'])) {
            return ApiResponse::error('Slug can only contain lowercase letters, numbers, and hyphens', 'INVALID_SLUG_FORMAT', 400);
        }

        // Check if redirect link name already exists (excluding current record)
        if (isset($data['name'])) {
            $existingRedirectLink = RedirectLink::getByName($data['name']);
            if ($existingRedirectLink && $existingRedirectLink['id'] != $id) {
                return ApiResponse::error('Redirect link name already exists', 'REDIRECT_LINK_NAME_EXISTS', 409);
            }
        }

        // Check if redirect link slug already exists (excluding current record)
        if (isset($data['slug'])) {
            $existingRedirectLinkBySlug = RedirectLink::getBySlug($data['slug']);
            if ($existingRedirectLinkBySlug && $existingRedirectLinkBySlug['id'] != $id) {
                return ApiResponse::error('Redirect link slug already exists', 'REDIRECT_LINK_SLUG_EXISTS', 409);
            }
        }

        // Check if redirect link URL already exists (excluding current record)
        if (isset($data['url'])) {
            $existingRedirectLinkByUrl = RedirectLink::getByUrl($data['url']);
            if ($existingRedirectLinkByUrl && $existingRedirectLinkByUrl['id'] != $id) {
                return ApiResponse::error('Redirect link URL already exists', 'REDIRECT_LINK_URL_EXISTS', 409);
            }
        }

        // Set updated timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');

        $success = RedirectLink::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update redirect link', 'FAILED_TO_UPDATE_REDIRECT_LINK', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'update_redirect_link',
            'context' => 'Updated redirect link: ' . ($data['name'] ?? $redirectLink['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Redirect link updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/redirect-links/{id}',
        summary: 'Delete redirect link',
        description: 'Permanently delete a redirect link from the database. This action cannot be undone.',
        tags: ['Admin - Redirect Links'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Redirect link ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Redirect link deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid redirect link ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Redirect link not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete redirect link'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $redirectLink = RedirectLink::getById($id);
        if (!$redirectLink) {
            return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
        }

        $success = RedirectLink::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete redirect link', 'FAILED_TO_DELETE_REDIRECT_LINK', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'delete_redirect_link',
            'context' => 'Deleted redirect link: ' . $redirectLink['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Redirect link deleted successfully', 200);
    }
}
