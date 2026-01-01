<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Activity;
use App\Chat\SpellVariable;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\SpellsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Spell',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Spell ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Spell UUID'),
        new OA\Property(property: 'realm_id', type: 'integer', description: 'Realm ID'),
        new OA\Property(property: 'author', type: 'string', description: 'Spell author'),
        new OA\Property(property: 'name', type: 'string', description: 'Spell name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Spell description'),
        new OA\Property(property: 'features', type: 'string', nullable: true, description: 'Spell features (JSON)'),
        new OA\Property(property: 'docker_images', type: 'string', nullable: true, description: 'Docker images (JSON)'),
        new OA\Property(property: 'file_denylist', type: 'string', nullable: true, description: 'File denylist (JSON)'),
        new OA\Property(property: 'update_url', type: 'string', nullable: true, description: 'Update URL'),
        new OA\Property(property: 'config_files', type: 'string', nullable: true, description: 'Config files'),
        new OA\Property(property: 'config_startup', type: 'string', nullable: true, description: 'Config startup'),
        new OA\Property(property: 'config_logs', type: 'string', nullable: true, description: 'Config logs'),
        new OA\Property(property: 'config_stop', type: 'string', nullable: true, description: 'Config stop'),
        new OA\Property(property: 'startup', type: 'string', nullable: true, description: 'Startup command'),
        new OA\Property(property: 'script_container', type: 'string', nullable: true, description: 'Script container'),
        new OA\Property(property: 'script_entry', type: 'string', nullable: true, description: 'Script entry point'),
        new OA\Property(property: 'script_is_privileged', type: 'boolean', description: 'Script is privileged'),
        new OA\Property(property: 'script_install', type: 'string', nullable: true, description: 'Installation script'),
        new OA\Property(property: 'force_outgoing_ip', type: 'boolean', description: 'Force outgoing IP'),
        new OA\Property(property: 'config_from', type: 'integer', nullable: true, description: 'Config from spell ID'),
        new OA\Property(property: 'copy_script_from', type: 'integer', nullable: true, description: 'Copy script from spell ID'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'SpellPagination',
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
    schema: 'SpellCreate',
    type: 'object',
    required: ['realm_id', 'author', 'name'],
    properties: [
        new OA\Property(property: 'realm_id', type: 'integer', description: 'Realm ID', minimum: 1),
        new OA\Property(property: 'author', type: 'string', description: 'Spell author', minLength: 1),
        new OA\Property(property: 'name', type: 'string', description: 'Spell name', minLength: 1),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Spell description'),
        new OA\Property(property: 'features', type: 'string', nullable: true, description: 'Spell features (JSON)'),
        new OA\Property(property: 'docker_images', type: 'string', nullable: true, description: 'Docker images (JSON)'),
        new OA\Property(property: 'file_denylist', type: 'string', nullable: true, description: 'File denylist (JSON)'),
        new OA\Property(property: 'update_url', type: 'string', nullable: true, description: 'Update URL'),
        new OA\Property(property: 'config_files', type: 'string', nullable: true, description: 'Config files'),
        new OA\Property(property: 'config_startup', type: 'string', nullable: true, description: 'Config startup'),
        new OA\Property(property: 'config_logs', type: 'string', nullable: true, description: 'Config logs'),
        new OA\Property(property: 'config_stop', type: 'string', nullable: true, description: 'Config stop'),
        new OA\Property(property: 'startup', type: 'string', nullable: true, description: 'Startup command'),
        new OA\Property(property: 'script_container', type: 'string', nullable: true, description: 'Script container'),
        new OA\Property(property: 'script_entry', type: 'string', nullable: true, description: 'Script entry point'),
        new OA\Property(property: 'script_is_privileged', type: 'boolean', description: 'Script is privileged'),
        new OA\Property(property: 'script_install', type: 'string', nullable: true, description: 'Installation script'),
        new OA\Property(property: 'force_outgoing_ip', type: 'boolean', description: 'Force outgoing IP'),
        new OA\Property(property: 'config_from', type: 'integer', nullable: true, description: 'Config from spell ID'),
        new OA\Property(property: 'copy_script_from', type: 'integer', nullable: true, description: 'Copy script from spell ID'),
        new OA\Property(property: 'uuid', type: 'string', nullable: true, description: 'Spell UUID (auto-generated if not provided)'),
        new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Optional spell ID (useful for migrations from other platforms)'),
    ]
)]
#[OA\Schema(
    schema: 'SpellUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'realm_id', type: 'integer', description: 'Realm ID', minimum: 1),
        new OA\Property(property: 'author', type: 'string', description: 'Spell author'),
        new OA\Property(property: 'name', type: 'string', description: 'Spell name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Spell description'),
        new OA\Property(property: 'features', type: 'string', nullable: true, description: 'Spell features (JSON)'),
        new OA\Property(property: 'docker_images', type: 'string', nullable: true, description: 'Docker images (JSON)'),
        new OA\Property(property: 'file_denylist', type: 'string', nullable: true, description: 'File denylist (JSON)'),
        new OA\Property(property: 'update_url', type: 'string', nullable: true, description: 'Update URL'),
        new OA\Property(property: 'config_files', type: 'string', nullable: true, description: 'Config files'),
        new OA\Property(property: 'config_startup', type: 'string', nullable: true, description: 'Config startup'),
        new OA\Property(property: 'config_logs', type: 'string', nullable: true, description: 'Config logs'),
        new OA\Property(property: 'config_stop', type: 'string', nullable: true, description: 'Config stop'),
        new OA\Property(property: 'startup', type: 'string', nullable: true, description: 'Startup command'),
        new OA\Property(property: 'script_container', type: 'string', nullable: true, description: 'Script container'),
        new OA\Property(property: 'script_entry', type: 'string', nullable: true, description: 'Script entry point'),
        new OA\Property(property: 'script_is_privileged', type: 'boolean', description: 'Script is privileged'),
        new OA\Property(property: 'script_install', type: 'string', nullable: true, description: 'Installation script'),
        new OA\Property(property: 'force_outgoing_ip', type: 'boolean', description: 'Force outgoing IP'),
        new OA\Property(property: 'config_from', type: 'integer', nullable: true, description: 'Config from spell ID'),
        new OA\Property(property: 'copy_script_from', type: 'integer', nullable: true, description: 'Copy script from spell ID'),
        new OA\Property(property: 'uuid', type: 'string', nullable: true, description: 'Spell UUID'),
    ]
)]
#[OA\Schema(
    schema: 'SpellVariable',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Variable ID'),
        new OA\Property(property: 'spell_id', type: 'integer', description: 'Spell ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Variable name'),
        new OA\Property(property: 'description', type: 'string', description: 'Variable description'),
        new OA\Property(property: 'env_variable', type: 'string', description: 'Environment variable name'),
        new OA\Property(property: 'default_value', type: 'string', description: 'Default value'),
        new OA\Property(property: 'user_viewable', type: 'boolean', description: 'User viewable flag'),
        new OA\Property(property: 'user_editable', type: 'boolean', description: 'User editable flag'),
        new OA\Property(property: 'rules', type: 'string', description: 'Validation rules'),
        new OA\Property(property: 'field_type', type: 'string', description: 'Field type'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'SpellVariableCreate',
    type: 'object',
    required: ['name', 'env_variable', 'description', 'default_value'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Variable name', minLength: 1),
        new OA\Property(property: 'env_variable', type: 'string', description: 'Environment variable name', minLength: 1),
        new OA\Property(property: 'description', type: 'string', description: 'Variable description', minLength: 1),
        new OA\Property(property: 'default_value', type: 'string', description: 'Default value', minLength: 1),
        new OA\Property(property: 'user_viewable', type: 'boolean', description: 'User viewable flag'),
        new OA\Property(property: 'user_editable', type: 'boolean', description: 'User editable flag'),
        new OA\Property(property: 'rules', type: 'string', nullable: true, description: 'Validation rules'),
        new OA\Property(property: 'field_type', type: 'string', nullable: true, description: 'Field type'),
    ]
)]
#[OA\Schema(
    schema: 'SpellVariableUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Variable name'),
        new OA\Property(property: 'env_variable', type: 'string', description: 'Environment variable name'),
        new OA\Property(property: 'description', type: 'string', description: 'Variable description'),
        new OA\Property(property: 'default_value', type: 'string', description: 'Default value'),
        new OA\Property(property: 'user_viewable', type: 'boolean', description: 'User viewable flag'),
        new OA\Property(property: 'user_editable', type: 'boolean', description: 'User editable flag'),
        new OA\Property(property: 'rules', type: 'string', nullable: true, description: 'Validation rules'),
        new OA\Property(property: 'field_type', type: 'string', nullable: true, description: 'Field type'),
    ]
)]
#[OA\Schema(
    schema: 'SpellImport',
    type: 'object',
    required: ['realm_id'],
    properties: [
        new OA\Property(property: 'realm_id', type: 'integer', description: 'Realm ID', minimum: 1),
        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Spell JSON file'),
    ]
)]
#[OA\Schema(
    schema: 'OnlineSpell',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Spell ID'),
        new OA\Property(property: 'identifier', type: 'string', description: 'Spell identifier'),
        new OA\Property(property: 'name', type: 'string', description: 'Spell display name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Spell description'),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Spell icon URL'),
        new OA\Property(property: 'website', type: 'string', nullable: true, description: 'Spell website'),
        new OA\Property(property: 'author', type: 'string', nullable: true, description: 'Spell author'),
        new OA\Property(property: 'author_email', type: 'string', nullable: true, description: 'Author email'),
        new OA\Property(property: 'maintainers', type: 'array', items: new OA\Items(type: 'string'), description: 'Maintainers'),
        new OA\Property(property: 'tags', type: 'array', items: new OA\Items(type: 'string'), description: 'Spell tags'),
        new OA\Property(property: 'verified', type: 'boolean', description: 'Verified status'),
        new OA\Property(property: 'downloads', type: 'integer', description: 'Download count'),
        new OA\Property(property: 'created_at', type: 'string', nullable: true, description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', nullable: true, description: 'Last update timestamp'),
        new OA\Property(property: 'latest_version', type: 'object', properties: [
            new OA\Property(property: 'version', type: 'string', nullable: true, description: 'Version number'),
            new OA\Property(property: 'download_url', type: 'string', nullable: true, description: 'Download URL'),
            new OA\Property(property: 'file_size', type: 'integer', nullable: true, description: 'File size'),
            new OA\Property(property: 'created_at', type: 'string', nullable: true, description: 'Version creation timestamp'),
        ], description: 'Latest version information'),
    ]
)]
#[OA\Schema(
    schema: 'OnlineSpellInstall',
    type: 'object',
    required: ['identifier', 'realm_id'],
    properties: [
        new OA\Property(property: 'identifier', type: 'string', description: 'Spell identifier', pattern: '^[a-zA-Z0-9_\\-]+$'),
        new OA\Property(property: 'realm_id', type: 'integer', description: 'Realm ID', minimum: 1),
    ]
)]
class SpellsController
{
    #[OA\Get(
        path: '/api/admin/spells',
        summary: 'Get all spells',
        description: 'Retrieve a paginated list of all spells with optional filtering by realm and search functionality.',
        tags: ['Admin - Spells'],
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
                description: 'Search term to filter spells by name, author, or description',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'realm_id',
                in: 'query',
                description: 'Filter spells by realm ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Spells retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spells', type: 'array', items: new OA\Items(ref: '#/components/schemas/Spell')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/SpellPagination'),
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
        $realmId = $request->query->get('realm_id');
        $realmId = $realmId ? (int) $realmId : null;

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
        $spells = Spell::searchSpells(
            page: $page,
            limit: $limit,
            search: $search,
            realmId: $realmId
        );
        $total = Spell::getSpellsCount($search, $realmId);

        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'spells' => $spells,
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
                'has_results' => count($spells) > 0,
            ],
        ], 'Spells fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/spells/{id}',
        summary: 'Get spell by ID',
        description: 'Retrieve a specific spell by its ID with realm information.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Spell ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Spell retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spell', ref: '#/components/schemas/Spell'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid spell ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Spell not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $spell = Spell::getSpellWithRealm($id);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        return ApiResponse::success(['spell' => $spell], 'Spell fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/spells',
        summary: 'Create new spell',
        description: 'Create a new spell with comprehensive validation including JSON field validation, UUID generation, and activity logging.',
        tags: ['Admin - Spells'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SpellCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Spell created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spell', ref: '#/components/schemas/Spell'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, invalid data types, validation errors, invalid realm, invalid UUID format, or UUID already exists'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Realm not found'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $requiredFields = ['realm_id', 'author', 'name'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }

        // Validate realm_id exists
        if (!Realm::getById($data['realm_id'])) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        // Validate string fields
        $stringFields = ['author', 'name', 'description', 'update_url', 'config_files', 'config_startup', 'config_logs', 'config_stop', 'startup', 'script_container', 'script_entry', 'script_install'];
        foreach ($stringFields as $field) {
            if (isset($data[$field]) && !is_string($data[$field])) {
                return ApiResponse::error("$field must be a string", 'INVALID_DATA_TYPE');
            }
        }

        // Validate JSON fields
        $jsonFields = ['features', 'docker_images', 'file_denylist'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                if (!is_string($data[$field]) || !Spell::isValidJson($data[$field])) {
                    return ApiResponse::error("$field must be valid JSON", 'INVALID_JSON_FIELD');
                }
            }
        }

        // Validate boolean fields
        $booleanFields = ['script_is_privileged', 'force_outgoing_ip'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field]) && !is_bool($data[$field]) && !in_array($data[$field], [0, 1, '0', '1'])) {
                return ApiResponse::error("$field must be a boolean", 'INVALID_DATA_TYPE');
            }
        }

        // Validate integer fields
        $integerFields = ['config_from', 'copy_script_from'];
        foreach ($integerFields as $field) {
            if (isset($data[$field]) && (!is_numeric($data[$field]) || (int) $data[$field] < 0)) {
                return ApiResponse::error("$field must be a positive integer", 'INVALID_DATA_TYPE');
            }
        }

        // Generate UUID if not provided
        if (!isset($data['uuid'])) {
            $data['uuid'] = Spell::generateUuid();
        } else {
            // Validate UUID format
            if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
                return ApiResponse::error('Invalid UUID format', 'INVALID_UUID');
            }
        }

        // Check if UUID already exists
        if (Spell::getSpellByUuid($data['uuid'])) {
            return ApiResponse::error('Spell with this UUID already exists', 'UUID_ALREADY_EXISTS');
        }

        // Handle optional ID for migrations
        if (isset($data['id'])) {
            if (!is_int($data['id']) && !ctype_digit((string) $data['id'])) {
                return ApiResponse::error('ID must be an integer', 'INVALID_DATA_TYPE');
            }
            $data['id'] = (int) $data['id'];
            if ($data['id'] < 1) {
                return ApiResponse::error('ID must be a positive integer', 'INVALID_DATA_LENGTH');
            }
            // Check if spell with this ID already exists
            if (Spell::getSpellById($data['id'])) {
                return ApiResponse::error('Spell with this ID already exists', 'DUPLICATE_ID', 400);
            }
        }

        $spellId = Spell::createSpell($data);
        if (!$spellId) {
            return ApiResponse::error('Failed to create spell', 'SPELL_CREATE_FAILED', 400);
        }

        $spell = Spell::getSpellById($spellId);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_spell',
            'context' => 'Created spell: ' . $spell['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SpellsEvent::onSpellCreated(),
                [
                    'spell' => $spell,
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['spell' => $spell], 'Spell created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/spells/{id}',
        summary: 'Update spell',
        description: 'Update an existing spell with comprehensive validation including JSON field validation, UUID validation, and activity logging.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Spell ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SpellUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Spell updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spell', ref: '#/components/schemas/Spell'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, no data provided, invalid data types, validation errors, invalid realm, invalid UUID format, or UUID already exists'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Spell or realm not found'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $spell = Spell::getSpellById($id);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
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

        // Validate realm_id if provided
        if (isset($data['realm_id'])) {
            if (!Realm::getById($data['realm_id'])) {
                return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
            }
        }

        // Validate string fields
        $stringFields = ['author', 'name', 'description', 'update_url', 'config_files', 'config_startup', 'config_logs', 'config_stop', 'startup', 'script_container', 'script_entry', 'script_install'];
        foreach ($stringFields as $field) {
            if (isset($data[$field]) && !is_string($data[$field])) {
                return ApiResponse::error("$field must be a string", 'INVALID_DATA_TYPE');
            }
        }

        // Validate JSON fields
        $jsonFields = ['features', 'docker_images', 'file_denylist'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                if (!is_string($data[$field]) || !Spell::isValidJson($data[$field])) {
                    return ApiResponse::error("$field must be valid JSON", 'INVALID_JSON_FIELD');
                }
            }
        }

        // Validate boolean fields
        $booleanFields = ['script_is_privileged', 'force_outgoing_ip'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field]) && !is_bool($data[$field]) && !in_array($data[$field], [0, 1, '0', '1'])) {
                return ApiResponse::error("$field must be a boolean", 'INVALID_DATA_TYPE');
            }
        }

        // Validate integer fields
        $integerFields = ['config_from', 'copy_script_from'];
        foreach ($integerFields as $field) {
            if (isset($data[$field]) && (!is_numeric($data[$field]) || (int) $data[$field] < 0)) {
                return ApiResponse::error("$field must be a positive integer", 'INVALID_DATA_TYPE');
            }
        }

        // Validate UUID if provided
        if (isset($data['uuid'])) {
            if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
                return ApiResponse::error('Invalid UUID format', 'INVALID_UUID');
            }
            // Check if UUID already exists (excluding current spell)
            $existingSpell = Spell::getSpellByUuid($data['uuid']);
            if ($existingSpell && $existingSpell['id'] !== $id) {
                return ApiResponse::error('Spell with this UUID already exists', 'UUID_ALREADY_EXISTS');
            }
        }

        $success = Spell::updateSpellById($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update spell', 'SPELL_UPDATE_FAILED', 400);
        }

        $spell = Spell::getSpellById($id);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_spell',
            'context' => 'Updated spell: ' . $spell['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SpellsEvent::onSpellUpdated(),
                [
                    'spell' => $spell,
                    'updated_data' => $data,
                    'updated_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['spell' => $spell], 'Spell updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/spells/{id}',
        summary: 'Delete spell',
        description: 'Permanently delete a spell. Checks for references from other spells before deletion.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Spell ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Spell deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Spell is referenced by other spells or failed to delete'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Spell not found'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $spell = Spell::getSpellById($id);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        // Check if the spell is assigned to any servers
        $serversCount = \App\Chat\Server::count(['spell_id' => $id]);
        if ($serversCount > 0) {
            return ApiResponse::error('Cannot delete spell: it is assigned to servers', 'SPELL_ASSIGNED_TO_SERVERS', 400);
        }

        // Check if spell is referenced by other spells
        $referencingSpells = Spell::getSpellsByConfigFrom($id);
        $referencingSpells = array_merge($referencingSpells, Spell::getSpellsByCopyScriptFrom($id));

        if (!empty($referencingSpells)) {
            return ApiResponse::error('Cannot delete spell: it is referenced by other spells', 'SPELL_REFERENCED', 400);
        }

        $success = Spell::hardDeleteSpell($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete spell', 'SPELL_DELETE_FAILED', 400);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_spell',
            'context' => 'Deleted spell: ' . $spell['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SpellsEvent::onSpellDeleted(),
                [
                    'spell' => $spell,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Spell deleted successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/spells/realm/{realmId}',
        summary: 'Get spells by realm',
        description: 'Retrieve all spells belonging to a specific realm with pagination and search functionality.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'realmId',
                in: 'path',
                description: 'Realm ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
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
                description: 'Search term to filter spells',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Spells for realm retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spells', type: 'array', items: new OA\Items(ref: '#/components/schemas/Spell')),
                        new OA\Property(property: 'realm', type: 'object', description: 'Realm information'),
                        new OA\Property(property: 'pagination', type: 'object', properties: [
                            new OA\Property(property: 'page', type: 'integer'),
                            new OA\Property(property: 'limit', type: 'integer'),
                            new OA\Property(property: 'total', type: 'integer'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid realm ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Realm not found'),
        ]
    )]
    public function getByRealm(Request $request, int $realmId): Response
    {
        // Validate realm exists
        $realm = Realm::getById($realmId);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        // Validate and sanitize pagination parameters
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);

        if ($page < 1) {
            $page = 1;
        }

        $maxLimit = 100;
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > $maxLimit) {
            $limit = $maxLimit;
        }

        $search = $request->query->get('search', '');

        $spells = Spell::searchSpells(
            page: $page,
            limit: $limit,
            search: $search,
            realmId: $realmId
        );
        $total = Spell::getSpellsCount($search, $realmId);

        return ApiResponse::success([
            'spells' => $spells,
            'realm' => $realm,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ], 'Spells for realm fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/spells/import',
        summary: 'Import spell from file',
        description: 'Import a spell from a JSON file with comprehensive validation, variable import, and metadata preservation.',
        tags: ['Admin - Spells'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(ref: '#/components/schemas/SpellImport')
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Spell imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spell', ref: '#/components/schemas/Spell'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid realm ID, no file uploaded, file upload error, file read error, invalid JSON format, or failed to create spell'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Realm not found'),
        ]
    )]
    public function import(Request $request): Response
    {
        // Get realm_id from POST data
        $realmId = $request->request->get('realm_id');
        if (!$realmId || !is_numeric($realmId)) {
            return ApiResponse::error('Missing or invalid realm ID', 'INVALID_REALM_ID', 400);
        }

        // Validate realm exists
        $realm = Realm::getById((int) $realmId);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        // Get uploaded file
        $files = $request->files->all();
        if (empty($files) || !isset($files['file'])) {
            return ApiResponse::error('No file uploaded', 'NO_FILE_UPLOADED', 400);
        }

        $file = $files['file'];
        if ($file->getError() !== UPLOAD_ERR_OK) {
            return ApiResponse::error('File upload error', 'FILE_UPLOAD_ERROR', 400);
        }

        // Read and parse JSON
        $jsonContent = file_get_contents($file->getPathname());
        if (!$jsonContent) {
            return ApiResponse::error('Could not read file', 'FILE_READ_ERROR', 400);
        }

        $jsonData = json_decode($jsonContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON format', 'INVALID_JSON', 400);
        }

        // Map JSON data to spell format
        $spellData = [
            'realm_id' => (int) $realmId,
            'uuid' => Spell::generateUuid(),
            'name' => $jsonData['name'] ?? 'Imported Spell',
            'author' => $jsonData['author'] ?? 'Unknown',
            'description' => $jsonData['description'] ?? '',
            'features' => isset($jsonData['features']) && $jsonData['features'] !== null ? json_encode($jsonData['features']) : null,
            'docker_images' => isset($jsonData['docker_images']) && $jsonData['docker_images'] !== null ? json_encode($jsonData['docker_images']) : null,
            'file_denylist' => isset($jsonData['file_denylist']) && $jsonData['file_denylist'] !== null ? json_encode($jsonData['file_denylist']) : null,
            'update_url' => $jsonData['meta']['update_url'] ?? null,
            'config_files' => $jsonData['config']['files'] ?? null,
            'config_startup' => $jsonData['config']['startup'] ?? null,
            'config_logs' => $jsonData['config']['logs'] ?? null,
            'config_stop' => $jsonData['config']['stop'] ?? null,
            'startup' => $jsonData['startup'] ?? null,
            'script_container' => $jsonData['scripts']['installation']['container'] ?? 'alpine:3.4',
            'script_entry' => $jsonData['scripts']['installation']['entrypoint'] ?? 'ash',
            'script_is_privileged' => true,
            'script_install' => $jsonData['scripts']['installation']['script'] ?? null,
            'force_outgoing_ip' => false,
        ];

        // Preserve original UUID if it exists in FeatherPanel metadata
        if (isset($jsonData['_featherpanel']['spell_metadata']['uuid'])) {
            $originalUuid = $jsonData['_featherpanel']['spell_metadata']['uuid'];
            // Check if UUID already exists
            $existingSpell = Spell::getSpellByUuid($originalUuid);
            if (!$existingSpell) {
                $spellData['uuid'] = $originalUuid;
            }
        }

        // Preserve original metadata if available
        $importMetadata = null;
        if (isset($jsonData['_featherpanel'])) {
            $importMetadata = [
                'original_export_info' => $jsonData['_featherpanel']['export_info'] ?? null,
                'original_spell_metadata' => $jsonData['_featherpanel']['spell_metadata'] ?? null,
                'import_info' => [
                    'imported_by' => $admin['username'] ?? 'Unknown',
                    'imported_at' => date('Y-m-d H:i:s'),
                    'panel_version' => '1.0.0',
                    'import_format_version' => '1.0',
                ],
            ];
        }

        // Create spell
        $spellId = Spell::createSpell($spellData);
        if (!$spellId) {
            return ApiResponse::error('Failed to create spell from import', 'IMPORT_CREATE_FAILED', 400);
        }

        // Import variables if present
        $importedVariablesCount = 0;
        $skippedVariablesCount = 0;
        if (isset($jsonData['variables']) && is_array($jsonData['variables'])) {
            foreach ($jsonData['variables'] as $var) {
                // Validate required fields exist and name/env_variable are not empty
                // Note: description and default_value can be empty strings (valid in Pterodactyl)
                $missingFields = [];

                if (!isset($var['name']) || trim((string) $var['name']) === '') {
                    $missingFields[] = 'name';
                }
                if (!isset($var['env_variable']) || trim((string) $var['env_variable']) === '') {
                    $missingFields[] = 'env_variable';
                }
                if (!isset($var['description'])) {
                    $missingFields[] = 'description';
                }
                if (!isset($var['default_value'])) {
                    $missingFields[] = 'default_value';
                }

                if (!empty($missingFields)) {
                    App::getInstance(true)->getLogger()->warning(
                        'Skipping variable during import: missing required fields (' . implode(', ', $missingFields) . '). Variable data: ' . json_encode($var)
                    );
                    ++$skippedVariablesCount;
                    continue;
                }

                $variableData = [
                    'spell_id' => $spellId,
                    'name' => trim($var['name']),
                    'description' => $var['description'], // Allow empty string
                    'env_variable' => trim($var['env_variable']),
                    'default_value' => $var['default_value'], // Allow empty string
                    'user_viewable' => isset($var['user_viewable']) ? ($var['user_viewable'] ? 'true' : 'false') : 'true',
                    'user_editable' => isset($var['user_editable']) ? ($var['user_editable'] ? 'true' : 'false') : 'true',
                    'rules' => $var['rules'] ?? '',
                    'field_type' => $var['field_type'] ?? 'text',
                ];

                $varId = SpellVariable::createVariable($variableData);
                if ($varId) {
                    ++$importedVariablesCount;
                } else {
                    App::getInstance(true)->getLogger()->error(
                        'Failed to create variable during import: ' . ($var['env_variable'] ?? 'unknown') . '. Variable data: ' . json_encode($var)
                    );
                    ++$skippedVariablesCount;
                }
            }
        }

        $spell = Spell::getSpellById($spellId);

        if ($skippedVariablesCount > 0) {
            App::getInstance(true)->getLogger()->warning(
                "Spell import completed with warnings: {$importedVariablesCount} variables imported, {$skippedVariablesCount} variables skipped. Spell: " . $spell['name']
            );
        }

        // Log activity with metadata information
        $logContext = 'Imported spell: ' . $spell['name'];
        if ($importMetadata && isset($importMetadata['original_export_info']['exported_by'])) {
            $logContext .= ' (originally exported by: ' . $importMetadata['original_export_info']['exported_by'] . ')';
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'import_spell',
            'context' => $logContext,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['spell' => $spell], 'Spell imported successfully', 201);
    }

    #[OA\Get(
        path: '/api/admin/spells/{id}/export',
        summary: 'Export spell to file',
        description: 'Export a spell to a JSON file with complete metadata, variables, and FeatherPanel-specific information.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Spell ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Spell exported successfully',
                content: new OA\MediaType(
                    mediaType: 'application/json',
                    schema: new OA\Schema(
                        type: 'object',
                        description: 'Complete spell export data with metadata and variables'
                    )
                ),
                headers: [
                    new OA\Header(
                        header: 'Content-Disposition',
                        description: 'Attachment filename',
                        schema: new OA\Schema(type: 'string')
                    ),
                ]
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid spell ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Spell not found'),
        ]
    )]
    public function export(Request $request, int $id): Response
    {
        // Get spell with realm information
        $spell = Spell::getSpellWithRealm($id);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        // Get spell variables
        $variables = SpellVariable::getVariablesBySpellId($id);

        // Build export data structure matching the import format
        $exportData = [
            '_comment' => 'DO NOT EDIT: FILE GENERATED AUTOMATICALLY BY PANEL',
            'meta' => [
                'update_url' => $spell['update_url'],
                'version' => 'PTDL_v2',
            ],
            'exported_at' => date('c'), // ISO 8601 format
            'name' => $spell['name'],
            'author' => $spell['author'],
            'description' => $spell['description'],
            'features' => !empty($spell['features']) ? json_decode($spell['features'], true) : [],
            'docker_images' => !empty($spell['docker_images']) ? json_decode($spell['docker_images'], true) : [],
            'file_denylist' => !empty($spell['file_denylist']) ? json_decode($spell['file_denylist'], true) : [],
            'startup' => $spell['startup'],
            'config' => [
                'files' => $spell['config_files'] ?? '{}',
                'startup' => $spell['config_startup'] ?? '{}',
                'logs' => $spell['config_logs'] ?? '{}',
                'stop' => $spell['config_stop'] ?? 'stop',
            ],
            'scripts' => [
                'installation' => [
                    'container' => $spell['script_container'] ?? 'alpine:3.4',
                    'entrypoint' => $spell['script_entry'] ?? 'ash',
                    'script' => $spell['script_install'] ?? '',
                ],
            ],
            'variables' => [],
            // FeatherPanel-specific metadata (won't affect import compatibility)
            '_featherpanel' => [
                'export_info' => [
                    'exported_by' => $admin['username'] ?? 'Unknown',
                    'exported_at' => date('Y-m-d H:i:s'),
                    'panel_version' => '1.0.0', // You can make this dynamic
                    'export_format_version' => '1.0',
                ],
                'spell_metadata' => [
                    'uuid' => $spell['uuid'],
                    'realm_id' => $spell['realm_id'],
                    'realm_name' => $spell['realm_name'] ?? 'Unknown',
                    'created_at' => $spell['created_at'],
                    'updated_at' => $spell['updated_at'],
                    'script_is_privileged' => (bool) $spell['script_is_privileged'],
                    'force_outgoing_ip' => (bool) $spell['force_outgoing_ip'],
                    'config_from' => $spell['config_from'],
                    'copy_script_from' => $spell['copy_script_from'],
                ],
                'variables_count' => count($variables),
                'features_count' => !empty($spell['features']) ? count(json_decode($spell['features'], true)) : 0,
                'docker_images_count' => !empty($spell['docker_images']) ? count(json_decode($spell['docker_images'], true)) : 0,
            ],
        ];

        // Add variables to export data
        foreach ($variables as $variable) {
            $exportData['variables'][] = [
                'name' => $variable['name'],
                'description' => $variable['description'],
                'env_variable' => $variable['env_variable'],
                'default_value' => $variable['default_value'],
                'user_viewable' => (bool) $variable['user_viewable'],
                'user_editable' => (bool) $variable['user_editable'],
                'rules' => $variable['rules'],
                'field_type' => $variable['field_type'] ?? 'text',
            ];
        }

        // Generate filename
        $filename = strtolower(str_replace(' ', '-', $spell['name'])) . '.json';

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'export_spell',
            'context' => 'Exported spell: ' . $spell['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Return JSON file as download
        $response = new Response(
            json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            200,
            [
                'Content-Type' => 'application/json',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]
        );

        return $response;
    }

    // --- Spell Variables CRUD ---
    #[OA\Get(
        path: '/api/admin/spells/{spellId}/variables',
        summary: 'List spell variables',
        description: 'Retrieve all variables for a specific spell.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'spellId',
                in: 'path',
                description: 'Spell ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Variables retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'variables', type: 'array', items: new OA\Items(ref: '#/components/schemas/SpellVariable')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid spell ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Spell not found'),
        ]
    )]
    public function listVariables(Request $request, int $spellId): Response
    {
        $spell = Spell::getSpellById($spellId);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }
        $vars = SpellVariable::getVariablesBySpellId($spellId);

        return ApiResponse::success(['variables' => $vars], 'Variables fetched', 200);
    }

    #[OA\Post(
        path: '/api/admin/spells/{spellId}/variables',
        summary: 'Create spell variable',
        description: 'Create a new variable for a specific spell with validation.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'spellId',
                in: 'path',
                description: 'Spell ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SpellVariableCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Variable created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'variable', ref: '#/components/schemas/SpellVariable'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, or failed to create variable'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Spell not found'),
        ]
    )]
    public function createVariable(Request $request, int $spellId): Response
    {
        $spell = Spell::getSpellById($spellId);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        $data['spell_id'] = $spellId;
        $required = ['name', 'env_variable', 'description', 'default_value'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                return ApiResponse::error("$field is required", 'MISSING_REQUIRED_FIELD', 400);
            }
        }
        // Optional: user_viewable/user_editable/rules
        if (!isset($data['user_viewable'])) {
            $data['user_viewable'] = 1;
        }
        if (!isset($data['user_editable'])) {
            $data['user_editable'] = 1;
        }
        $varId = SpellVariable::createVariable($data);
        if (!$varId) {
            return ApiResponse::error('Failed to create variable', 'VARIABLE_CREATE_FAILED', 400);
        }
        $var = SpellVariable::getVariableById($varId);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SpellsEvent::onSpellVariableCreated(),
                [
                    'spell_id' => $spellId,
                    'variable' => $var,
                ]
            );
        }

        return ApiResponse::success(['variable' => $var], 'Variable created', 201);
    }

    #[OA\Patch(
        path: '/api/admin/spell-variables/{id}',
        summary: 'Update spell variable',
        description: 'Update an existing spell variable.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Variable ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SpellVariableUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Variable updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'variable', ref: '#/components/schemas/SpellVariable'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON or failed to update variable'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Variable not found'),
        ]
    )]
    public function updateVariable(Request $request, int $id): Response
    {
        $var = SpellVariable::getVariableById($id);
        if (!$var) {
            return ApiResponse::error('Variable not found', 'VARIABLE_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        unset($data['id']);
        $success = SpellVariable::updateVariable($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update variable', 'VARIABLE_UPDATE_FAILED', 400);
        }
        $var = SpellVariable::getVariableById($id);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SpellsEvent::onSpellVariableUpdated(),
                [
                    'variable' => $var,
                    'updated_data' => $data,
                ]
            );
        }

        return ApiResponse::success(['variable' => $var], 'Variable updated', 200);
    }

    #[OA\Delete(
        path: '/api/admin/spell-variables/{id}',
        summary: 'Delete spell variable',
        description: 'Delete an existing spell variable.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Variable ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Variable deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Failed to delete variable'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Variable not found'),
        ]
    )]
    public function deleteVariable(Request $request, int $id): Response
    {
        $var = SpellVariable::getVariableById($id);
        if (!$var) {
            return ApiResponse::error('Variable not found', 'VARIABLE_NOT_FOUND', 404);
        }
        $success = SpellVariable::deleteVariable($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete variable', 'VARIABLE_DELETE_FAILED', 400);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SpellsEvent::onSpellVariableDeleted(),
                [
                    'variable' => $var,
                ]
            );
        }

        return ApiResponse::success([], 'Variable deleted', 200);
    }

    #[OA\Get(
        path: '/api/admin/spells/online/list',
        summary: 'List online spells',
        description: 'Retrieve spells from the online FeatherPanel spell registry with search and pagination.',
        tags: ['Admin - Spells'],
        parameters: [
            new OA\Parameter(
                name: 'q',
                in: 'query',
                description: 'Search query',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 20)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Online spells retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spells', type: 'array', items: new OA\Items(ref: '#/components/schemas/OnlineSpell')),
                        new OA\Property(property: 'pagination', type: 'object', description: 'Pagination information'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Failed to fetch online spell list or invalid response'),
        ]
    )]
    public function onlineList(Request $request): Response
    {
        try {
            // New official spells API
            $base = 'https://api.featherpanel.com/spells';
            $q = trim((string) ($request->query->get('q') ?? ''));
            $page = (int) ($request->query->get('page') ?? 1);
            $perPage = (int) ($request->query->get('per_page') ?? 20);
            $query = [];
            if ($q !== '') {
                $query['search'] = $q;
            }
            if ($page > 0) {
                $query['page'] = (string) $page;
            }
            if ($perPage > 0) {
                $query['per_page'] = (string) $perPage;
            }
            $url = $base . (!empty($query) ? ('?' . http_build_query($query)) : '');
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch online spell list', 'ONLINE_LIST_FETCH_FAILED', 500);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['spells']) || !is_array($data['data']['spells'])) {
                return ApiResponse::error('Invalid response from online spell list', 'ONLINE_LIST_INVALID', 500);
            }

            $spells = $data['data']['spells'];
            $onlineSpells = array_map(static function (array $spell): array {
                $latest = $spell['latest_version'] ?? [];
                $downloadUrl = isset($latest['download_url']) ? ('https://api.featherpanel.com' . $latest['download_url']) : null;
                if (isset($spell['icon_url'])) {
                    $iconUrl = $spell['icon_url'];
                    // If iconUrl is set and not empty, ensure it is https
                    if (!empty($iconUrl) && is_string($iconUrl)) {
                        if (strpos($iconUrl, 'http://') === 0) {
                            $iconUrl = 'https://' . substr($iconUrl, 7);
                        }
                    }
                } else {
                    $iconUrl = null;
                }

                return [
                    // Basic identity
                    'id' => $spell['id'] ?? null,
                    'identifier' => $spell['name'] ?? '',
                    'name' => $spell['display_name'] ?? ($spell['name'] ?? ''),
                    'description' => $spell['description'] ?? null,
                    'icon' => $iconUrl,
                    'website' => $spell['website'] ?? null,
                    // Authors/maintainers
                    'author' => $spell['author'] ?? null,
                    'author_email' => $spell['author_email'] ?? null,
                    'maintainers' => $spell['maintainers'] ?? [],
                    // Meta
                    'tags' => $spell['tags'] ?? [],
                    'verified' => isset($spell['verified']) ? (int) $spell['verified'] === 1 : false,
                    'downloads' => $spell['downloads'] ?? 0,
                    'created_at' => $spell['created_at'] ?? null,
                    'updated_at' => $spell['updated_at'] ?? null,
                    // Latest version
                    'latest_version' => [
                        'version' => $latest['version'] ?? null,
                        'download_url' => $downloadUrl,
                        'file_size' => $latest['file_size'] ?? null,
                        'created_at' => $latest['created_at'] ?? null,
                    ],
                ];
            }, $spells);

            $pagination = $data['data']['pagination'] ?? null;

            return ApiResponse::success([
                'spells' => $onlineSpells,
                'pagination' => $pagination,
            ], 'Online spells fetched', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch online spells: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/spells/online/install',
        summary: 'Install spell from online registry',
        description: 'Install a spell from the online FeatherPanel spell registry with comprehensive validation, variable import, and metadata preservation.',
        tags: ['Admin - Spells'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/OnlineSpellInstall')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Spell installed successfully from online repository',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spell', ref: '#/components/schemas/Spell'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid identifier, invalid realm ID, invalid JSON format, or failed to create spell'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Realm not found or spell not found in registry'),
            new OA\Response(response: 500, description: 'Failed to download spell JSON'),
        ]
    )]
    public function onlineInstall(Request $request): Response
    {
        try {
            $body = json_decode($request->getContent(), true);
            $identifier = $body['identifier'] ?? null;
            $realmId = $body['realm_id'] ?? null;

            if (!$identifier || !preg_match('/^[a-zA-Z0-9_\-]+$/', (string) $identifier)) {
                return ApiResponse::error('Invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            if (!$realmId || !is_numeric($realmId)) {
                return ApiResponse::error('Missing or invalid realm ID', 'INVALID_REALM_ID', 400);
            }

            // Validate realm exists
            $realm = Realm::getById((int) $realmId);
            if (!$realm) {
                return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
            }

            // Fetch spell metadata to get download URL from the new API
            // First try to find the spell by searching with the identifier
            $searchUrl = 'https://api.featherpanel.com/spells?search=' . urlencode($identifier);
            $context = stream_context_create([
                'http' => [
                    'timeout' => 15,
                    'ignore_errors' => true,
                ],
            ]);

            $match = null;
            $searchResp = @file_get_contents($searchUrl, false, $context);
            if ($searchResp !== false) {
                $searchData = json_decode($searchResp, true);
                if (is_array($searchData) && isset($searchData['data']['spells']) && is_array($searchData['data']['spells'])) {
                    foreach ($searchData['data']['spells'] as $spell) {
                        // Check multiple possible identifier fields
                        if (
                            ($spell['name'] ?? '') === $identifier
                            || ($spell['display_name'] ?? '') === $identifier
                            || ($spell['identifier'] ?? '') === $identifier
                        ) {
                            $match = $spell;
                            break;
                        }
                    }
                }
            }

            // If not found in search, try fetching all spells with pagination (fallback for pagination issues)
            if (!$match) {
                $page = 1;
                $maxPages = 10; // Prevent infinite loops

                while ($page <= $maxPages && !$match) {
                    $metaUrl = "https://api.featherpanel.com/spells?page=$page&per_page=100";
                    $metaResp = @file_get_contents($metaUrl, false, $context);
                    if ($metaResp === false) {
                        break;
                    }

                    $meta = json_decode($metaResp, true);
                    if (!is_array($meta) || !isset($meta['data']['spells']) || !is_array($meta['data']['spells'])) {
                        break;
                    }

                    $spells = $meta['data']['spells'];
                    if (empty($spells)) {
                        break; // No more spells
                    }

                    foreach ($spells as $spell) {
                        // Check multiple possible identifier fields
                        if (
                            ($spell['name'] ?? '') === $identifier
                            || ($spell['display_name'] ?? '') === $identifier
                            || ($spell['identifier'] ?? '') === $identifier
                        ) {
                            $match = $spell;
                            break 2; // Break out of both loops
                        }
                    }

                    ++$page;

                    // Check if we've reached the last page
                    $pagination = $meta['data']['pagination'] ?? [];
                    if (
                        isset($pagination['current_page'], $pagination['last_page'])
                        && $pagination['current_page'] >= $pagination['last_page']
                    ) {
                        break;
                    }
                }
            }

            if (!$match || !isset($match['latest_version']['download_url'])) {
                // Log debug information for troubleshooting
                App::getInstance(true)->getLogger()->error('Spell installation failed for identifier: ' . $identifier);
                if (!$match) {
                    App::getInstance(true)->getLogger()->error('No spell match found in registry');

                    return ApiResponse::error("Spell '$identifier' not found in registry. Please check the spelling and try again.", 'SPELL_NOT_FOUND', 404);
                }
                App::getInstance(true)->getLogger()->error('Spell found but missing download URL: ' . json_encode($match));

                return ApiResponse::error("Spell '$identifier' found but download URL is missing", 'SPELL_DOWNLOAD_URL_MISSING', 404);
            }
            $downloadUrl = 'https://api.featherpanel.com' . $match['latest_version']['download_url'];
            $fileContent = @file_get_contents($downloadUrl, false, $context);
            if ($fileContent === false) {
                return ApiResponse::error('Failed to download spell JSON', 'SPELL_DOWNLOAD_FAILED', 500);
            }

            // Parse the downloaded JSON content
            $jsonData = json_decode($fileContent, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON format in downloaded spell', 'INVALID_JSON', 400);
            }

            // Map JSON data to spell format
            $spellData = [
                'realm_id' => (int) $realmId,
                'uuid' => Spell::generateUuid(),
                'name' => $jsonData['name'] ?? $match['display_name'] ?? 'Imported Spell',
                'author' => $jsonData['author'] ?? $match['author'] ?? 'Unknown',
                'description' => $jsonData['description'] ?? $match['description'] ?? '',
                'features' => isset($jsonData['features']) && $jsonData['features'] !== null ? json_encode($jsonData['features']) : null,
                'docker_images' => isset($jsonData['docker_images']) && $jsonData['docker_images'] !== null ? json_encode($jsonData['docker_images']) : null,
                'file_denylist' => isset($jsonData['file_denylist']) && $jsonData['file_denylist'] !== null ? json_encode($jsonData['file_denylist']) : null,
                'update_url' => $jsonData['meta']['update_url'] ?? null,
                'config_files' => $jsonData['config']['files'] ?? null,
                'config_startup' => $jsonData['config']['startup'] ?? null,
                'config_logs' => $jsonData['config']['logs'] ?? null,
                'config_stop' => $jsonData['config']['stop'] ?? null,
                'startup' => $jsonData['startup'] ?? null,
                'script_container' => $jsonData['scripts']['installation']['container'] ?? 'alpine:3.4',
                'script_entry' => $jsonData['scripts']['installation']['entrypoint'] ?? 'ash',
                'script_is_privileged' => true,
                'script_install' => $jsonData['scripts']['installation']['script'] ?? null,
                'force_outgoing_ip' => false,
            ];

            // Preserve original UUID if it exists in FeatherPanel metadata
            if (isset($jsonData['_featherpanel']['spell_metadata']['uuid'])) {
                $originalUuid = $jsonData['_featherpanel']['spell_metadata']['uuid'];
                // Check if UUID already exists
                $existingSpell = Spell::getSpellByUuid($originalUuid);
                if (!$existingSpell) {
                    $spellData['uuid'] = $originalUuid;
                }
            }

            // Create spell
            $spellId = Spell::createSpell($spellData);
            if (!$spellId) {
                return ApiResponse::error('Failed to create spell from online installation', 'ONLINE_INSTALL_CREATE_FAILED', 400);
            }

            // Import variables if present
            $importedVariablesCount = 0;
            $skippedVariablesCount = 0;
            if (isset($jsonData['variables']) && is_array($jsonData['variables'])) {
                foreach ($jsonData['variables'] as $var) {
                    // Validate required fields exist and name/env_variable are not empty
                    // Note: description and default_value can be empty strings (valid in Pterodactyl)
                    $missingFields = [];

                    if (!isset($var['name']) || trim((string) $var['name']) === '') {
                        $missingFields[] = 'name';
                    }
                    if (!isset($var['env_variable']) || trim((string) $var['env_variable']) === '') {
                        $missingFields[] = 'env_variable';
                    }
                    if (!isset($var['description'])) {
                        $missingFields[] = 'description';
                    }
                    if (!isset($var['default_value'])) {
                        $missingFields[] = 'default_value';
                    }

                    if (!empty($missingFields)) {
                        App::getInstance(true)->getLogger()->warning(
                            'Skipping variable during online install: missing required fields (' . implode(', ', $missingFields) . '). Variable data: ' . json_encode($var)
                        );
                        ++$skippedVariablesCount;
                        continue;
                    }

                    $variableData = [
                        'spell_id' => $spellId,
                        'name' => trim($var['name']),
                        'description' => $var['description'], // Allow empty string
                        'env_variable' => trim($var['env_variable']),
                        'default_value' => $var['default_value'], // Allow empty string
                        'user_viewable' => isset($var['user_viewable']) ? ($var['user_viewable'] ? 'true' : 'false') : 'true',
                        'user_editable' => isset($var['user_editable']) ? ($var['user_editable'] ? 'true' : 'false') : 'true',
                        'rules' => $var['rules'] ?? '',
                        'field_type' => $var['field_type'] ?? 'text',
                    ];

                    $varId = SpellVariable::createVariable($variableData);
                    if ($varId) {
                        ++$importedVariablesCount;
                    } else {
                        App::getInstance(true)->getLogger()->error(
                            'Failed to create variable during online install: ' . ($var['env_variable'] ?? 'unknown') . '. Variable data: ' . json_encode($var)
                        );
                        ++$skippedVariablesCount;
                    }
                }
            }

            $spell = Spell::getSpellById($spellId);

            if ($skippedVariablesCount > 0) {
                App::getInstance(true)->getLogger()->warning(
                    "Online spell install completed with warnings: {$importedVariablesCount} variables imported, {$skippedVariablesCount} variables skipped. Spell: " . $spell['name']
                );
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'online_install_spell',
                'context' => 'Installed spell from online repository: ' . $spell['name'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(['spell' => $spell], 'Spell installed successfully from online repository', 201);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to install spell from online repository: ' . $e->getMessage(), 500);
        }
    }
}
