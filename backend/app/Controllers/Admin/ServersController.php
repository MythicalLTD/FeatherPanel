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
use App\Chat\ServerVariable;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Mail\templates\ServerBanned;
use App\Mail\templates\ServerCreated;
use App\Mail\templates\ServerDeleted;
use App\Mail\templates\ServerUnbanned;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

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
        new OA\Property(property: 'threads', type: 'integer', nullable: true, description: 'Thread limit'),
        new OA\Property(property: 'skip_scripts', type: 'boolean', description: 'Skip scripts flag'),
        new OA\Property(property: 'oom_disabled', type: 'boolean', description: 'OOM disabled flag'),
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
    required: ['node_id', 'name', 'description', 'owner_id', 'memory', 'swap', 'disk', 'io', 'cpu', 'allocation_id', 'realms_id', 'spell_id', 'startup', 'image'],
    properties: [
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID', minimum: 1),
        new OA\Property(property: 'name', type: 'string', description: 'Server name', minLength: 1, maxLength: 191),
        new OA\Property(property: 'description', type: 'string', description: 'Server description', minLength: 1, maxLength: 65535),
        new OA\Property(property: 'owner_id', type: 'integer', description: 'Owner user ID', minimum: 1),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory limit in MB', minimum: 128),
        new OA\Property(property: 'swap', type: 'integer', description: 'Swap limit in MB', minimum: 0),
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
        new OA\Property(property: 'threads', type: 'integer', nullable: true, description: 'Thread limit'),
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
        new OA\Property(property: 'swap', type: 'integer', description: 'Swap limit in MB', minimum: 0),
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
        new OA\Property(property: 'threads', type: 'integer', nullable: true, description: 'Thread limit'),
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
            'description',
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
        $numericFields = ['node_id', 'owner_id', 'memory', 'disk', 'io', 'cpu', 'allocation_id', 'realms_id', 'spell_id'];
        foreach ($numericFields as $field) {
            if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a positive integer', 'INVALID_DATA_TYPE', 400);
            }
        }

        // Validate string fields
        $stringFields = ['name', 'description', 'startup', 'image'];
        foreach ($stringFields as $field) {
            if (!is_string($data[$field]) || trim($data[$field]) === '') {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a non-empty string', 'INVALID_DATA_TYPE', 400);
            }
        }

        // Validate field lengths
        $lengthRules = [
            'name' => [1, 191],
            'description' => [1, 65535],
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

        // Validate resource limits
        if ($data['memory'] < 128) {
            return ApiResponse::error('Memory must be at least 128 MB', 'INVALID_MEMORY_LIMIT', 400);
        }
        if ($data['disk'] < 1024) {
            return ApiResponse::error('Disk must be at least 1024 MB', 'INVALID_DISK_LIMIT', 400);
        }
        if ($data['io'] < 10) {
            return ApiResponse::error('IO must be at least 10', 'INVALID_IO_LIMIT', 400);
        }
        if ($data['cpu'] < 10) {
            return ApiResponse::error('CPU must be at least 10%', 'INVALID_CPU_LIMIT', 400);
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
        $data['status'] = $data['status'] ?? 'installing';
        $data['skip_scripts'] = isset($data['skip_scripts']) ? (int) $data['skip_scripts'] : 0;
        $data['oom_disabled'] = isset($data['oom_disabled']) ? (int) $data['oom_disabled'] : 0;
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
            return ApiResponse::error('Missing required spell variables: ' . implode(', ', $missingRequiredVariables), 'MISSING_REQUIRED_VARIABLES', 400);
        }

        // Handle server variables if provided
        if (isset($data['variables']) && is_array($data['variables']) && !empty($data['variables'])) {
            App::getInstance(true)->getLogger()->info('Processing server variables for server ID: ' . $serverId . ', variables: ' . json_encode($data['variables']));

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
                    // Validate required variables have non-empty values
                    if (strpos($spellVariable['rules'], 'required') !== false && (empty($value) || trim($value) === '')) {
                        return ApiResponse::error('Required variable ' . $spellVariable['name'] . ' cannot be empty', 'REQUIRED_VARIABLE_EMPTY', 400);
                    }

                    $variables[] = [
                        'variable_id' => $spellVariable['id'],
                        'variable_value' => (string) $value,
                    ];
                    App::getInstance(true)->getLogger()->info('Found spell variable for ' . $envVariable . ': ID=' . $spellVariable['id'] . ', value=' . $value);
                } else {
                    App::getInstance(true)->getLogger()->warning('Spell variable not found for env_variable: ' . $envVariable);
                }
            }

            if (!empty($variables)) {
                App::getInstance(true)->getLogger()->info('Creating ' . count($variables) . ' server variables for server ID: ' . $serverId);
                $variablesCreated = ServerVariable::createOrUpdateServerVariables($serverId, $variables);
                if (!$variablesCreated) {
                    // Log the error but don't fail the server creation
                    App::getInstance(true)->getLogger()->error('Failed to create server variables for server ID: ' . $serverId);
                } else {
                    App::getInstance(true)->getLogger()->info('Successfully created server variables for server ID: ' . $serverId);
                }
            } else {
                App::getInstance(true)->getLogger()->info('No valid server variables to create for server ID: ' . $serverId);
            }
        } else {
            // Check if there are required variables but no variables provided
            if (!empty($requiredVariables)) {
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
            'name' => 'create_server',
            'context' => 'Created a new server ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        $eventManager->emit(
            ServerEvent::onServerCreated(),
            [
                'server_id' => $serverId,
                'server_data' => $data,
                'created_by' => $request->get('user'),
            ]
        );

        try {
            $allocation = Allocation::getAllocationById($data['allocation_id']);
            ServerCreated::send([
                'email' => $user['email'],
                'subject' => 'New server created on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'featherpanel.mythical.systems'),
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'server_name' => $data['name'],
                'server_ip' => $allocation['ip'] . ':' . $allocation['port'],
                'panel_url' => $config->getSetting(ConfigInterface::APP_URL, 'featherpanel.mythical.systems') . '/dashboard',
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

        // Validate data types for numeric fields
        $numericFields = ['node_id', 'owner_id', 'memory', 'swap', 'disk', 'io', 'cpu', 'allocation_id', 'realms_id', 'spell_id', 'allocation_limit', 'database_limit', 'backup_limit', 'threads'];
        foreach ($data as $field => $value) {
            if (in_array($field, $numericFields)) {
                if (!is_numeric($value) || (int) $value < 0) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a non-negative integer', 'INVALID_DATA_TYPE', 400);
                }
            }
        }

        // Validate string fields
        $stringFields = ['name', 'description', 'startup', 'image', 'external_id', 'status'];
        foreach ($data as $field => $value) {
            if (in_array($field, $stringFields) && isset($data[$field])) {
                if (!is_string($value)) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
                }
                if (trim($value) === '' && in_array($field, ['name', 'startup', 'image'])) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' cannot be empty', 'INVALID_DATA_TYPE', 400);
                }
            }
        }

        // Validate boolean fields
        $booleanFields = ['skip_scripts', 'oom_disabled'];
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

        // Validate resource limits
        if (isset($data['memory']) && $data['memory'] < 128) {
            return ApiResponse::error('Memory must be at least 128 MB', 'INVALID_MEMORY_LIMIT', 400);
        }
        if (isset($data['disk']) && $data['disk'] < 1024) {
            return ApiResponse::error('Disk must be at least 1024 MB', 'INVALID_DISK_LIMIT', 400);
        }
        if (isset($data['io']) && $data['io'] < 10) {
            return ApiResponse::error('IO must be at least 10', 'INVALID_IO_LIMIT', 400);
        }
        if (isset($data['cpu']) && $data['cpu'] < 10) {
            return ApiResponse::error('CPU must be at least 10%', 'INVALID_CPU_LIMIT', 400);
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
            'threads',
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
        $updated = Server::updateServerById($id, $serverUpdateData);
        if (!$updated) {
            return ApiResponse::error('Failed to update server', 'FAILED_TO_UPDATE_SERVER', 500);
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

        // Update variables if provided
        if ($variablesPayload !== null) {
            $ok = ServerVariable::createOrUpdateServerVariables((int) $id, $variablesPayload);
            if (!$ok) {
                return ApiResponse::error('Failed to update server variables', 'VARIABLES_UPDATE_FAILED', 500);
            }
        }

        // Sync with Wings if node information is available
        if (isset($data['node_id']) || isset($data['allocation_id']) || isset($data['spell_id']) || isset($data['variables'])) {
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

                    $response = $wings->getServer()->syncServer($server['uuid']);
                    if (!$response->isSuccessful()) {
                        App::getInstance(true)->getLogger()->warning('Failed to sync server with Wings: ' . $response->getError());
                    }
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error('Failed to sync server with Wings: ' . $e->getMessage());
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
        $eventManager->emit(
            ServerEvent::onServerUpdated(),
            [
                'server' => $updatedServer,
                'updated_data' => $data,
                'updated_by' => $request->get('user'),
            ]
        );

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

        // Unclaim the allocation before deleting the server
        if (isset($server['allocation_id'])) {
            $allocationUnclaimed = Allocation::unassignFromServer($server['allocation_id']);
            if (!$allocationUnclaimed) {
                App::getInstance(true)->getLogger()->error('Failed to unclaim allocation for server ID: ' . $id);
                // Continue with deletion even if unclaiming fails
            }
        }

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
        $eventManager->emit(
            ServerEvent::onServerDeleted(),
            [
                'server' => $server,
                'deleted_by' => $request->get('user'),
            ]
        );

        try {
            ServerDeleted::send([
                'email' => $user['email'],
                'subject' => 'Server deleted on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'featherpanel.mythical.systems'),
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
        $eventManager->emit(
            ServerEvent::onServerSuspended(),
            [
                'server' => $server,
                'suspended_by' => $request->get('user'),
            ]
        );

        try {
            ServerBanned::send([
                'email' => $user['email'],
                'subject' => 'Server suspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'featherpanel.mythical.systems'),
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
        $eventManager->emit(
            ServerEvent::onServerUnsuspended(),
            [
                'server' => $server,
                'unsuspended_by' => $request->get('user'),
            ]
        );

        try {
            ServerUnbanned::send([
                'email' => $user['email'],
                'subject' => 'Server unsuspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'featherpanel.mythical.systems'),
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
}
