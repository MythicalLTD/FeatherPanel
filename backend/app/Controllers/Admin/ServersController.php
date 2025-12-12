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
use App\Chat\Node;
use App\Chat\User;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\Activity;
use App\Chat\Allocation;
use App\Helpers\UUIDUtils;
use App\Chat\SpellVariable;
use App\Chat\ServerActivity;
use App\Chat\ServerDatabase;
use App\Chat\ServerTransfer;
use App\Chat\ServerVariable;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Chat\DatabaseInstance;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Mail\templates\ServerBanned;
use App\Mail\templates\ServerCreated;
use App\Mail\templates\ServerDeleted;
use App\Mail\templates\ServerUnbanned;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Subdomain\SubdomainCleanupService;

#[OA\Schema(
    schema: 'Server',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
        new OA\Property(property: 'uuidShort', type: 'string', description: 'Short server UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Server name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Server description'),
        new OA\Property(property: 'startup', type: 'string', description: 'Server startup command'),
        new OA\Property(property: 'image', type: 'string', description: 'Server Docker image'),
        new OA\Property(property: 'status', type: 'string', description: 'Server status', enum: ['installing', 'install_failed', 'suspended', 'running', 'stopping', 'stopped', 'starting', 'restarting', 'backuping', 'restoring_backup', 'deleting_backup', 'transferring', 'offline']),
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID'),
        new OA\Property(property: 'owner_id', type: 'integer', description: 'Owner user ID'),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory limit in MB'),
        new OA\Property(property: 'swap', type: 'integer', description: 'Swap limit in MB'),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk limit in MB'),
        new OA\Property(property: 'io', type: 'integer', description: 'IO limit'),
        new OA\Property(property: 'cpu', type: 'integer', description: 'CPU limit percentage'),
        new OA\Property(property: 'allocation_id', type: 'integer', description: 'Allocation ID'),
        new OA\Property(property: 'realms_id', type: 'integer', description: 'Realm ID'),
        new OA\Property(property: 'spell_id', type: 'integer', description: 'Spell ID'),
        new OA\Property(property: 'allocation_limit', type: 'integer', nullable: true, description: 'Allocation limit'),
        new OA\Property(property: 'database_limit', type: 'integer', description: 'Database limit'),
        new OA\Property(property: 'backup_limit', type: 'integer', description: 'Backup limit'),
        new OA\Property(property: 'external_id', type: 'string', nullable: true, description: 'External ID'),
        new OA\Property(property: 'threads', type: 'string', nullable: true, description: 'Specific CPU threads this process can run on. Single number, comma list, or ranges like 0,1,3 or 0-1,3'),
        new OA\Property(property: 'skip_scripts', type: 'boolean', description: 'Skip scripts flag'),
        new OA\Property(property: 'oom_killer', type: 'boolean', description: 'Whether the OOM killer is enabled (true) or disabled (false)'),
        new OA\Property(property: 'suspended', type: 'boolean', description: 'Suspended flag'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'ServerPagination',
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
    schema: 'ServerCreate',
    type: 'object',
    required: ['node_id', 'name', 'owner_id', 'memory', 'swap', 'disk', 'io', 'cpu', 'allocation_id', 'realms_id', 'spell_id', 'startup', 'image'],
    properties: [
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID', minimum: 1),
        new OA\Property(property: 'name', type: 'string', description: 'Server name', minLength: 1, maxLength: 191),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Server description (optional)', maxLength: 65535),
        new OA\Property(property: 'owner_id', type: 'integer', description: 'Owner user ID', minimum: 1),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory limit in MB', minimum: 128),
        new OA\Property(property: 'swap', type: 'integer', description: 'Swap limit in MB (-1 = unlimited, 0 = disabled)', minimum: -1),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk limit in MB', minimum: 1024),
        new OA\Property(property: 'io', type: 'integer', description: 'IO limit', minimum: 10),
        new OA\Property(property: 'cpu', type: 'integer', description: 'CPU limit percentage', minimum: 10),
        new OA\Property(property: 'allocation_id', type: 'integer', description: 'Allocation ID', minimum: 1),
        new OA\Property(property: 'realms_id', type: 'integer', description: 'Realm ID', minimum: 1),
        new OA\Property(property: 'spell_id', type: 'integer', description: 'Spell ID', minimum: 1),
        new OA\Property(property: 'startup', type: 'string', description: 'Server startup command', minLength: 1, maxLength: 65535),
        new OA\Property(property: 'image', type: 'string', description: 'Server Docker image', minLength: 1, maxLength: 191),
        new OA\Property(property: 'status', type: 'string', description: 'Server status', enum: ['installing', 'install_failed', 'suspended', 'running', 'stopping', 'stopped', 'starting', 'restarting', 'backuping', 'restoring_backup', 'deleting_backup', 'transferring', 'offline']),
        new OA\Property(property: 'allocation_limit', type: 'integer', nullable: true, description: 'Allocation limit'),
        new OA\Property(property: 'database_limit', type: 'integer', description: 'Database limit', minimum: 0),
        new OA\Property(property: 'backup_limit', type: 'integer', description: 'Backup limit', minimum: 0),
        new OA\Property(property: 'external_id', type: 'string', nullable: true, description: 'External ID', maxLength: 191),
        new OA\Property(property: 'threads', type: 'string', nullable: true, description: 'Specific CPU threads this process can run on. Single number, comma list, or ranges like 0,1,3 or 0-1,3'),
        new OA\Property(property: 'skip_scripts', type: 'boolean', description: 'Skip scripts flag'),
        new OA\Property(property: 'oom_disabled', type: 'boolean', description: 'OOM disabled flag'),
        new OA\Property(property: 'variables', type: 'object', description: 'Server variables as key-value pairs'),
    ]
)]
#[OA\Schema(
    schema: 'ServerUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID', minimum: 1),
        new OA\Property(property: 'name', type: 'string', description: 'Server name', minLength: 1, maxLength: 191),
        new OA\Property(property: 'description', type: 'string', description: 'Server description', maxLength: 65535),
        new OA\Property(property: 'owner_id', type: 'integer', description: 'Owner user ID', minimum: 1),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory limit in MB', minimum: 128),
        new OA\Property(property: 'swap', type: 'integer', description: 'Swap limit in MB (-1 = unlimited, 0 = disabled)', minimum: -1),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk limit in MB', minimum: 1024),
        new OA\Property(property: 'io', type: 'integer', description: 'IO limit', minimum: 10),
        new OA\Property(property: 'cpu', type: 'integer', description: 'CPU limit percentage', minimum: 10),
        new OA\Property(property: 'allocation_id', type: 'integer', description: 'Allocation ID', minimum: 1),
        new OA\Property(property: 'realms_id', type: 'integer', description: 'Realm ID', minimum: 1),
        new OA\Property(property: 'spell_id', type: 'integer', description: 'Spell ID', minimum: 1),
        new OA\Property(property: 'startup', type: 'string', description: 'Server startup command', minLength: 1, maxLength: 65535),
        new OA\Property(property: 'image', type: 'string', description: 'Server Docker image', minLength: 1, maxLength: 191),
        new OA\Property(property: 'status', type: 'string', description: 'Server status', enum: ['installing', 'install_failed', 'suspended', 'running', 'stopping', 'stopped', 'starting', 'restarting', 'backuping', 'restoring_backup', 'deleting_backup', 'transferring', 'offline']),
        new OA\Property(property: 'allocation_limit', type: 'integer', nullable: true, description: 'Allocation limit'),
        new OA\Property(property: 'database_limit', type: 'integer', description: 'Database limit', minimum: 0),
        new OA\Property(property: 'backup_limit', type: 'integer', description: 'Backup limit', minimum: 0),
        new OA\Property(property: 'external_id', type: 'string', nullable: true, description: 'External ID', maxLength: 191),
        new OA\Property(property: 'threads', type: 'string', nullable: true, description: 'Specific CPU threads this process can run on. Single number, comma list, or ranges like 0,1,3 or 0-1,3'),
        new OA\Property(property: 'skip_scripts', type: 'boolean', description: 'Skip scripts flag'),
        new OA\Property(property: 'oom_disabled', type: 'boolean', description: 'OOM disabled flag'),
        new OA\Property(property: 'variables', type: 'object', description: 'Server variables as key-value pairs'),
    ]
)]
#[OA\Schema(
    schema: 'ServerVariable',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Variable ID'),
        new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'variable_id', type: 'integer', description: 'Spell variable ID'),
        new OA\Property(property: 'variable_value', type: 'string', description: 'Variable value'),
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
    schema: 'ServerSFTP',
    type: 'object',
    properties: [
        new OA\Property(property: 'host', type: 'string', description: 'SFTP host'),
        new OA\Property(property: 'port', type: 'integer', description: 'SFTP port'),
        new OA\Property(property: 'username', type: 'string', description: 'SFTP username'),
        new OA\Property(property: 'password', type: 'string', description: 'SFTP password placeholder'),
        new OA\Property(property: 'url', type: 'string', description: 'SFTP connection URL'),
    ]
)]
class ServersController
{
    #[OA\Get(
        path: '/api/admin/servers',
        summary: 'Get all servers',
        description: 'Retrieve a paginated list of all servers with optional filtering by owner, node, realm, spell, and search functionality.',
        tags: ['Admin - Servers'],
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
                description: 'Search term to filter servers by name or description',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'owner_id',
                in: 'query',
                description: 'Filter servers by owner ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'node_id',
                in: 'query',
                description: 'Filter servers by node ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'realm_id',
                in: 'query',
                description: 'Filter servers by realm ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'spell_id',
                in: 'query',
                description: 'Filter servers by spell ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Servers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/Server')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/ServerPagination'),
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
        $ownerId = $request->query->get('owner_id');
        $nodeId = $request->query->get('node_id');
        $realmId = $request->query->get('realm_id');
        $spellId = $request->query->get('spell_id');

        $ownerId = $ownerId ? (int) $ownerId : null;
        $nodeId = $nodeId ? (int) $nodeId : null;
        $realmId = $realmId ? (int) $realmId : null;
        $spellId = $spellId ? (int) $spellId : null;

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $servers = Server::searchServers(
            page: $page,
            limit: $limit,
            search: $search,
            ownerId: $ownerId,
            nodeId: $nodeId,
            realmId: $realmId,
            spellId: $spellId
        );

        // Add related data to each server
        foreach ($servers as &$server) {
            $server['owner'] = User::getUserById($server['owner_id']);
            $server['node'] = Node::getNodeById($server['node_id']);
            $server['realm'] = Realm::getById($server['realms_id']);
            $server['spell'] = Spell::getSpellById($server['spell_id']);
            $server['allocation'] = Allocation::getAllocationById($server['allocation_id']);

            // Remove sensitive data from owner
            if ($server['owner']) {
                unset($server['owner']['password'], $server['owner']['remember_token'], $server['owner']['two_fa_key']);
            }
        }

        $total = Server::getCount($search, $ownerId, $nodeId, $realmId, $spellId);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'servers' => $servers,
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
                'has_results' => count($servers) > 0,
            ],
        ], 'Servers fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/servers/{id}',
        summary: 'Get server by ID',
        description: 'Retrieve a specific server by its ID with complete details including related data, variables, SFTP information, and recent activity.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'id', type: 'integer', description: 'Server ID'),
                        new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
                        new OA\Property(property: 'uuidShort', type: 'string', description: 'Short server UUID'),
                        new OA\Property(property: 'name', type: 'string', description: 'Server name'),
                        new OA\Property(property: 'description', type: 'string', description: 'Server description'),
                        new OA\Property(property: 'startup', type: 'string', description: 'Server startup command'),
                        new OA\Property(property: 'image', type: 'string', description: 'Server Docker image'),
                        new OA\Property(property: 'status', type: 'string', description: 'Server status'),
                        new OA\Property(property: 'owner', type: 'object', description: 'Server owner information'),
                        new OA\Property(property: 'node', type: 'object', description: 'Node information'),
                        new OA\Property(property: 'realm', type: 'object', description: 'Realm information'),
                        new OA\Property(property: 'spell', type: 'object', description: 'Spell information'),
                        new OA\Property(property: 'allocation', type: 'object', description: 'Allocation information'),
                        new OA\Property(property: 'variables', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerVariable'), description: 'Server variables'),
                        new OA\Property(property: 'sftp', ref: '#/components/schemas/ServerSFTP', description: 'SFTP connection information'),
                        new OA\Property(property: 'activity', type: 'array', items: new OA\Items(type: 'object'), description: 'Recent server activity'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get related data
        $server['owner'] = User::getUserById($server['owner_id']);
        $server['node'] = Node::getNodeById($server['node_id']);
        $server['realm'] = Realm::getById($server['realms_id']);
        $server['spell'] = Spell::getSpellById($server['spell_id']);
        $server['allocation'] = Allocation::getAllocationById($server['allocation_id']);
        $server['activity'] = ServerActivity::getActivitiesByServerId($server['id']);
        $server['activity'] = array_reverse(array_slice($server['activity'], 0, 50));

        // Get server variables and spell variables
        $serverVariables = ServerVariable::getServerVariablesByServerId($server['id']);
        $spellVariables = SpellVariable::getVariablesBySpellId($server['spell_id']);

        // Create a map of spell variables by their ID for easy lookup
        $spellVariableMap = [];
        foreach ($spellVariables as $spellVar) {
            $spellVariableMap[$spellVar['id']] = $spellVar;
        }

        // Merge server variables with their corresponding spell variable definitions
        $mergedVariables = [];
        foreach ($serverVariables as $serverVar) {
            $variableId = $serverVar['variable_id'];
            if (isset($spellVariableMap[$variableId])) {
                $spellVar = $spellVariableMap[$variableId];
                $mergedVariables[] = [
                    'id' => $serverVar['id'],
                    'server_id' => $serverVar['server_id'],
                    'variable_id' => $variableId,
                    'variable_value' => $serverVar['variable_value'],
                    'name' => $spellVar['name'],
                    'description' => $spellVar['description'],
                    'env_variable' => $spellVar['env_variable'],
                    'default_value' => $spellVar['default_value'],
                    'user_viewable' => $spellVar['user_viewable'],
                    'user_editable' => $spellVar['user_editable'],
                    'rules' => $spellVar['rules'],
                    'field_type' => $spellVar['field_type'],
                    'created_at' => $serverVar['created_at'],
                    'updated_at' => $serverVar['updated_at'],
                ];
            }
        }

        $server['variables'] = $mergedVariables;

        // Add SFTP information (similar to user controller)
        $sftp = [
            'host' => $server['node']['fqdn'],
            'port' => $server['node']['daemonSFTP'] ?? 2022,
            'username' => strtolower($server['owner']['username']) . '.' . $server['uuidShort'],
            'password' => '#AUTH_PASSWORD#',
            'url' => 'sftp://' . $server['node']['fqdn'] . ':' . ($server['node']['daemonSFTP'] ?? 2022) . '/' . strtolower($server['owner']['username']) . '.' . $server['uuidShort'],
        ];
        $server['sftp'] = $sftp;

        // Remove sensitive data from related objects
        if ($server['owner']) {
            unset($server['owner']['password'], $server['owner']['remember_token'], $server['owner']['two_fa_key']);
        }

        // Remove sensitive node data
        unset(
            $server['node']['memory'],
            $server['node']['memory_overallocate'],
            $server['node']['disk'],
            $server['node']['disk_overallocate'],
            $server['node']['upload_size'],
            $server['node']['daemon_token_id'],
            $server['node']['daemon_token'],
            $server['node']['daemonListen'],
            $server['node']['daemonSFTP'],
            $server['node']['daemonBase']
        );

        return ApiResponse::success($server, 'Server fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/servers',
        summary: 'Create new server',
        description: 'Create a new server with comprehensive validation, Wings integration, variable handling, and email notifications.',
        tags: ['Admin - Servers'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ServerCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Server created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'server_id', type: 'integer', description: 'ID of the created server'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, invalid data types, validation errors, invalid foreign keys, or allocation in use'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User, node, allocation, realm, or spell not found'),
            new OA\Response(response: 422, description: 'Unprocessable Entity - Missing required spell variables or Wings validation failed'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create server, Wings error, or email sending failed'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $user = User::getUserById($data['owner_id']);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $config = App::getInstance(true)->getConfig();
        // Required fields for server creation
        $requiredFields = [
            'node_id',
            'name',
            'owner_id',
            'memory',
            'swap',
            'disk',
            'io',
            'cpu',
            'allocation_id',
            'realms_id',
            'spell_id',
            'startup',
            'image',
        ];

        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Validate data types
        // Fields that must be positive integers (> 0)
        $strictPositiveFields = ['node_id', 'owner_id', 'allocation_id', 'realms_id', 'spell_id', 'io'];
        foreach ($strictPositiveFields as $field) {
            if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a positive integer', 'INVALID_DATA_TYPE', 400);
            }
        }

        // Fields that can be 0 (for unlimited) or positive integers
        // Numeric validations per field
        // memory, disk, cpu must be >= 0 (0 = unlimited), swap may be -1 (unlimited) or 0 (disabled) or >0 (limited)
        $nonNegativeFields = ['memory', 'disk', 'cpu'];
        foreach ($nonNegativeFields as $field) {
            if (!is_numeric($data[$field]) || (int) $data[$field] < 0) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a non-negative integer (0 for unlimited)', 'INVALID_DATA_TYPE', 400);
            }
        }
        if (!is_numeric($data['swap']) || (int) $data['swap'] < -1) {
            return ApiResponse::error('Swap must be -1 (unlimited), 0 (disabled), or a positive integer', 'INVALID_DATA_TYPE', 400);
        }

        // Validate string fields (description is optional)
        $requiredStringFields = ['name', 'startup', 'image'];
        foreach ($requiredStringFields as $field) {
            if (!is_string($data[$field]) || trim($data[$field]) === '') {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a non-empty string', 'INVALID_DATA_TYPE', 400);
            }
        }

        // Description is optional, but if provided must be a string
        if (isset($data['description']) && !is_string($data['description'])) {
            return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE', 400);
        }

        // Validate field lengths
        $lengthRules = [
            'name' => [1, 191],
            'startup' => [1, 65535],
            'image' => [1, 191],
        ];

        foreach ($lengthRules as $field => [$min, $max]) {
            $len = strlen($data[$field]);
            if ($len < $min) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", 'INVALID_DATA_LENGTH', 400);
            }
            if ($len > $max) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", 'INVALID_DATA_LENGTH', 400);
            }
        }

        // Description is optional, but if provided validate length
        if (isset($data['description']) && $data['description'] !== null && $data['description'] !== '') {
            $descLen = strlen($data['description']);
            if ($descLen > 65535) {
                return ApiResponse::error('Description must be less than 65535 characters long', 'INVALID_DATA_LENGTH', 400);
            }
        }

        // Validate resource limits - also allow 0 since its unlimited
        if ($data['memory'] !== 0 && ($data['memory'] < 128 || $data['memory'] > 1048576)) {
            return ApiResponse::error('Memory must be between 128 MB and 1TB', 'INVALID_MEMORY_LIMIT', 400);
        }
        if ($data['swap'] !== 0 && $data['swap'] !== -1 && $data['swap'] > 1048576) {
            return ApiResponse::error('Swap must be -1 (unlimited), 0 (disabled), or between 1 MB and 1TB', 'INVALID_SWAP_LIMIT', 400);
        }
        if ($data['disk'] !== 0 && ($data['disk'] < 128 || $data['disk'] > 10485760)) {
            return ApiResponse::error('Disk must be between 128 MB and 10TB', 'INVALID_DISK_LIMIT', 400);
        }
        if ($data['io'] < 10 || $data['io'] > 1000) {
            return ApiResponse::error('IO must be between 10 and 1000', 'INVALID_IO_LIMIT', 400);
        }
        if ($data['cpu'] !== 0 && $data['cpu'] > 1000000) {
            return ApiResponse::error('CPU must be between 0 and 1,000,000', 'INVALID_CPU_LIMIT', 400);
        }

        // Validate foreign key relationships
        if (!User::getUserById($data['owner_id'])) {
            return ApiResponse::error('Invalid owner_id: User not found', 'INVALID_OWNER_ID', 400);
        }
        $nodeInfo = Node::getNodeById($data['node_id']);
        if (!$nodeInfo) {
            return ApiResponse::error('Invalid node_id: Node not found', 'INVALID_NODE_ID', 400);
        }
        if (!Allocation::getAllocationById($data['allocation_id'])) {
            return ApiResponse::error('Invalid allocation_id: Allocation not found', 'INVALID_ALLOCATION_ID', 400);
        }
        if (!Realm::getById($data['realms_id'])) {
            return ApiResponse::error('Invalid realms_id: Realm not found', 'INVALID_REALM_ID', 400);
        }
        if (!Spell::getSpellById($data['spell_id'])) {
            return ApiResponse::error('Invalid spell_id: Spell not found', 'INVALID_SPELL_ID', 400);
        }

        // Check if allocation is already in use
        $existingServer = Server::getServerByAllocationId($data['allocation_id']);
        if ($existingServer) {
            return ApiResponse::error('Allocation is already in use by another server', 'ALLOCATION_IN_USE', 400);
        }

        // Generate UUIDs
        $data['uuid'] = UUIDUtils::generateV4();
        $data['uuidShort'] = substr($data['uuid'], 0, 8);

        // Set default values for optional fields
        $data['description'] = isset($data['description']) && $data['description'] !== '' ? $data['description'] : null;
        $data['status'] = $data['status'] ?? 'installing';
        $data['skip_scripts'] = isset($data['skip_scripts']) ? (int) $data['skip_scripts'] : 0;
        // Map oom_killer -> oom_disabled for DB (oom_disabled true when killer is false)
        if (array_key_exists('oom_killer', $data)) {
            $data['oom_disabled'] = $data['oom_killer'] ? 0 : 1;
            unset($data['oom_killer']);
        } else {
            $data['oom_disabled'] = isset($data['oom_disabled']) ? (int) $data['oom_disabled'] : 0;
        }
        $data['allocation_limit'] = $data['allocation_limit'] ?? null;
        $data['database_limit'] = isset($data['database_limit']) ? (int) $data['database_limit'] : 0;
        $data['backup_limit'] = isset($data['backup_limit']) ? (int) $data['backup_limit'] : 0;
        $data['external_id'] = $data['external_id'] ?? null;
        $data['threads'] = $data['threads'] ?? null;

        // Remove variables from data before creating server (variables are handled separately)
        $serverData = $data;
        unset($serverData['variables']);

        $serverId = Server::createServer($serverData);
        if (!$serverId) {
            return ApiResponse::error('Failed to create server', 'FAILED_TO_CREATE_SERVER', 500);
        }

        // Claim the allocation for this server
        $allocationClaimed = Allocation::assignToServer($data['allocation_id'], $serverId);
        if (!$allocationClaimed) {
            App::getInstance(true)->getLogger()->error('Failed to claim allocation for server ID: ' . $serverId);
            // Note: We don't fail the server creation, but log the error
        }

        // Validate required spell variables
        $spellVariables = SpellVariable::getVariablesBySpellId($data['spell_id']);
        $requiredVariables = [];
        $providedVariables = isset($data['variables']) ? array_keys($data['variables']) : [];

        foreach ($spellVariables as $spellVariable) {
            if (strpos($spellVariable['rules'], 'required') !== false) {
                $requiredVariables[] = $spellVariable['env_variable'];
            }
        }

        $missingRequiredVariables = array_diff($requiredVariables, $providedVariables);
        if (!empty($missingRequiredVariables)) {
            Server::hardDeleteServer($serverId);

            return ApiResponse::error('Missing required spell variables: ' . implode(', ', $missingRequiredVariables), 'MISSING_REQUIRED_VARIABLES', 400);
        }

        // Handle server variables if provided
        if (isset($data['variables']) && is_array($data['variables']) && !empty($data['variables'])) {
            App::getInstance(true)->getLogger()->debug('Processing server variables for server ID: ' . $serverId . ', variables: ' . json_encode($data['variables']));

            $variables = [];
            foreach ($data['variables'] as $envVariable => $value) {
                // Find the spell variable by env_variable
                $spellVariable = null;
                foreach ($spellVariables as $sv) {
                    if ($sv['env_variable'] === $envVariable) {
                        $spellVariable = $sv;
                        break;
                    }
                }

                if ($spellVariable) {
                    // Use the provided value or fall back to default value
                    // Note: Check for null/empty string, not empty() because "0" is a valid value
                    $effectiveValue = ($value !== null && $value !== '' && trim($value) !== '') ? $value : $spellVariable['default_value'];

                    // Validate required variables have non-empty values (allow default values)
                    if (strpos($spellVariable['rules'], 'required') !== false) {
                        // Check for null or empty string, but allow "0" as a valid value
                        if ($effectiveValue === null || $effectiveValue === '' || trim($effectiveValue) === '') {
                            Server::hardDeleteServer($serverId);

                            return ApiResponse::error('Required variable ' . $spellVariable['name'] . ' cannot be empty', 'REQUIRED_VARIABLE_EMPTY', 400);
                        }
                    }

                    $variables[] = [
                        'variable_id' => $spellVariable['id'],
                        'variable_value' => (string) $effectiveValue,
                    ];
                    App::getInstance(true)->getLogger()->debug('Found spell variable for ' . $envVariable . ': ID=' . $spellVariable['id'] . ', value=' . $effectiveValue);
                } else {
                    App::getInstance(true)->getLogger()->warning('Spell variable not found for env_variable: ' . $envVariable);
                }
            }

            if (!empty($variables)) {
                App::getInstance(true)->getLogger()->debug('Creating ' . count($variables) . ' server variables for server ID: ' . $serverId);
                $variablesCreated = ServerVariable::createOrUpdateServerVariables($serverId, $variables);
                if (!$variablesCreated) {
                    // Log the error but don't fail the server creation
                    App::getInstance(true)->getLogger()->error('Failed to create server variables for server ID: ' . $serverId);
                } else {
                    App::getInstance(true)->getLogger()->debug('Successfully created server variables for server ID: ' . $serverId);
                }
            } else {
                App::getInstance(true)->getLogger()->debug('No valid server variables to create for server ID: ' . $serverId);
            }
        } else {
            // Check if there are required variables but no variables provided
            if (!empty($requiredVariables)) {
                Server::hardDeleteServer($serverId);

                return ApiResponse::error('Missing required spell variables: ' . implode(', ', $requiredVariables), 'MISSING_REQUIRED_VARIABLES', 400);
            }
            App::getInstance(true)->getLogger()->info('No server variables provided for server ID: ' . $serverId);
        }

        $scheme = $nodeInfo['scheme'];
        $host = $nodeInfo['fqdn'];
        $port = $nodeInfo['daemonListen'];
        $token = $nodeInfo['daemon_token'];

        $timeout = (int) 30;

        try {
            $wings = new Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            $wingsData = [
                'uuid' => $data['uuid'],
                'start_on_completion' => true,
            ];

            $response = $wings->getServer()->createServer($wingsData);
            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($response->getStatusCode() === 400) {
                    Server::hardDeleteServer($serverId);

                    return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
                } elseif ($response->getStatusCode() === 401) {
                    Server::hardDeleteServer($serverId);

                    return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
                } elseif ($response->getStatusCode() === 403) {
                    Server::hardDeleteServer($serverId);

                    return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
                } elseif ($response->getStatusCode() === 422) {
                    Server::hardDeleteServer($serverId);

                    return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
                }
                Server::hardDeleteServer($serverId);

                return ApiResponse::error('Failed to create server in Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to create server in Wings: ' . $e->getMessage());
            Server::hardDeleteServer($serverId);

            return ApiResponse::error('Failed to create server in Wings: ' . $e->getMessage(), 'FAILED_TO_CREATE_SERVER_IN_WINGS', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'create_server',
            'context' => 'Created a new server ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerCreated(),
                [
                    'server_id' => $serverId,
                    'server_data' => $data,
                    'created_by' => $request->get('user'),
                ]
            );
        }

        try {
            $allocation = Allocation::getAllocationById($data['allocation_id']);
            ServerCreated::send([
                'email' => $user['email'],
                'subject' => 'New server created on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'server_name' => $data['name'],
                'server_ip' => $allocation['ip'] . ':' . $allocation['port'],
                'panel_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems') . '/dashboard',
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send server created email: ' . $e->getMessage());

            return ApiResponse::error('Failed to send server created email: ' . $e->getMessage(), 'FAILED_TO_SEND_SERVER_CREATED_EMAIL', 500);
        }

        return ApiResponse::success(['server_id' => $serverId], 'Server created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/servers/{id}',
        summary: 'Update server',
        description: 'Update an existing server with comprehensive validation, Wings synchronization, variable handling, and allocation management.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ServerUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'server', type: 'object', properties: [
                            new OA\Property(property: 'id', type: 'integer', description: 'Server ID'),
                            new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
                            new OA\Property(property: 'uuidShort', type: 'string', description: 'Short server UUID'),
                            new OA\Property(property: 'name', type: 'string', description: 'Server name'),
                            new OA\Property(property: 'description', type: 'string', description: 'Server description'),
                            new OA\Property(property: 'startup', type: 'string', description: 'Server startup command'),
                            new OA\Property(property: 'image', type: 'string', description: 'Server Docker image'),
                            new OA\Property(property: 'status', type: 'string', description: 'Server status'),
                            new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, invalid data types, validation errors, invalid foreign keys, or allocation in use'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update server, Wings sync error, or variables update failed'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Prevent updating primary keys
        unset($data['id'], $data['uuid'], $data['uuidShort']);

        // Prevent direct modification of node_id - use server transfer instead
        if (isset($data['node_id'])) {
            return ApiResponse::error('Cannot change node_id directly. Use the server transfer feature to move servers between nodes.', 'NODE_CHANGE_NOT_ALLOWED', 400);
        }

        // Validate data types for numeric fields
        $numericFields = ['node_id', 'owner_id', 'memory', 'swap', 'disk', 'io', 'cpu', 'allocation_id', 'realms_id', 'spell_id', 'allocation_limit', 'database_limit', 'backup_limit'];
        foreach ($data as $field => $value) {
            if (in_array($field, $numericFields)) {
                if ($field === 'swap') {
                    if (!is_numeric($value) || (int) $value < -1) {
                        return ApiResponse::error('Swap must be -1 (unlimited), 0 (disabled), or a positive integer', 'INVALID_DATA_TYPE', 400);
                    }
                } else {
                    if (!is_numeric($value) || (int) $value < 0) {
                        return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a non-negative integer', 'INVALID_DATA_TYPE', 400);
                    }
                }
            }
        }

        // Validate threads if provided
        if (array_key_exists('threads', $data)) {
            if ($data['threads'] === null || (is_string($data['threads']) && trim($data['threads']) === '')) {
                // ok - treated as null/unset later
            } elseif (!is_string($data['threads'])) {
                return ApiResponse::error('Threads must be a string (e.g. "0,1,3" or "0-1,3")', 'INVALID_DATA_TYPE', 400);
            } else {
                $t = trim((string) $data['threads']);
                if (!preg_match('/^\s*(\d+|\d+-\d+)(\s*,\s*(\d+|\d+-\d+))*\s*$/', $t)) {
                    return ApiResponse::error('Invalid threads format. Use numbers, commas, and ranges like 0,1,3 or 0-1,3.', 'INVALID_THREADS_FORMAT', 400);
                }
            }
        }

        // Validate string fields
        $stringFields = ['name', 'description', 'startup', 'image', 'external_id', 'status'];
        foreach ($data as $field => $value) {
            if (in_array($field, $stringFields) && isset($data[$field])) {
                // Description can be null or empty string (both are allowed)
                if ($field === 'description') {
                    if ($value === null) {
                        // Null is allowed, skip further validation
                        continue;
                    }
                    if (!is_string($value)) {
                        return ApiResponse::error('Description must be a string or null', 'INVALID_DATA_TYPE', 400);
                    }
                    // Convert empty string to null
                    if (trim($value) === '') {
                        $data[$field] = null;
                    }
                    continue;
                }

                // For other string fields, must be a string
                if (!is_string($value)) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
                }
                if (trim($value) === '' && in_array($field, ['name', 'startup', 'image'])) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' cannot be empty', 'INVALID_DATA_TYPE', 400);
                }
            }
        }

        // Validate boolean fields
        $booleanFields = ['skip_scripts', 'skip_zerotrust', 'oom_disabled', 'oom_killer'];
        foreach ($data as $field => $value) {
            if (in_array($field, $booleanFields) && isset($data[$field])) {
                if (!is_bool($value) && !in_array($value, [0, 1, '0', '1'], true)) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a boolean value', 'INVALID_DATA_TYPE', 400);
                }
            }
        }

        // Validate status field if provided
        if (isset($data['status'])) {
            $validStatuses = ['installing', 'install_failed', 'suspended', 'running', 'stopping', 'stopped', 'starting', 'restarting', 'backuping', 'restoring_backup', 'deleting_backup', 'transferring', 'offline'];
            if (!in_array($data['status'], $validStatuses, true)) {
                return ApiResponse::error('Invalid status value. Must be one of: ' . implode(', ', $validStatuses), 'INVALID_STATUS', 400);
            }
        }

        // Validate field lengths
        $lengthRules = [
            'name' => [1, 191],
            'description' => [0, 65535],
            'startup' => [1, 65535],
            'image' => [1, 191],
            'external_id' => [0, 191],
        ];

        foreach ($data as $field => $value) {
            if (isset($lengthRules[$field])) {
                // Skip validation for null values (description can be null)
                if ($value === null) {
                    continue;
                }
                $len = strlen($value);
                [$min, $max] = $lengthRules[$field];
                if ($len < $min) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", 'INVALID_DATA_LENGTH', 400);
                }
                if ($len > $max) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", 'INVALID_DATA_LENGTH', 400);
                }
            }
        }

        // Validate resource limits (also allow 0 for unlimited)
        if (isset($data['memory']) && $data['memory'] !== 0 && ($data['memory'] < 128 || $data['memory'] > 1048576)) {
            return ApiResponse::error('Memory must be between 128 MB and 1TB', 'INVALID_MEMORY_LIMIT', 400);
        }
        if (isset($data['swap']) && $data['swap'] !== 0 && $data['swap'] !== -1 && $data['swap'] > 1048576) {
            return ApiResponse::error('Swap must be -1 (unlimited), 0 (disabled), or between 1 MB and 1TB', 'INVALID_SWAP_LIMIT', 400);
        }
        if (isset($data['disk']) && $data['disk'] !== 0 && ($data['disk'] < 128 || $data['disk'] > 10485760)) {
            return ApiResponse::error('Disk must be between 128 MB and 10TB', 'INVALID_DISK_LIMIT', 400);
        }
        if (isset($data['io']) && ($data['io'] < 10 || $data['io'] > 1000)) {
            return ApiResponse::error('IO must be between 10 and 1000', 'INVALID_IO_LIMIT', 400);
        }
        if (isset($data['cpu']) && $data['cpu'] !== 0 && $data['cpu'] > 1000000) {
            return ApiResponse::error('CPU must be between 0 and 1,000,000', 'INVALID_CPU_LIMIT', 400);
        }

        // Validate foreign key relationships if being updated
        if (isset($data['owner_id']) && !User::getUserById($data['owner_id'])) {
            return ApiResponse::error('Invalid owner_id: User not found', 'INVALID_OWNER_ID', 400);
        }
        if (isset($data['node_id']) && !Node::getNodeById($data['node_id'])) {
            return ApiResponse::error('Invalid node_id: Node not found', 'INVALID_NODE_ID', 400);
        }
        if (isset($data['allocation_id'])) {
            if (!Allocation::getAllocationById($data['allocation_id'])) {
                return ApiResponse::error('Invalid allocation_id: Allocation not found', 'INVALID_ALLOCATION_ID', 400);
            }
            // Check if the new allocation is already in use by another server
            $existingServer = Server::getServerByAllocationId($data['allocation_id']);
            if ($existingServer && $existingServer['id'] !== $id) {
                return ApiResponse::error('Allocation is already in use by another server', 'ALLOCATION_IN_USE', 400);
            }
        }
        if (isset($data['realms_id']) && !Realm::getById($data['realms_id'])) {
            return ApiResponse::error('Invalid realms_id: Realm not found', 'INVALID_REALM_ID', 400);
        }
        if (isset($data['spell_id']) && !Spell::getSpellById($data['spell_id'])) {
            return ApiResponse::error('Invalid spell_id: Spell not found', 'INVALID_SPELL_ID', 400);
        }

        // Check if spell is changing
        $spellChanged = false;
        $oldSpellId = (int) $server['spell_id'];
        if (isset($data['spell_id'])) {
            $newSpellId = (int) $data['spell_id'];
            if ($newSpellId !== $oldSpellId && $newSpellId > 0) {
                $spellChanged = true;

                // Validate spell exists
                $newSpell = Spell::getSpellById($newSpellId);
                if (!$newSpell) {
                    return ApiResponse::error('Invalid spell_id: Spell not found', 'INVALID_SPELL_ID', 404);
                }

                // Update realm_id to match the new spell's realm (allow cross-realm spell changes)
                $newRealmId = (int) $newSpell['realm_id'];
                if ($newRealmId !== (int) $server['realms_id']) {
                    $data['realms_id'] = $newRealmId;
                }
            }
        }

        // Handle variables if provided (similar to user controller)
        $variablesPayload = null;
        if (isset($data['variables'])) {
            if (!is_array($data['variables'])) {
                return ApiResponse::error('Invalid variables payload', 'INVALID_VARIABLES', 400);
            }

            // Build a map of spell env_variable => id for the active/new spell
            $activeSpellId = isset($data['spell_id']) ? (int) $data['spell_id'] : (int) $server['spell_id'];
            $spellVars = SpellVariable::getVariablesBySpellId($activeSpellId);
            $envToId = [];
            foreach ($spellVars as $sv) {
                $envToId[$sv['env_variable']] = (int) $sv['id'];
            }

            $variablesPayload = [];

            // Two accepted formats:
            // 1) Array of { variable_id, variable_value }
            // 2) Associative map of env_variable => value
            $looksLikeArrayFormat = !empty($data['variables']) && isset($data['variables'][0]) && is_array($data['variables'][0]) && (isset($data['variables'][0]['variable_id']) || isset($data['variables'][0]['variable_value']));

            if ($looksLikeArrayFormat) {
                foreach ($data['variables'] as $item) {
                    if (is_array($item) && isset($item['variable_id']) && array_key_exists('variable_value', $item)) {
                        $varId = (int) $item['variable_id'];
                        $varVal = (string) $item['variable_value'];
                        if ($varId <= 0) {
                            return ApiResponse::error('Invalid variable_id in variables payload', 'INVALID_VARIABLE_ID', 400);
                        }
                        $variablesPayload[] = [
                            'variable_id' => $varId,
                            'variable_value' => $varVal,
                        ];
                    } else {
                        return ApiResponse::error('Invalid variables item format', 'INVALID_VARIABLE_ITEM', 400);
                    }
                }
            } else {
                // Treat as env map format
                foreach ($data['variables'] as $env => $value) {
                    if (!is_string($env)) {
                        return ApiResponse::error('Invalid variables map: env_variable keys must be strings', 'INVALID_VARIABLES_MAP', 400);
                    }
                    if (!array_key_exists($env, $envToId)) {
                        // Skip unknown env variables silently (or log) rather than failing the whole request
                        continue;
                    }
                    $variablesPayload[] = [
                        'variable_id' => $envToId[$env],
                        'variable_value' => (string) $value,
                    ];
                }
            }
        }

        // Update the server fields (exclude variables from direct update payload)
        $serverUpdateData = $data;
        unset($serverUpdateData['variables']);

        // Map oom_killer to oom_disabled for DB
        if (array_key_exists('oom_killer', $serverUpdateData)) {
            $serverUpdateData['oom_disabled'] = ($serverUpdateData['oom_killer'] ? 0 : 1);
            unset($serverUpdateData['oom_killer']);
        }

        // Normalize threads: empty string -> null (leave string if provided)
        if (array_key_exists('threads', $serverUpdateData)) {
            if ($serverUpdateData['threads'] === null) {
                // keep null
            } elseif (is_string($serverUpdateData['threads']) && trim($serverUpdateData['threads']) === '') {
                $serverUpdateData['threads'] = null;
            }
        }

        // Handle spell change: delete old variables and create new ones (before updating server)
        if ($spellChanged) {
            // Delete all old server variables
            $deleted = ServerVariable::deleteServerVariablesByServerId((int) $id);
            if (!$deleted) {
                // Log but don't fail - variables might not exist
                App::getInstance(true)->getLogger()->warning('Failed to delete old variables for server ID: ' . $id);
            }

            // Get new spell variables
            $newSpellId = (int) $data['spell_id'];
            $newSpell = Spell::getSpellById($newSpellId);

            // Update startup command from new spell if not explicitly provided
            if ($newSpell) {
                if (!isset($data['startup']) && !empty($newSpell['startup'])) {
                    $serverUpdateData['startup'] = $newSpell['startup'];
                }
                // Auto-select first Docker image if not provided and available
                if (!isset($data['image']) && !empty($newSpell['docker_images'])) {
                    try {
                        $dockerImages = json_decode($newSpell['docker_images'], true);
                        if (is_array($dockerImages) && !empty($dockerImages)) {
                            $imageArray = array_values($dockerImages);
                            if (!empty($imageArray[0])) {
                                $serverUpdateData['image'] = $imageArray[0];
                            }
                        }
                    } catch (\Exception $e) {
                        App::getInstance(true)->getLogger()->warning('Failed to parse docker_images for auto-selection: ' . $e->getMessage());
                    }
                }
            }

            $newSpellVariables = SpellVariable::getVariablesBySpellId($newSpellId);

            // Create new server variables with values from variables payload (admin-provided)
            // The variables payload should contain all variables for the new spell
            if ($variablesPayload !== null && !empty($variablesPayload)) {
                // Validate that all variables belong to the new spell
                $spellVarMap = [];
                foreach ($newSpellVariables as $sv) {
                    $spellVarMap[(int) $sv['id']] = $sv;
                }

                $validatedVariables = [];
                foreach ($variablesPayload as $item) {
                    $varId = (int) $item['variable_id'];
                    $val = (string) $item['variable_value'];

                    if (!isset($spellVarMap[$varId])) {
                        return ApiResponse::error('Variable does not belong to the selected spell: ' . $varId, 'INVALID_VARIABLE_SCOPE', 422);
                    }

                    $validatedVariables[] = [
                        'variable_id' => $varId,
                        'variable_value' => $val,
                    ];
                }

                if (!empty($validatedVariables)) {
                    $created = ServerVariable::createOrUpdateServerVariables((int) $id, $validatedVariables);
                    if (!$created) {
                        return ApiResponse::error('Failed to create new server variables', 'VARIABLES_CREATE_FAILED', 500);
                    }
                }
            } else {
                // No variables provided - create with default values (fallback)
                $newVariables = [];
                foreach ($newSpellVariables as $sv) {
                    $newVariables[] = [
                        'variable_id' => (int) $sv['id'],
                        'variable_value' => (string) ($sv['default_value'] ?? ''),
                    ];
                }

                if (!empty($newVariables)) {
                    $created = ServerVariable::createOrUpdateServerVariables((int) $id, $newVariables);
                    if (!$created) {
                        return ApiResponse::error('Failed to create new server variables', 'VARIABLES_CREATE_FAILED', 500);
                    }
                }
            }
        }

        // Normalize integer/boolean fields to avoid empty-string writes
        $intFields = [
            'node_id',
            'owner_id',
            'memory',
            'swap',
            'disk',
            'io',
            'cpu',
            'allocation_id',
            'realms_id',
            'spell_id',
            'allocation_limit',
            'database_limit',
            'backup_limit',
            'skip_scripts',
            'oom_disabled',
            'suspended',
        ];
        foreach ($intFields as $f) {
            if (array_key_exists($f, $serverUpdateData)) {
                $value = $serverUpdateData[$f];
                // Treat empty string as "not provided" to avoid SQL errors
                if ($value === '' || $value === null) {
                    unset($serverUpdateData[$f]);
                } else {
                    // Coerce booleans/strings to int for DB
                    $serverUpdateData[$f] = (int) $value;
                }
            }
        }

        // Log the data being sent for debugging
        App::getInstance(true)->getLogger()->debug('Updating server ID ' . $id . ' with data: ' . json_encode($serverUpdateData));

        $updated = Server::updateServerById($id, $serverUpdateData);
        if (!$updated) {
            // Check backend logs for detailed error message
            App::getInstance(true)->getLogger()->error('Server update failed for ID: ' . $id);

            return ApiResponse::error('Failed to update server. Check server logs for details.', 'FAILED_TO_UPDATE_SERVER', 500);
        }

        // Handle allocation changes if allocation_id is being updated
        if (isset($data['allocation_id']) && $data['allocation_id'] !== $server['allocation_id']) {
            // Unclaim the old allocation
            if (isset($server['allocation_id'])) {
                $oldAllocationUnclaimed = Allocation::unassignFromServer($server['allocation_id']);
                if (!$oldAllocationUnclaimed) {
                    App::getInstance(true)->getLogger()->error('Failed to unclaim old allocation (ID: ' . $server['allocation_id'] . ') for server ID: ' . $id);
                }
            }

            // Claim the new allocation
            $newAllocationClaimed = Allocation::assignToServer($data['allocation_id'], $id);
            if (!$newAllocationClaimed) {
                App::getInstance(true)->getLogger()->error('Failed to claim new allocation (ID: ' . $data['allocation_id'] . ') for server ID: ' . $id);
            }
        }

        // Update variables if provided (only if spell hasn't changed)
        if ($variablesPayload !== null && !$spellChanged) {
            $ok = ServerVariable::createOrUpdateServerVariables((int) $id, $variablesPayload);
            if (!$ok) {
                return ApiResponse::error('Failed to update server variables', 'VARIABLES_UPDATE_FAILED', 500);
            }
        }

        // Sync with Wings if node information is available
        // If spell changed, trigger reinstall instead of just sync
        if (isset($data['node_id']) || isset($data['allocation_id']) || isset($data['spell_id']) || isset($data['variables']) || isset($data['image']) || isset($data['startup'])) {
            $nodeInfo = Node::getNodeById($data['node_id'] ?? $server['node_id']);
            if ($nodeInfo) {
                $scheme = $nodeInfo['scheme'];
                $host = $nodeInfo['fqdn'];
                $port = $nodeInfo['daemonListen'];
                $token = $nodeInfo['daemon_token'];

                $timeout = (int) 30;
                try {
                    $wings = new Wings(
                        $host,
                        $port,
                        $scheme,
                        $token,
                        $timeout
                    );

                    // If spell changed, trigger reinstall instead of just sync
                    if ($spellChanged) {
                        $response = $wings->getServer()->reinstallServer($server['uuid']);

                        // Emit reinstall event
                        global $eventManager;
                        if (isset($eventManager) && $eventManager !== null) {
                            $eventManager->emit(
                                ServerEvent::onServerReinstalled(),
                                [
                                    'server' => Server::getServerById($id),
                                    'updated_by' => $request->get('user'),
                                ]
                            );
                        }
                    } else {
                        $response = $wings->getServer()->syncServer($server['uuid']);
                    }

                    if (!$response->isSuccessful()) {
                        App::getInstance(true)->getLogger()->warning('Failed to ' . ($spellChanged ? 'reinstall' : 'sync') . ' server with Wings: ' . $response->getError());
                    }
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error('Failed to ' . ($spellChanged ? 'reinstall' : 'sync') . ' server with Wings: ' . $e->getMessage());
                }
            }
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'update_server',
            'context' => 'Updated server ' . $server['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Get updated server data for response
        $updatedServer = Server::getServerById($id);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerUpdated(),
                [
                    'server' => $updatedServer,
                    'updated_data' => $data,
                    'updated_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([
            'server' => [
                'id' => $updatedServer['id'],
                'uuid' => $updatedServer['uuid'],
                'uuidShort' => $updatedServer['uuidShort'],
                'name' => $updatedServer['name'],
                'description' => $updatedServer['description'],
                'startup' => $updatedServer['startup'],
                'image' => $updatedServer['image'],
                'status' => $updatedServer['status'],
                'updated_at' => $updatedServer['updated_at'] ?? null,
            ],
        ], 'Server updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/servers/{id}',
        summary: 'Delete server',
        description: 'Permanently delete a server from the database and Wings daemon. Unclaims allocation and sends notification email to the server owner.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server configuration'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 422, description: 'Unprocessable Entity - Invalid server data'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete server or Wings error'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        (new SubdomainCleanupService())->cleanupServerSubdomains((int) $server['id']);

        // Unclaim all allocations (primary + additional) before deleting the server
        $allAllocations = Allocation::getByServerId($id);
        if (!empty($allAllocations)) {
            $allocationIds = array_column($allAllocations, 'id');
            $allocationsUnclaimed = Allocation::unassignMultiple($allocationIds);
            if (!$allocationsUnclaimed) {
                App::getInstance(true)->getLogger()->error('Failed to unclaim allocations for server ID: ' . $id);
                // Continue with deletion even if unclaiming fails
            } else {
                App::getInstance(true)->getLogger()->info('Unclaimed ' . count($allocationIds) . ' allocation(s) for server ID: ' . $id);
            }
        }

        // Clean up server databases before deleting the server
        $this->cleanupServerDatabases($id);

        $config = App::getInstance(true)->getConfig();
        $user = User::getUserById($server['owner_id']);

        $deleted = Server::hardDeleteServer($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete server', 'FAILED_TO_DELETE_SERVER', 500);
        }
        $nodeInfo = Node::getNodeById($server['node_id']);
        $scheme = $nodeInfo['scheme'];
        $host = $nodeInfo['fqdn'];
        $port = $nodeInfo['daemonListen'];
        $token = $nodeInfo['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            $response = $wings->getServer()->deleteServer($server['uuid']);
            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($response->getStatusCode() === 400) {
                    return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
                } elseif ($response->getStatusCode() === 401) {
                    return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
                } elseif ($response->getStatusCode() === 403) {
                    return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
                } elseif ($response->getStatusCode() === 422) {
                    return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
                }

                return ApiResponse::error('Failed to create server in Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to create server in Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to create server in Wings: ' . $e->getMessage(), 'FAILED_TO_CREATE_SERVER_IN_WINGS', 500);
        }
        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'delete_server',
            'context' => 'Deleted server ' . $server['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerDeleted(),
                [
                    'server' => $server,
                    'deleted_by' => $request->get('user'),
                ]
            );
        }

        try {
            ServerDeleted::send([
                'email' => $user['email'],
                'subject' => 'Server deleted on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'server_name' => $server['name'],
                'deletion_time' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send server deleted email: ' . $e->getMessage());
        }

        return ApiResponse::success([], 'Server deleted successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/servers/{id}/hard',
        summary: 'Hard delete server',
        description: 'Force delete a server from the database only, without contacting Wings. Use this only when Wings is unreachable or the node is dead. This will NOT remove server files from Wings.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server hard deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete server from database'),
        ]
    )]
    public function hardDelete(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        (new SubdomainCleanupService())->cleanupServerSubdomains((int) $server['id']);

        // Unclaim all allocations (primary + additional) before deleting the server
        $allAllocations = Allocation::getByServerId($id);
        if (!empty($allAllocations)) {
            $allocationIds = array_column($allAllocations, 'id');
            $allocationsUnclaimed = Allocation::unassignMultiple($allocationIds);
            if (!$allocationsUnclaimed) {
                App::getInstance(true)->getLogger()->error('Failed to unclaim allocations for server ID: ' . $id);
                // Continue with deletion even if unclaiming fails
            } else {
                App::getInstance(true)->getLogger()->info('Unclaimed ' . count($allocationIds) . ' allocation(s) for server ID: ' . $id);
            }
        }

        // Clean up server databases before deleting the server
        $this->cleanupServerDatabases($id);

        $config = App::getInstance(true)->getConfig();
        $user = User::getUserById($server['owner_id']);

        // Hard delete - only removes from database, does NOT contact Wings
        $deleted = Server::hardDeleteServer($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to hard delete server from database', 'FAILED_TO_HARD_DELETE_SERVER', 500);
        }

        // Log activity with clear indication this was a hard delete
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'hard_delete_server',
            'context' => 'Hard deleted server ' . $server['name'] . ' (database only, Wings not contacted)',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Log warning about hard delete
        App::getInstance(true)->getLogger()->warning(
            'Server hard deleted (database only): ' . $server['name'] .
            ' (ID: ' . $id . ', UUID: ' . $server['uuid'] . ') by user ' .
            $request->get('user')['username'] . '. Wings was NOT contacted - server files may still exist on node.'
        );

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerDeleted(),
                [
                    'server' => $server,
                    'deleted_by' => $request->get('user'),
                    'hard_delete' => true,
                ]
            );
        }

        try {
            ServerDeleted::send([
                'email' => $user['email'],
                'subject' => 'Server deleted on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'server_name' => $server['name'],
                'deletion_time' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send server deleted email: ' . $e->getMessage());
        }

        return ApiResponse::success([], 'Server hard deleted successfully (database only - Wings was not contacted)', 200);
    }

    #[OA\Get(
        path: '/api/admin/servers/owner/{ownerId}',
        summary: 'Get servers by owner',
        description: 'Retrieve all servers owned by a specific user.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'ownerId',
                in: 'path',
                description: 'Owner user ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Servers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/Server')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid owner ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getByOwner(Request $request, int $ownerId): Response
    {
        $servers = Server::getServersByOwnerId($ownerId);

        return ApiResponse::success(['servers' => $servers], 'Servers fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/servers/node/{nodeId}',
        summary: 'Get servers by node',
        description: 'Retrieve all servers running on a specific node.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'nodeId',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Servers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/Server')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getByNode(Request $request, int $nodeId): Response
    {
        $servers = Server::getServersByNodeId($nodeId);

        return ApiResponse::success(['servers' => $servers], 'Servers fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/servers/realm/{realmId}',
        summary: 'Get servers by realm',
        description: 'Retrieve all servers belonging to a specific realm.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'realmId',
                in: 'path',
                description: 'Realm ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Servers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/Server')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid realm ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getByRealm(Request $request, int $realmId): Response
    {
        $servers = Server::getServersByRealmId($realmId);

        return ApiResponse::success(['servers' => $servers], 'Servers fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/servers/spell/{spellId}',
        summary: 'Get servers by spell',
        description: 'Retrieve all servers using a specific spell.',
        tags: ['Admin - Servers'],
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
                description: 'Servers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/Server')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid spell ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getBySpell(Request $request, int $spellId): Response
    {
        $servers = Server::getServersBySpellId($spellId);

        return ApiResponse::success(['servers' => $servers], 'Servers fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/servers/{id}/with-relations',
        summary: 'Get server with relations',
        description: 'Retrieve a specific server with all its related data including owner, node, realm, spell, and allocation information.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server with relations retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'server', ref: '#/components/schemas/Server'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
        ]
    )]
    public function getWithRelations(Request $request, int $id): Response
    {
        $server = Server::getServerWithRelations($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        return ApiResponse::success(['server' => $server], 'Server with relations fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/servers/with-relations',
        summary: 'Get all servers with relations',
        description: 'Retrieve all servers with their related data including owner, node, realm, spell, and allocation information.',
        tags: ['Admin - Servers'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Servers with relations retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/Server')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getAllWithRelations(Request $request): Response
    {
        $servers = Server::getAllServersWithRelations();

        return ApiResponse::success(['servers' => $servers], 'Servers with relations fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/servers/{id}/variables',
        summary: 'Get server variables',
        description: 'Retrieve all variables for a specific server with their spell variable definitions and metadata.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server variables retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'variables', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerVariable')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
        ]
    )]
    public function getServerVariables(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $variables = ServerVariable::getServerVariablesWithDetails($id);

        return ApiResponse::success(['variables' => $variables], 'Server variables fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/servers/{id}/suspend',
        summary: 'Suspend server',
        description: 'Suspend a server by killing it in Wings and updating the suspended status. Sends notification email to the server owner.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server suspended successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server configuration'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 422, description: 'Unprocessable Entity - Invalid server data'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to suspend server or Wings error'),
        ]
    )]
    public function suspend(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $ok = Server::updateServerById($id, ['suspended' => 1]);
        if (!$ok) {
            return ApiResponse::error('Failed to suspend server', 'FAILED_TO_SUSPEND', 500);
        }
        $config = App::getInstance(true)->getConfig();
        $user = User::getUserById($server['owner_id']);

        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'suspend_server',
            'context' => 'Suspended server ' . $server['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        $nodeInfo = Node::getNodeById($server['node_id']);
        $scheme = $nodeInfo['scheme'];
        $host = $nodeInfo['fqdn'];
        $port = $nodeInfo['daemonListen'];
        $token = $nodeInfo['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            $response = $wings->getServer()->killServer($server['uuid']);
            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($response->getStatusCode() === 400) {
                    return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
                } elseif ($response->getStatusCode() === 401) {
                    return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
                } elseif ($response->getStatusCode() === 403) {
                    return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
                } elseif ($response->getStatusCode() === 422) {
                    return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
                }

                return ApiResponse::error('Failed to create server in Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to create server in Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to create server in Wings: ' . $e->getMessage(), 'FAILED_TO_CREATE_SERVER_IN_WINGS', 500);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerSuspended(),
                [
                    'server' => $server,
                    'suspended_by' => $request->get('user'),
                ]
            );
        }

        try {
            ServerBanned::send([
                'email' => $user['email'],
                'subject' => 'Server suspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'server_name' => $server['name'],
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send server suspended email: ' . $e->getMessage());
        }

        return ApiResponse::success([], 'Server suspended', 200);
    }

    #[OA\Post(
        path: '/api/admin/servers/{id}/unsuspend',
        summary: 'Unsuspend server',
        description: 'Unsuspend a server by updating the suspended status. Sends notification email to the server owner.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server unsuspended successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to unsuspend server'),
        ]
    )]
    public function unsuspend(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $ok = Server::updateServerById($id, ['suspended' => 0]);
        if (!$ok) {
            return ApiResponse::error('Failed to unsuspend server', 'FAILED_TO_UNSUSPEND', 500);
        }

        $config = App::getInstance(true)->getConfig();
        $user = User::getUserById($server['owner_id']);

        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'unsuspend_server',
            'context' => 'Unsuspended server ' . $server['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerUnsuspended(),
                [
                    'server' => $server,
                    'unsuspended_by' => $request->get('user'),
                ]
            );
        }

        try {
            ServerUnbanned::send([
                'email' => $user['email'],
                'subject' => 'Server unsuspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'fhttps://eatherpanel.mythical.systems'),
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'server_name' => $server['name'],
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send server suspended email: ' . $e->getMessage());
        }

        return ApiResponse::success([], 'Server unsuspended', 200);
    }

    #[OA\Post(
        path: '/api/admin/servers/{id}/transfer',
        summary: 'Initiate server transfer',
        description: 'Start a transfer of a server from its current node to a destination node. Generates a transfer JWT token and instructs the source node to begin the transfer process.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['destination_node_id'],
                properties: [
                    new OA\Property(property: 'destination_node_id', type: 'integer', description: 'Destination node ID', minimum: 1),
                    new OA\Property(property: 'destination_allocation_id', type: 'integer', description: 'Destination allocation ID (optional)', minimum: 1),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server transfer initiated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                        new OA\Property(property: 'transfer_token', type: 'string', description: 'Transfer JWT token'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid destination node, server already transferring, or same source and destination'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found or destination node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to initiate transfer or Wings error'),
        ]
    )]
    public function initiateTransfer(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!isset($data['destination_node_id']) || !is_numeric($data['destination_node_id'])) {
            return ApiResponse::error('Invalid or missing destination_node_id', 'INVALID_DESTINATION_NODE', 400);
        }

        $destinationNodeId = (int) $data['destination_node_id'];

        // Prevent transferring to the same node
        if ($server['node_id'] === $destinationNodeId) {
            return ApiResponse::error('Cannot transfer server to the same node', 'SAME_SOURCE_DESTINATION', 400);
        }

        // Check if server is already transferring or has an active transfer
        if ($server['status'] === 'transferring' || ServerTransfer::hasActiveTransfer($id)) {
            return ApiResponse::error('Server is already being transferred', 'ALREADY_TRANSFERRING', 400);
        }

        // Check if server is in a transferable state (installed, not restoring backup)
        if ($server['status'] === 'installing' || $server['status'] === 'restoring') {
            return ApiResponse::error('Server cannot be transferred while installing or restoring', 'SERVER_NOT_TRANSFERABLE', 400);
        }

        // Get destination node
        $destinationNode = Node::getNodeById($destinationNodeId);
        if (!$destinationNode) {
            return ApiResponse::error('Destination node not found', 'DESTINATION_NODE_NOT_FOUND', 404);
        }

        // Get source node for Wings connection
        $sourceNode = Node::getNodeById($server['node_id']);
        if (!$sourceNode) {
            return ApiResponse::error('Source node not found', 'SOURCE_NODE_NOT_FOUND', 404);
        }

        // Store original values in case we need to revert
        $originalNodeId = $server['node_id'];
        $originalAllocationId = $server['allocation_id'];

        // Get server's current allocations (primary + additional)
        $currentAllocations = Allocation::getByServerId($id);
        $oldAdditionalAllocations = array_filter(
            array_column($currentAllocations, 'id'),
            fn ($allocId) => $allocId != $originalAllocationId
        );

        // Validate and get destination allocation
        $newAllocationId = null;
        if (isset($data['destination_allocation_id'])) {
            $destinationAllocation = Allocation::getAllocationById($data['destination_allocation_id']);
            if (!$destinationAllocation) {
                return ApiResponse::error('Destination allocation not found', 'DESTINATION_ALLOCATION_NOT_FOUND', 404);
            }
            if ($destinationAllocation['node_id'] !== $destinationNodeId) {
                return ApiResponse::error('Destination allocation does not belong to destination node', 'ALLOCATION_NODE_MISMATCH', 400);
            }
            if ($destinationAllocation['server_id'] !== null) {
                return ApiResponse::error('Destination allocation is already assigned to another server', 'ALLOCATION_IN_USE', 400);
            }
            $newAllocationId = $destinationAllocation['id'];
        }

        // Get additional allocations for destination (optional)
        $newAdditionalAllocations = [];
        if (isset($data['destination_additional_allocations']) && is_array($data['destination_additional_allocations'])) {
            foreach ($data['destination_additional_allocations'] as $allocId) {
                $alloc = Allocation::getAllocationById((int) $allocId);
                if ($alloc && $alloc['node_id'] === $destinationNodeId && $alloc['server_id'] === null) {
                    $newAdditionalAllocations[] = (int) $allocId;
                }
            }
        }

        // Generate transfer JWT token (subject is the destination server UUID)
        $config = App::getInstance(true)->getConfig();
        $panelUrl = $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
        $destinationUrl = $destinationNode['scheme'] . '://' . $destinationNode['fqdn'] . ':' . $destinationNode['daemonListen'];

        try {
            // Temporarily assign new allocations to the server (so they can't be taken during transfer)
            if ($newAllocationId) {
                $allocationsToAssign = [$newAllocationId];
                if (!empty($newAdditionalAllocations)) {
                    $allocationsToAssign = array_merge($allocationsToAssign, $newAdditionalAllocations);
                }
                Allocation::assignMultipleToServer($id, $allocationsToAssign);
            }

            // Update server status to transferring AND update node_id to destination
            // This allows destination Wings to query Panel for server configuration
            $updated = Server::updateServerById($id, [
                'status' => 'transferring',
                'node_id' => $destinationNodeId,
            ]);
            if (!$updated) {
                // Revert allocation assignment
                if ($newAllocationId) {
                    $allocationsToRevert = [$newAllocationId];
                    if (!empty($newAdditionalAllocations)) {
                        $allocationsToRevert = array_merge($allocationsToRevert, $newAdditionalAllocations);
                    }
                    Allocation::unassignMultiple($allocationsToRevert);
                }

                return ApiResponse::error('Failed to update server status', 'UPDATE_FAILED', 500);
            }

            $wings = new Wings(
                $sourceNode['fqdn'],
                $sourceNode['daemonListen'],
                $sourceNode['scheme'],
                $sourceNode['daemon_token'],
                30
            );

            // Get JWT service and generate transfer token
            $jwtService = new \App\Services\Wings\Services\JwtService(
                $destinationNode['daemon_token'],
                $panelUrl,
                $destinationUrl,
                3600 // 1 hour expiration for transfers
            );

            $transferToken = $jwtService->generateTransferToken(
                $server['uuid'],
                $request->get('user')['uuid'],
                ['*'] // Full permissions for transfer
            );

            // Prepare transfer request data for source node
            // Wings will extract server UUID from JWT's 'sub' claim
            $transferData = [
                'url' => $destinationUrl . '/api/transfers',
                'token' => 'Bearer ' . $transferToken,
            ];

            // Initiate transfer on source node
            $response = $wings->getTransfer()->startTransfer($server['uuid'], $transferData);

            // Create transfer record in database with full allocation tracking
            $transferId = ServerTransfer::create([
                'server_id' => $id,
                'source_node_id' => $originalNodeId,
                'destination_node_id' => $destinationNodeId,
                'old_allocation' => $originalAllocationId,
                'new_allocation' => $newAllocationId,
                'old_additional_allocations' => $oldAdditionalAllocations,
                'new_additional_allocations' => $newAdditionalAllocations,
                'status' => 'in_progress',
                'progress' => 0.0,
                'started_at' => date('Y-m-d H:i:s'),
            ]);

            if (!$transferId) {
                App::getInstance(true)->getLogger()->error('Failed to create server transfer record');
                // Don't fail the transfer if database insert fails, but log it
            }

            // Log activity
            Activity::createActivity([
                'user_uuid' => $request->get('user')['uuid'],
                'name' => 'initiate_server_transfer',
                'context' => 'Initiated transfer of server ' . $server['name'] . ' from node ' . $sourceNode['name'] . ' to node ' . $destinationNode['name'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerTransferInitiated(),
                    [
                        'server' => $server,
                        'source_node' => $sourceNode,
                        'destination_node' => $destinationNode,
                        'initiated_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([
                'message' => 'Server transfer initiated successfully',
                'transfer_id' => $transferId,
            ], 'Server transfer initiated', 200);
        } catch (\Exception $e) {
            // Revert server status AND node_id if transfer initiation fails
            Server::updateServerById($id, [
                'status' => $server['status'],
                'node_id' => $originalNodeId,
            ]);

            // Revert allocation assignment
            if ($newAllocationId) {
                $allocationsToRevert = [$newAllocationId];
                if (!empty($newAdditionalAllocations)) {
                    $allocationsToRevert = array_merge($allocationsToRevert, $newAdditionalAllocations);
                }
                Allocation::unassignMultiple($allocationsToRevert);
            }

            App::getInstance(true)->getLogger()->error('Failed to initiate server transfer: ' . $e->getMessage());

            return ApiResponse::error('Failed to initiate server transfer: ' . $e->getMessage(), 'TRANSFER_INITIATION_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/servers/{id}/transfer',
        summary: 'Get server transfer status',
        description: 'Retrieve the current status of a server transfer including progress, start time, and any error messages.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Transfer status retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', description: 'Transfer status'),
                        new OA\Property(property: 'progress', type: 'number', format: 'float', description: 'Transfer progress percentage'),
                        new OA\Property(property: 'started_at', type: 'string', description: 'Transfer start time'),
                        new OA\Property(property: 'completed_at', type: 'string', description: 'Transfer completion time'),
                        new OA\Property(property: 'error', type: 'string', description: 'Error message if transfer failed'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Server is not being transferred'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to get transfer status'),
        ]
    )]
    public function getTransferStatus(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if ($server['status'] !== 'transferring') {
            return ApiResponse::error('Server is not being transferred', 'NOT_TRANSFERRING', 400);
        }

        // Get transfer status from database
        $transfer = ServerTransfer::getByServerId($id);
        if (!$transfer) {
            return ApiResponse::error('Transfer record not found', 'TRANSFER_NOT_FOUND', 404);
        }

        // Format response to match expected frontend structure
        $response = [
            'status' => $transfer['status'],
            'progress' => $transfer['progress'] ? (float) $transfer['progress'] : 0.0,
            'started_at' => $transfer['started_at'],
            'completed_at' => $transfer['completed_at'],
            'error' => $transfer['error'],
        ];

        return ApiResponse::success($response, 'Transfer status retrieved successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/servers/{id}/transfer',
        summary: 'Cancel server transfer',
        description: 'Cancel an in-progress server transfer. This will revert the server to its original node and release any allocated resources on the destination node.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Transfer cancelled successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Server is not being transferred'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to cancel transfer'),
        ]
    )]
    public function cancelTransfer(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get active transfer
        $transfer = ServerTransfer::getActiveByServerId($id);
        if (!$transfer) {
            return ApiResponse::error('Server is not being transferred', 'NOT_TRANSFERRING', 400);
        }

        $logger = App::getInstance(true)->getLogger();
        $logger->info('Cancelling transfer for server ' . $server['uuid']);

        try {
            // Get source and destination nodes
            $sourceNode = Node::getNodeById($transfer['source_node_id']);
            $destinationNode = Node::getNodeById($transfer['destination_node_id']);

            // Cancel transfer on source node (stops the archive streaming)
            if ($sourceNode) {
                try {
                    $wingsSource = new Wings(
                        $sourceNode['fqdn'],
                        $sourceNode['daemonListen'],
                        $sourceNode['scheme'],
                        $sourceNode['daemon_token'],
                        30
                    );
                    $wingsSource->getTransfer()->cancelTransfer($server['uuid']);
                    $logger->info('Cancelled transfer on source node for server ' . $server['uuid']);
                } catch (\Exception $e) {
                    $logger->warning('Failed to cancel transfer on source node: ' . $e->getMessage());
                }
            }

            // Cancel transfer on destination node (stops the incoming transfer)
            if ($destinationNode) {
                try {
                    $wingsDest = new Wings(
                        $destinationNode['fqdn'],
                        $destinationNode['daemonListen'],
                        $destinationNode['scheme'],
                        $destinationNode['daemon_token'],
                        30
                    );
                    // Destination node uses DELETE /api/transfer with server UUID in body
                    $wingsDest->getServer()->deleteServer($server['uuid']);
                    $logger->info('Deleted server on destination node for server ' . $server['uuid']);
                } catch (\Exception $e) {
                    $logger->warning('Failed to cancel transfer on destination node: ' . $e->getMessage());
                }
            }

            // Release new allocations (destination node) back to the pool
            if ($transfer['new_allocation'] || !empty($transfer['new_additional_allocations'])) {
                $newAllocations = [];
                if ($transfer['new_allocation']) {
                    $newAllocations[] = $transfer['new_allocation'];
                }
                if (!empty($transfer['new_additional_allocations'])) {
                    $newAllocations = array_merge($newAllocations, $transfer['new_additional_allocations']);
                }

                if (!empty($newAllocations)) {
                    $logger->info('Releasing ' . count($newAllocations) . ' new allocations for cancelled transfer');
                    Allocation::unassignMultiple($newAllocations);
                }
            }

            // Revert server to source node with original allocation
            $serverUpdateData = [
                'status' => 'offline',
                'node_id' => $transfer['source_node_id'],
            ];
            if ($transfer['old_allocation']) {
                $serverUpdateData['allocation_id'] = $transfer['old_allocation'];
            }
            Server::updateServerById($id, $serverUpdateData);

            // Mark transfer as cancelled (using successful = false with specific error)
            ServerTransfer::updateByServerId($id, [
                'successful' => 0,
                'status' => 'cancelled',
                'completed_at' => date('Y-m-d H:i:s'),
                'error' => 'Transfer cancelled by administrator',
            ]);

            // Log activity
            Activity::createActivity([
                'user_uuid' => $request->get('user')['uuid'],
                'name' => 'cancel_server_transfer',
                'context' => 'Cancelled transfer of server ' . $server['name'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerTransferCancelled(),
                    [
                        'server' => $server,
                        'cancelled_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([], 'Transfer cancelled successfully', 200);
        } catch (\Exception $e) {
            $logger->error('Failed to cancel server transfer: ' . $e->getMessage());

            return ApiResponse::error('Failed to cancel transfer: ' . $e->getMessage(), 'CANCEL_FAILED', 500);
        }
    }

    /**
     * Clean up server databases when deleting a server.
     * This method handles database cleanup gracefully without breaking the deletion process.
     *
     * @param int $serverId The server ID
     */
    private function cleanupServerDatabases(int $serverId): void
    {
        try {
            // Get all databases for this server
            $databases = ServerDatabase::getServerDatabasesWithDetailsByServerId($serverId);

            if (empty($databases)) {
                App::getInstance(true)->getLogger()->info('No databases found for server ID: ' . $serverId);

                return;
            }

            App::getInstance(true)->getLogger()->info('Cleaning up ' . count($databases) . ' databases for server ID: ' . $serverId);

            foreach ($databases as $database) {
                try {
                    // Get database host info
                    $databaseHost = DatabaseInstance::getDatabaseById($database['database_host_id']);
                    if (!$databaseHost) {
                        App::getInstance(true)->getLogger()->warning('Database host not found for database ID: ' . $database['id']);
                        continue;
                    }

                    // Delete database and user from the database host
                    $this->deleteDatabaseFromHost($databaseHost, $database['database'], $database['username']);

                    // Delete server database record
                    if (!ServerDatabase::deleteServerDatabase($database['id'])) {
                        App::getInstance(true)->getLogger()->error('Failed to delete server database record for database ID: ' . $database['id']);
                    } else {
                        App::getInstance(true)->getLogger()->info('Successfully deleted database: ' . $database['database'] . ' (ID: ' . $database['id'] . ')');
                    }
                } catch (\Exception $e) {
                    // Log the error but continue with other databases
                    App::getInstance(true)->getLogger()->error('Failed to delete database ID ' . $database['id'] . ': ' . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            // Log the error but don't break the server deletion process
            App::getInstance(true)->getLogger()->error('Failed to cleanup databases for server ID ' . $serverId . ': ' . $e->getMessage());
        }
    }

    /**
     * Delete database and user from the database host.
     * This is a copy of the method from ServerDatabaseController to avoid dependency issues.
     *
     * @param array $databaseHost Database host information
     * @param string $databaseName Database name to delete
     * @param string $username Username to delete
     *
     * @throws \Exception If deletion fails
     */
    private function deleteDatabaseFromHost(array $databaseHost, string $databaseName, string $username): void
    {
        try {
            // Connect directly to the external database host (not the panel's database)
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            // Handle different database types
            switch ($databaseHost['database_type']) {
                case 'mysql':
                case 'mariadb':
                    $safeDbName = $this->quoteIdentifierMySQL($databaseName);
                    $safeUser = $this->quoteIdentifierMySQL($username);
                    $dsn = "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

                    // Revoke privileges from the user
                    $pdo->exec("REVOKE ALL PRIVILEGES ON {$safeDbName}.* FROM {$safeUser}@'%'");

                    // Drop the user
                    $pdo->exec("DROP USER IF EXISTS {$safeUser}@'%'");

                    // Drop the database
                    $pdo->exec("DROP DATABASE IF EXISTS {$safeDbName}");

                    // Flush privileges
                    $pdo->exec('FLUSH PRIVILEGES');
                    break;

                case 'postgresql':
                    $safeDbName = $this->quoteIdentifier($databaseName);
                    $safeUser = $this->quoteIdentifier($username);
                    $dsn = "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

                    // Revoke privileges from the user
                    $pdo->exec("REVOKE ALL PRIVILEGES ON DATABASE {$safeDbName} FROM {$safeUser}");

                    // Drop the user
                    $pdo->exec("DROP USER IF EXISTS {$safeUser}");

                    // Drop the database
                    $pdo->exec("DROP DATABASE IF EXISTS {$safeDbName}");
                    break;

                default:
                    throw new \Exception("Unsupported database type: {$databaseHost['database_type']}");
            }
        } catch (\PDOException $e) {
            throw new \Exception("Failed to delete database from host {$databaseHost['name']}: " . $e->getMessage());
        }
    }

    /**
     * Safely quote a PostgreSQL identifier by escaping double quotes.
     *
     * @param string $identifier The identifier to quote
     *
     * @return string The safely quoted identifier
     */
    private function quoteIdentifier(string $identifier): string
    {
        return '"' . str_replace('"', '""', $identifier) . '"';
    }

    /**
     * Safely quote a MySQL/MariaDB identifier by escaping backticks.
     *
     * @param string $identifier The identifier to quote
     *
     * @return string The safely quoted identifier
     */
    private function quoteIdentifierMySQL(string $identifier): string
    {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }
}
