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

use App\Chat\User;
use App\Chat\Activity;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\MailTemplate;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\MailTemplatesEvent;

#[OA\Schema(
    schema: 'MailTemplate',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Mail template ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Template name'),
        new OA\Property(property: 'subject', type: 'string', description: 'Email subject'),
        new OA\Property(property: 'body', type: 'string', description: 'Email body content'),
        new OA\Property(property: 'deleted', type: 'string', description: 'Soft delete status', enum: ['true', 'false']),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'MailTemplatePagination',
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
    schema: 'MailTemplateCreate',
    type: 'object',
    required: ['name', 'subject', 'body'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Template name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'subject', type: 'string', description: 'Email subject', minLength: 1, maxLength: 255),
        new OA\Property(property: 'body', type: 'string', description: 'Email body content', minLength: 1, maxLength: 65535),
    ]
)]
#[OA\Schema(
    schema: 'MailTemplateUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Template name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'subject', type: 'string', description: 'Email subject', minLength: 1, maxLength: 255),
        new OA\Property(property: 'body', type: 'string', description: 'Email body content', minLength: 1, maxLength: 65535),
    ]
)]
#[OA\Schema(
    schema: 'MassEmail',
    type: 'object',
    required: ['subject', 'body'],
    properties: [
        new OA\Property(property: 'subject', type: 'string', description: 'Email subject', minLength: 1, maxLength: 255),
        new OA\Property(property: 'body', type: 'string', description: 'Email body content', minLength: 1, maxLength: 65535),
    ]
)]
#[OA\Schema(
    schema: 'MassEmailResult',
    type: 'object',
    properties: [
        new OA\Property(property: 'queued_count', type: 'integer', description: 'Number of emails successfully queued'),
        new OA\Property(property: 'failed_count', type: 'integer', description: 'Number of emails that failed to queue'),
        new OA\Property(property: 'total_users', type: 'integer', description: 'Total number of valid users found'),
    ]
)]
class MailTemplatesController
{
    #[OA\Get(
        path: '/api/admin/mail-templates',
        summary: 'Get all mail templates',
        description: 'Retrieve a paginated list of all mail templates with optional search functionality and soft-deleted template inclusion.',
        tags: ['Admin - Mail Templates'],
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
                description: 'Search term to filter templates by name or subject',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'include_deleted',
                in: 'query',
                description: 'Include soft-deleted templates in results',
                required: false,
                schema: new OA\Schema(type: 'boolean', default: false)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mail templates retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'templates', type: 'array', items: new OA\Items(ref: '#/components/schemas/MailTemplate')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/MailTemplatePagination'),
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
        $includeDeleted = $request->query->get('include_deleted', 'false') === 'true';

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $templates = MailTemplate::getAll($includeDeleted);

        // Apply search filter
        if (!empty($search)) {
            $templates = array_filter($templates, function ($template) use ($search) {
                return stripos($template['name'], $search) !== false
                    || stripos($template['subject'], $search) !== false;
            });
        }

        // Apply pagination
        $total = count($templates);
        $totalPages = ceil($total / $limit);
        $offset = ($page - 1) * $limit;
        $templates = array_slice($templates, $offset, $limit);

        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'templates' => $templates,
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
                'has_results' => count($templates) > 0,
            ],
        ], 'Mail templates fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/mail-templates/{id}',
        summary: 'Get mail template by ID',
        description: 'Retrieve a specific mail template by its ID.',
        tags: ['Admin - Mail Templates'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Mail template ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mail template retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'template', ref: '#/components/schemas/MailTemplate'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid template ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Mail template not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['template' => $template], 'Mail template fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/mail-templates',
        summary: 'Create new mail template',
        description: 'Create a new mail template with name, subject, and body. Validates field lengths and ensures template name uniqueness.',
        tags: ['Admin - Mail Templates'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/MailTemplateCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Mail template created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'template_id', type: 'integer', description: 'ID of the created template'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid data types, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 409, description: 'Conflict - Template name already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create template'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Required fields validation
        $requiredFields = ['name', 'subject', 'body'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Validate data types and length
        $validationRules = [
            'name' => ['string', 1, 255],
            'subject' => ['string', 1, 255],
            'body' => ['string', 1, 65535],
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

        // Check if template name already exists
        $existingTemplate = MailTemplate::getByName($data['name']);
        if ($existingTemplate) {
            return ApiResponse::error('Template name already exists', 'TEMPLATE_NAME_EXISTS', 409);
        }

        // Set default values
        $data['deleted'] = 'false';
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $templateId = MailTemplate::create($data);
        if (!$templateId) {
            return ApiResponse::error('Failed to create mail template', 'FAILED_TO_CREATE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'create_mail_template',
            'context' => 'Created mail template: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                MailTemplatesEvent::onMailTemplateCreated(),
                [
                    'template_id' => $templateId,
                    'template_data' => $data,
                    'created_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success(['template_id' => $templateId], 'Mail template created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/mail-templates/{id}',
        summary: 'Update mail template',
        description: 'Update an existing mail template. Only provided fields will be updated. Validates field lengths and ensures template name uniqueness.',
        tags: ['Admin - Mail Templates'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Mail template ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/MailTemplateUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mail template updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No data provided, invalid data types, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Mail template not found'),
            new OA\Response(response: 409, description: 'Conflict - Template name already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update template'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at']);

        // Validate data types and length for provided fields
        $validationRules = [
            'name' => ['string', 1, 255],
            'subject' => ['string', 1, 255],
            'body' => ['string', 1, 65535],
        ];

        foreach ($data as $field => $value) {
            if (isset($validationRules[$field])) {
                [$type, $minLength, $maxLength] = $validationRules[$field];

                if (!is_string($value)) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
                }

                $length = strlen($value);
                if ($length < $minLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
                if ($length > $maxLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
            }
        }

        // Check if template name already exists (excluding current template)
        if (isset($data['name'])) {
            $existingTemplate = MailTemplate::getByName($data['name']);
            if ($existingTemplate && $existingTemplate['id'] != $id) {
                return ApiResponse::error('Template name already exists', 'TEMPLATE_NAME_EXISTS', 409);
            }
        }

        // Add updated timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');

        $updated = MailTemplate::update($id, $data);
        if (!$updated) {
            return ApiResponse::error('Failed to update mail template', 'FAILED_TO_UPDATE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'update_mail_template',
            'context' => 'Updated mail template: ' . ($data['name'] ?? $template['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                MailTemplatesEvent::onMailTemplateUpdated(),
                [
                    'template' => $template,
                    'updated_data' => $data,
                    'updated_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([], 'Mail template updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/mail-templates/{id}',
        summary: 'Soft delete mail template',
        description: 'Soft delete a mail template (marks as deleted but preserves data). System templates (ID 1-10) cannot be deleted.',
        tags: ['Admin - Mail Templates'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Mail template ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mail template deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid template ID or system template deletion attempted'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Mail template not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete template'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        if ($id >= 1 && $id <= 10) {
            return ApiResponse::error('Cannot delete system mail templates', 'SYSTEM_TEMPLATE_DELETE_FAILED', 400);
        }

        $deleted = MailTemplate::softDelete($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete mail template', 'FAILED_TO_DELETE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'delete_mail_template',
            'context' => 'Deleted mail template: ' . $template['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                MailTemplatesEvent::onMailTemplateDeleted(),
                [
                    'template' => $template,
                    'deleted_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([], 'Mail template deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/mail-templates/{id}/restore',
        summary: 'Restore soft deleted mail template',
        description: 'Restore a soft-deleted mail template by marking it as active again.',
        tags: ['Admin - Mail Templates'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Mail template ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mail template restored successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid template ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Mail template not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to restore template'),
        ]
    )]
    public function restore(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        $restored = MailTemplate::restore($id);
        if (!$restored) {
            return ApiResponse::error('Failed to restore mail template', 'FAILED_TO_RESTORE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'restore_mail_template',
            'context' => 'Restored mail template: ' . $template['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Mail template restored successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/mail-templates/{id}/hard-delete',
        summary: 'Permanently delete mail template',
        description: 'Permanently delete a mail template from the database. This action cannot be undone.',
        tags: ['Admin - Mail Templates'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Mail template ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mail template permanently deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid template ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Mail template not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to permanently delete template'),
        ]
    )]
    public function hardDelete(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        $deleted = MailTemplate::hardDelete($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to permanently delete mail template', 'FAILED_TO_DELETE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'hard_delete_mail_template',
            'context' => 'Permanently deleted mail template: ' . $template['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Mail template permanently deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/mail-templates/mass-email',
        summary: 'Send mass email to all users',
        description: 'Send a mass email to all active users with valid email addresses. Emails are queued for delivery and processed by the mail sender cron job.',
        tags: ['Admin - Mail Templates'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/MassEmail')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mass email queued successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/MassEmailResult')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid data types, validation errors, or no valid users found'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to queue mass email'),
        ]
    )]
    public function sendMassEmail(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Required fields validation
        $requiredFields = ['subject', 'body'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Validate data types and length
        $validationRules = [
            'subject' => ['string', 1, 255],
            'body' => ['string', 1, 65535],
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

        // Get all active users with valid emails
        $users = User::getAllUsers(false);
        $validUsers = array_filter($users, function ($user) {
            return !empty($user['email']) && filter_var($user['email'], FILTER_VALIDATE_EMAIL);
        });

        if (empty($validUsers)) {
            return ApiResponse::error('No valid users found to send emails to', 'NO_VALID_USERS', 400);
        }

        $queuedCount = 0;
        $failedCount = 0;

        // Queue emails for each valid user
        foreach ($validUsers as $user) {
            // Create mail queue entry
            $queueData = [
                'user_uuid' => $user['uuid'],
                'subject' => $data['subject'],
                'body' => $data['body'],
                'status' => 'pending',
                'locked' => 'false',
                'created_at' => date('Y-m-d H:i:s'),
                'deleted' => 'false',
            ];

            $queueId = MailQueue::create($queueData);

            if ($queueId) {
                // Create mail list entry
                $listData = [
                    'queue_id' => $queueId,
                    'user_uuid' => $user['uuid'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'deleted' => 'false',
                ];

                if (MailList::create($listData)) {
                    ++$queuedCount;
                } else {
                    ++$failedCount;
                }
            } else {
                ++$failedCount;
            }
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'send_mass_email',
            'context' => "Sent mass email to $queuedCount users. Subject: " . $data['subject'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        $message = "Mass email queued successfully. $queuedCount emails queued for delivery.";
        if ($failedCount > 0) {
            $message .= " $failedCount emails failed to queue.";
        }

        return ApiResponse::success([
            'queued_count' => $queuedCount,
            'failed_count' => $failedCount,
            'total_users' => count($validUsers),
        ], $message, 200);
    }
}
