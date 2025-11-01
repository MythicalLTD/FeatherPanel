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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Spell;
use App\Chat\Server;
use App\Permissions;
use App\Chat\Subuser;
use App\Chat\SpellVariable;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Chat\ServerVariable;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Helpers\PermissionHelper;
use App\Services\Wings\Services\Wings;
use App\Plugins\Events\Events\ServerEvent;
use App\Services\Wings\Services\JwtService;
use Symfony\Component\HttpFoundation\Request;
use App\Plugins\Events\Events\ServerUserEvent;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'UserServer',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
        new OA\Property(property: 'uuidShort', type: 'string', description: 'Server short UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Server name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Server description'),
        new OA\Property(property: 'status', type: 'string', description: 'Server status'),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory limit in MB'),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk limit in MB'),
        new OA\Property(property: 'cpu', type: 'integer', description: 'CPU limit percentage'),
        new OA\Property(property: 'swap', type: 'integer', description: 'Swap limit in MB'),
        new OA\Property(property: 'io', type: 'integer', description: 'IO limit'),
        new OA\Property(property: 'is_subuser', type: 'boolean', description: 'Whether user is a subuser'),
        new OA\Property(property: 'subuser_permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'Subuser permissions'),
        new OA\Property(property: 'subuser_id', type: 'integer', nullable: true, description: 'Subuser ID if applicable'),
        new OA\Property(property: 'node', type: 'object', properties: [
            new OA\Property(property: 'name', type: 'string', nullable: true),
            new OA\Property(property: 'maintenance_mode', type: 'boolean', nullable: true),
            new OA\Property(property: 'fqdn', type: 'string', nullable: true),
            new OA\Property(property: 'behind_proxy', type: 'boolean', nullable: true),
        ]),
        new OA\Property(property: 'realm', type: 'object', properties: [
            new OA\Property(property: 'name', type: 'string', nullable: true),
            new OA\Property(property: 'description', type: 'string', nullable: true),
            new OA\Property(property: 'logo', type: 'string', nullable: true),
        ]),
        new OA\Property(property: 'spell', type: 'object', properties: [
            new OA\Property(property: 'name', type: 'string', nullable: true),
            new OA\Property(property: 'description', type: 'string', nullable: true),
            new OA\Property(property: 'banner', type: 'string', nullable: true),
        ]),
        new OA\Property(property: 'allocation', type: 'object', properties: [
            new OA\Property(property: 'ip', type: 'string', nullable: true),
            new OA\Property(property: 'port', type: 'integer', nullable: true),
            new OA\Property(property: 'ip_alias', type: 'string', nullable: true),
        ]),
    ]
)]
#[OA\Schema(
    schema: 'UserServerPagination',
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
    schema: 'ServerSearch',
    type: 'object',
    properties: [
        new OA\Property(property: 'query', type: 'string', description: 'Search query'),
        new OA\Property(property: 'has_results', type: 'boolean', description: 'Whether search returned results'),
    ]
)]
#[OA\Schema(
    schema: 'ServerDetail',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
        new OA\Property(property: 'uuidShort', type: 'string', description: 'Server short UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Server name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Server description'),
        new OA\Property(property: 'status', type: 'string', description: 'Server status'),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory limit in MB'),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk limit in MB'),
        new OA\Property(property: 'cpu', type: 'integer', description: 'CPU limit percentage'),
        new OA\Property(property: 'swap', type: 'integer', description: 'Swap limit in MB'),
        new OA\Property(property: 'io', type: 'integer', description: 'IO limit'),
        new OA\Property(property: 'node', type: 'object', description: 'Node information'),
        new OA\Property(property: 'realm', type: 'object', description: 'Realm information'),
        new OA\Property(property: 'spell', type: 'object', description: 'Spell information'),
        new OA\Property(property: 'allocation', type: 'object', description: 'Allocation information'),
        new OA\Property(property: 'activity', type: 'array', items: new OA\Items(type: 'object'), description: 'Recent server activities'),
        new OA\Property(property: 'sftp', type: 'object', properties: [
            new OA\Property(property: 'host', type: 'string'),
            new OA\Property(property: 'port', type: 'integer'),
            new OA\Property(property: 'username', type: 'string'),
            new OA\Property(property: 'password', type: 'string'),
            new OA\Property(property: 'url', type: 'string'),
        ]),
        new OA\Property(property: 'variables', type: 'array', items: new OA\Items(type: 'object'), description: 'Server variables'),
    ]
)]
#[OA\Schema(
    schema: 'JwtResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'token', type: 'string', description: 'JWT token'),
        new OA\Property(property: 'expires_at', type: 'integer', description: 'Token expiration timestamp'),
        new OA\Property(property: 'server_uuid', type: 'string', description: 'Server UUID'),
        new OA\Property(property: 'user_uuid', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'User permissions'),
        new OA\Property(property: 'connection_string', type: 'string', description: 'WebSocket connection string'),
    ]
)]
#[OA\Schema(
    schema: 'ServerUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', nullable: true, description: 'Server name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Server description'),
        new OA\Property(property: 'startup', type: 'string', nullable: true, description: 'Startup command'),
        new OA\Property(property: 'image', type: 'string', nullable: true, description: 'Docker image'),
        new OA\Property(property: 'spell_id', type: 'integer', nullable: true, description: 'Spell ID to change server spell'),
        new OA\Property(property: 'wipe_files', type: 'boolean', nullable: true, description: 'Whether to delete all server files before reinstalling (only applies when changing spell_id)', default: false),
        new OA\Property(property: 'variables', type: 'array', items: new OA\Items(type: 'object', properties: [
            new OA\Property(property: 'variable_id', type: 'integer'),
            new OA\Property(property: 'variable_value', type: 'string'),
        ]), nullable: true, description: 'Server variables'),
    ]
)]
#[OA\Schema(
    schema: 'ServerUpdateResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'server', type: 'object', properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'uuid', type: 'string'),
            new OA\Property(property: 'uuidShort', type: 'string'),
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'description', type: 'string', nullable: true),
            new OA\Property(property: 'startup', type: 'string', nullable: true),
            new OA\Property(property: 'image', type: 'string', nullable: true),
            new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
        ]),
    ]
)]
class ServerUserController
{
    use CheckSubuserPermissionsTrait;

    #[OA\Get(
        path: '/api/user/servers',
        summary: 'Get user servers',
        description: 'Retrieve all servers owned by the user or where the user is a subuser, with pagination and search functionality.',
        tags: ['User - Server Management'],
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
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User servers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/UserServer')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/UserServerPagination'),
                        new OA\Property(property: 'search', ref: '#/components/schemas/ServerSearch'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve servers'),
        ]
    )]
    public function getUserServers(Request $request): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

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

        // Get servers the user owns
        $ownedServers = Server::searchServers(
            page: $page,
            limit: $limit,
            search: $search,
            ownerId: $user['id']
        );

        // Get servers where user is a subuser
        $subusers = Subuser::getSubusersByUserId((int) $user['id']);
        $subuserServerIds = array_map(static fn ($subuser) => (int) $subuser['server_id'], $subusers);

        // Create a map of subuser data by server ID for easy lookup
        $subuserMap = [];
        foreach ($subusers as $subuser) {
            $subuserMap[(int) $subuser['server_id']] = $subuser;
        }

        // Get subuser servers individually
        $subuserServers = [];
        foreach ($subuserServerIds as $serverId) {
            $server = Server::getServerById($serverId);
            if ($server) {
                // Apply search filter
                if (
                    empty($search)
                    || stripos($server['name'], $search) !== false
                    || stripos($server['description'] ?? '', $search) !== false
                ) {
                    $subuserServers[] = $server;
                }
            }
        }

        // Combine owned and subuser servers
        $allServers = array_merge($ownedServers, $subuserServers);

        // Apply client-side pagination since we combined results
        $totalServers = count($allServers);
        $offset = ($page - 1) * $limit;
        $servers = array_slice($allServers, $offset, $limit);

        // Add related data to each server.
        foreach ($servers as &$server) {
            // Check if user is a subuser of this server
            $isSubuser = isset($subuserMap[(int) $server['id']]);
            $server['is_subuser'] = $isSubuser;

            // Add subuser permissions if applicable
            if ($isSubuser) {
                $subuserData = $subuserMap[(int) $server['id']];
                $server['subuser_permissions'] = json_decode($subuserData['permissions'] ?? '[]', true) ?: [];
                $server['subuser_id'] = (int) $subuserData['id'];
            } else {
                $server['subuser_permissions'] = [];
                $server['subuser_id'] = null;
            }

            $node = Node::getNodeById($server['node_id']);
            $server['node'] = [
                'name' => $node['name'] ?? null,
                'maintenance_mode' => $node['maintenance_mode'] ?? null,
                'fqdn' => $node['fqdn'] ?? null,
                'behind_proxy' => $node['behind_proxy'] ?? null,
            ];
            $server['realm'] = \App\Chat\Realm::getById($server['realms_id']);
            $server['realm'] = [
                'name' => $server['realm']['name'] ?? null,
                'description' => $server['realm']['description'] ?? null,
                'logo' => $server['realm']['logo'] ?? null,
            ];
            $server['spell'] = Spell::getSpellById($server['spell_id']);
            $server['spell'] = [
                'name' => $server['spell']['name'] ?? null,
                'description' => $server['spell']['description'] ?? null,
                'banner' => $server['spell']['banner'] ?? null,
            ];
            $server['allocation'] = \App\Chat\Allocation::getAllocationById($server['allocation_id']);
            $server['allocation'] = [
                'ip' => $server['allocation']['ip'] ?? null,
                'port' => $server['allocation']['port'] ?? null,
                'ip_alias' => $server['allocation']['ip_alias'] ?? null,
            ];

            unset(
                $server['external_id'],
                $server['node_id'],
                $server['skip_scripts'],
                $server['allocation_id'],
                $server['realms_id'],
                $server['spell_id'],
                $server['startup'],
                $server['image'],
                $server['last_error'],
                $server['installed_at'],
                $server['updated_at'],
                $server['created_at']
            );
        }

        // Use the total count from our combined results
        $total = $totalServers;
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
        ], 'User servers fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}',
        summary: 'Get server details',
        description: 'Retrieve detailed information about a specific server including node, realm, spell, allocation, activities, SFTP details, and variables.',
        tags: ['User - Server Management'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server details retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServerDetail')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve server'),
        ]
    )]
    public function getServer(Request $request, string $uuidShort): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'NOT_FOUND', 404);
        }

        $server['node'] = Node::getNodeById($server['node_id']);
        $realmData = \App\Chat\Realm::getById($server['realms_id']);
        $server['realm'] = $realmData ? [
            'id' => $realmData['id'] ?? null,
            'name' => $realmData['name'] ?? null,
            'description' => $realmData['description'] ?? null,
            'logo' => $realmData['logo'] ?? null,
        ] : null;
        $spellData = Spell::getSpellById($server['spell_id']);
        $server['spell'] = $spellData ? [
            'id' => $spellData['id'] ?? null,
            'name' => $spellData['name'] ?? null,
            'description' => $spellData['description'] ?? null,
            'banner' => $spellData['banner'] ?? null,
            'startup' => $spellData['startup'] ?? null,
            'docker_images' => $spellData['docker_images'] ?? null,
        ] : null;

        $server['allocation'] = \App\Chat\Allocation::getAllocationById($server['allocation_id']);
        $server['activity'] = ServerActivity::getActivitiesByServerId($server['id']);
        $server['activity'] = array_reverse(array_slice($server['activity'], 0, 50));
        $sftp = [
            'host' => $server['node']['fqdn'],
            'port' => $server['node']['daemonSFTP'] ?? 2022,
            'username' => strtolower($user['username']) . '.' . $server['uuidShort'],
            'password' => '#AUTH_PASSWORD#',
            'url' => 'sftp://' . $server['node']['fqdn'] . ':' . $server['node']['daemonSFTP'] . '/' . strtolower($user['username']) . '.' . $server['uuidShort'],
        ];

        $server['sftp'] = $sftp;

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

        // Start flatten specific fields if they are valid JSON, else leave as is (do not json_decode, just keep string if not)
        $spell = &$server['spell'];
        $fieldsToMaybeJsonDecode = [
            'features',
            'docker_images',
            'file_denylist',
            'update_url',
            'config_files',
            'config_startup',
            'config_logs',
        ];
        foreach ($fieldsToMaybeJsonDecode as $field) {
            if (isset($spell[$field]) && is_string($spell[$field])) {
                // Only decode if it starts with [ or {, otherwise leave as-is
                $trimmed = ltrim($spell[$field]);
                if (
                    ($trimmed[0] ?? '') === '{'
                    || ($trimmed[0] ?? '') === '['
                ) {
                    $decoded = json_decode($spell[$field], true);
                    // If it's valid JSON (returns array), use decoded. Else leave as-is
                    if (is_array($decoded)) {
                        $spell[$field] = $decoded;
                    }
                }
            }
        }
        // End flatten

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

    /**
     * Generate a JWT token for Wings API access.
     *
     * @param Request $request The HTTP request
     * @param string $uuidShort The server's short UUID
     *
     * @return Response The API response
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/jwt',
        summary: 'Generate server JWT token',
        description: 'Generate a JWT token for Wings API access with user permissions and WebSocket connection details.',
        tags: ['User - Server Management'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'JWT token generated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/JwtResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to generate JWT token'),
        ]
    )]
    public function generateServerJwt(Request $request, string $uuidShort): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server details
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'NOT_FOUND', 404);
        }

        // Check if user is owner (full access)
        $isOwner = (int) $server['owner_id'] === (int) $user['id'];

        // Check permissions for non-owners (websocket.connect is required for JWT generation)
        if (!$isOwner) {
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::WEBSOCKET_CONNECT);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        try {
            $scheme = $node['scheme'];
            $host = $node['fqdn'];
            $port = $node['daemonListen'];
            $token = $node['daemon_token'];

            // Create JWT service instance
            $jwtService = new JwtService(
                $token, // Node secret
                App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'), // Panel URL
                $scheme . '://' . $host . ':' . $port // Wings URL
            );

            // Get user permissions
            $permissions = $this->getUserServerPermissions($user['id'], $server['id'], $user['uuid']);

            // Generate JWT token
            $token = $jwtService->generateApiToken(
                $server['uuid'],
                $user['uuid'],
                $permissions
            );

            if ($scheme == 'http') {
                $scheme = 'ws';
            } else {
                $scheme = 'wss';
            }

            return ApiResponse::success([
                'token' => $token,
                'expires_at' => time() + 600, // 10 minutes from now
                'server_uuid' => $server['uuid'],
                'user_uuid' => $user['uuid'],
                'permissions' => $permissions,
                'connection_string' => $scheme . '://' . $host . ':' . $port . '/api/servers/' . $server['uuid'] . '/ws',
            ], 'JWT token generated successfully', 200);

        } catch (\Exception $e) {
            return ApiResponse::error('Failed to generate JWT token: ' . $e->getMessage(), 'JWT_GENERATION_FAILED', 500);
        }
    }

    /**
     * Update server information (name and description only).
     *
     * @param Request $request The HTTP request
     * @param string $uuidShort The server's short UUID
     *
     * @return Response The update response
     */
    #[OA\Put(
        path: '/api/user/servers/{uuidShort}',
        summary: 'Update server',
        description: 'Update server information including name, description, startup command, Docker image, and variables. Syncs changes with Wings daemon.',
        tags: ['User - Server Management'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ServerUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServerUpdateResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID, invalid data, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server or variable not editable'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 422, description: 'Unprocessable entity - Invalid variable values or unknown variables'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update server'),
        ]
    )]
    public function updateServer(Request $request, string $uuidShort): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server details
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'NOT_FOUND', 404);
        }

        // Check if user is owner (full access)
        $isOwner = (int) $server['owner_id'] === (int) $user['id'];

        // Get request data
        $data = json_decode($request->getContent(), true);
        if (!$data || !is_array($data)) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST', 400);
        }

        // Save wipe_files flag early (before any processing that might modify $data)
        $wipeFilesRequested = isset($data['wipe_files']) && ($data['wipe_files'] === true || $data['wipe_files'] === 'true' || $data['wipe_files'] === 1 || $data['wipe_files'] === '1');

        // Check permissions for non-owners
        if (!$isOwner) {
            // Check for settings.rename permission if updating name or description
            if (isset($data['name']) || isset($data['description'])) {
                $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SETTINGS_RENAME);
                if ($permissionCheck !== null) {
                    return $permissionCheck;
                }
            }

            // Check for startup.update permission if updating startup
            if (isset($data['startup'])) {
                $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::STARTUP_UPDATE);
                if ($permissionCheck !== null) {
                    return $permissionCheck;
                }
            }

            // Check for startup.docker-image permission if updating image
            if (isset($data['image'])) {
                $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::STARTUP_DOCKER_IMAGE);
                if ($permissionCheck !== null) {
                    return $permissionCheck;
                }
            }
        }

        // Validate and sanitize input
        $updateData = [];
        $spellChanged = false;
        $oldSpellId = (int) $server['spell_id'];
        $newRealmId = null;

        // Check early if spell is changing (needed for startup check below)
        $isSpellChanging = false;
        if (isset($data['spell_id'])) {
            $newSpellId = (int) $data['spell_id'];
            $isSpellChanging = ($newSpellId !== $oldSpellId && $newSpellId > 0);
        }

        // Check if egg/spell changes are allowed globally
        if (isset($data['spell_id'])) {
            $app = App::getInstance(true);
            $allowEggChange = $app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_EGG_CHANGE, 'false');
            if ($allowEggChange !== 'true' && $allowEggChange !== true && $allowEggChange !== '1' && $allowEggChange !== 1) {
                return ApiResponse::error('Egg/spell changes are currently disabled by the administrator', 'EGG_CHANGE_DISABLED', 403);
            }

            // Validate spell exists
            $newSpell = Spell::getSpellById((int) $data['spell_id']);
            if (!$newSpell) {
                return ApiResponse::error('Invalid spell_id: Spell not found', 'INVALID_SPELL_ID', 404);
            }

            // Get the new spell's realm_id
            $newRealmId = (int) $newSpell['realm_id'];

            // Verify the new realm exists (for realm verification)
            $newRealm = \App\Chat\Realm::getById($newRealmId);
            if (!$newRealm) {
                return ApiResponse::error('Invalid realm_id: Realm not found for the selected spell', 'INVALID_REALM_ID', 404);
            }

            // Update realm_id to match the new spell's realm (allow cross-realm spell changes)
            if ($newRealmId !== (int) $server['realms_id']) {
                $updateData['realms_id'] = $newRealmId;
            }
        }

        // Check if startup command changes are allowed globally (only applies to startup, not Docker image)
        // Skip this check if spell is changing - allow startup/image changes during spell change
        if (isset($data['startup']) && !$isSpellChanging) {
            $app = App::getInstance(true);
            $allowStartupChange = $app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE, 'true');
            if ($allowStartupChange !== 'true' && $allowStartupChange !== true && $allowStartupChange !== '1' && $allowStartupChange !== 1) {
                return ApiResponse::error('Startup changes are currently disabled by the administrator', 'STARTUP_CHANGE_DISABLED', 403);
            }
        }

        // Allow updating name, description, startup, image, spell_id
        if (isset($data['name'])) {
            $name = trim($data['name']);
            if (empty($name)) {
                return ApiResponse::error('Server name cannot be empty', 'INVALID_NAME', 400);
            }
            if (strlen($name) > 255) {
                return ApiResponse::error('Server name is too long (max 255 characters)', 'NAME_TOO_LONG', 400);
            }
            $updateData['name'] = $name;
        }

        if (isset($data['description'])) {
            $description = trim($data['description']);
            if (strlen($description) > 1000) {
                return ApiResponse::error('Server description is too long (max 1000 characters)', 'DESCRIPTION_TOO_LONG', 400);
            }
            $updateData['description'] = $description;
        }

        if (isset($data['startup'])) {
            $startup = (string) $data['startup'];
            $startup = trim($startup);
            if ($startup === '') {
                return ApiResponse::error('Startup command cannot be empty', 'INVALID_STARTUP', 400);
            }
            if (strlen($startup) > 65535) {
                return ApiResponse::error('Startup command is too long (max 65535 characters)', 'STARTUP_TOO_LONG', 400);
            }
            $updateData['startup'] = $startup;
        }

        if (isset($data['image'])) {
            $image = (string) $data['image'];
            $image = trim($image);
            if ($image === '') {
                return ApiResponse::error('Docker image cannot be empty', 'INVALID_IMAGE', 400);
            }
            if (strlen($image) > 191) {
                return ApiResponse::error('Docker image is too long (max 191 characters)', 'IMAGE_TOO_LONG', 400);
            }
            $updateData['image'] = $image;
        }

        if (isset($data['spell_id'])) {
            $spellId = (int) $data['spell_id'];
            if ($spellId <= 0) {
                return ApiResponse::error('Invalid spell_id', 'INVALID_SPELL_ID', 400);
            }
            if ($spellId !== $oldSpellId) {
                $spellChanged = true;
            }
            $updateData['spell_id'] = $spellId;
        }

        // Normalize variables payload if provided
        $variablesPayload = null;
        if (isset($data['variables'])) {
            if (!is_array($data['variables'])) {
                return ApiResponse::error('Invalid variables payload', 'INVALID_VARIABLES', 400);
            }
            $variablesPayload = [];
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
        }

        // Check if there are any allowed fields to update
        if (empty($updateData) && $variablesPayload === null) {
            return ApiResponse::error('No valid fields to update', 'NO_UPDATES', 400);
        }

        // Additional security check: only allow specific fields
        $allowedFields = ['name', 'description', 'startup', 'image', 'spell_id', 'realms_id'];
        $updateData = array_intersect_key($updateData, array_flip($allowedFields));

        // Double check that we only have allowed fields
        foreach ($updateData as $field => $value) {
            if (!in_array($field, $allowedFields)) {
                return ApiResponse::error('Invalid field: ' . $field, 'INVALID_FIELD', 400);
            }
        }

        // Handle spell change: delete old variables and create new ones with user-provided values
        if ($spellChanged) {
            // Delete all old server variables
            $deleted = ServerVariable::deleteServerVariablesByServerId((int) $server['id']);
            if (!$deleted) {
                // Log but don't fail - variables might not exist
                App::getInstance(true)->getLogger()->warning('Failed to delete old variables for server ID: ' . $server['id']);
            }

            // Get new spell variables
            $newSpellId = (int) $updateData['spell_id'];
            $newSpellVariables = SpellVariable::getVariablesBySpellId($newSpellId);

            // Create new server variables with values from variables payload (user-provided)
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

                    $sv = $spellVarMap[$varId];

                    // Validate variable value
                    $error = $this->validateVariableValue($val, (string) ($sv['rules'] ?? ''), (string) ($sv['field_type'] ?? ''));
                    if ($error !== null) {
                        return ApiResponse::error('Validation failed for ' . $sv['env_variable'] . ': ' . $error, 'INVALID_VARIABLE_VALUE', 422);
                    }

                    $validatedVariables[] = [
                        'variable_id' => $varId,
                        'variable_value' => $val,
                    ];
                }

                if (!empty($validatedVariables)) {
                    $created = ServerVariable::createOrUpdateServerVariables((int) $server['id'], $validatedVariables);
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
                    $created = ServerVariable::createOrUpdateServerVariables((int) $server['id'], $newVariables);
                    if (!$created) {
                        return ApiResponse::error('Failed to create new server variables', 'VARIABLES_CREATE_FAILED', 500);
                    }
                }
            }

            // Update startup command from new spell if not explicitly provided
            $newSpell = Spell::getSpellById($newSpellId);
            if ($newSpell) {
                if (!isset($data['startup']) && !empty($newSpell['startup'])) {
                    $updateData['startup'] = $newSpell['startup'];
                }
                // Don't auto-update image - let user choose or keep existing
            }
        }

        // Update the server fields, if any
        if (!empty($updateData)) {
            $updated = Server::updateServerById($server['id'], $updateData);
            if (!$updated) {
                return ApiResponse::error('Failed to update server', 'UPDATE_FAILED', 500);
            }
        }

        // Update variables if provided (only if spell hasn't changed)
        if ($variablesPayload !== null && !$spellChanged) {
            // Fetch spell variables for this server's spell
            $activeSpellId = isset($updateData['spell_id']) ? (int) $updateData['spell_id'] : (int) $server['spell_id'];
            $spellVariables = SpellVariable::getVariablesBySpellId($activeSpellId);
            $spellVarMap = [];
            foreach ($spellVariables as $sv) {
                $spellVarMap[(int) $sv['id']] = $sv;
            }

            // Validate each variable against its rules and editability
            foreach ($variablesPayload as $item) {
                $varId = (int) $item['variable_id'];
                $val = (string) $item['variable_value'];
                if (!isset($spellVarMap[$varId])) {
                    return ApiResponse::error('Unknown variable provided: ' . $varId, 'UNKNOWN_VARIABLE', 422);
                }
                $sv = $spellVarMap[$varId];
                // Ensure variable belongs to this spell and is editable
                if ((int) $sv['spell_id'] !== $activeSpellId) {
                    return ApiResponse::error('Variable does not belong to this server spell: ' . $sv['env_variable'], 'INVALID_VARIABLE_SCOPE', 422);
                }
                if ((int) $sv['user_editable'] !== 1) {
                    return ApiResponse::error('Variable is not editable: ' . $sv['env_variable'], 'VARIABLE_NOT_EDITABLE', 403);
                }

                $error = $this->validateVariableValue($val, (string) ($sv['rules'] ?? ''), (string) ($sv['field_type'] ?? ''));
                if ($error !== null) {
                    return ApiResponse::error('Validation failed for ' . $sv['env_variable'] . ': ' . $error, 'INVALID_VARIABLE_VALUE', 422);
                }
            }

            $ok = ServerVariable::updateSpecificServerVariables((int) $server['id'], $variablesPayload);
            if (!$ok) {
                return ApiResponse::error('Failed to update server variables', 'VARIABLES_UPDATE_FAILED', 500);
            }
        }

        // Log the update
        App::getInstance(true)->getLogger()->debug('Server updated');
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Get updated server data
        $updatedServer = Server::getServerById($server['id']);
        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new \App\Services\Wings\Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            // If spell changed, trigger reinstall instead of just sync
            if ($spellChanged) {
                // Log wipe_files status (debug level)
                App::getInstance(true)->getLogger()->debug('Spell change detected. wipe_files requested: ' . ($wipeFilesRequested ? 'true' : 'false'));

                // Wipe files if requested before reinstalling
                if ($wipeFilesRequested) {
                    App::getInstance(true)->getLogger()->debug('Wiping server files before spell change reinstall');
                    $this->wipeServerFiles($wings, $server['uuid']);
                }

                $response = $wings->getServer()->reinstallServer($server['uuid']);
            } else {
                $response = $wings->getServer()->syncServer($server['uuid']);
            }

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

                return ApiResponse::error('Failed to send power action to Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Emit event if spell changed (reinstall)
            if ($spellChanged) {
                global $eventManager;
                if (isset($eventManager) && $eventManager !== null) {
                    $eventManager->emit(
                        ServerEvent::onServerReinstalled(),
                        [
                            'user_uuid' => $user['uuid'],
                            'server_uuid' => $server['uuid'],
                        ]
                    );
                }
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send power action to Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to send power action to Wings: ' . $e->getMessage(), 'FAILED_TO_SEND_POWER_ACTION_TO_WINGS', 500);
        }

        // Log activity
        $this->logActivity($server, $node, 'server_updated', [
            'server_uuid' => $server['uuid'],
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerUserEvent::onServerUserUpdated(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
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
                'updated_at' => $updatedServer['updated_at'] ?? null,
            ],
        ], 'Server updated successfully', 200);
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/reinstall',
        summary: 'Reinstall server',
        description: 'Reinstall a server using Wings daemon. This will reset the server to its initial state. Optionally wipe all files before reinstalling.',
        tags: ['User - Server Management'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'wipe_files', type: 'boolean', description: 'Whether to delete all server files before reinstalling', default: false),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server reinstalled successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'server', type: 'object', properties: [
                            new OA\Property(property: 'id', type: 'integer'),
                            new OA\Property(property: 'uuid', type: 'string'),
                            new OA\Property(property: 'uuidShort', type: 'string'),
                            new OA\Property(property: 'name', type: 'string'),
                            new OA\Property(property: 'description', type: 'string', nullable: true),
                            new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to reinstall server'),
        ]
    )]
    public function reinstallServer(Request $request, string $uuidShort): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server details
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'NOT_FOUND', 404);
        }

        // Check if user is owner (full access)
        $isOwner = (int) $server['owner_id'] === (int) $user['id'];

        // Check permissions for non-owners (reinstall is a critical operation)
        if (!$isOwner) {
            // Check for settings.reinstall permission
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SETTINGS_REINSTALL);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }
        }

        // Get request data for wipe_files option
        $data = json_decode($request->getContent(), true);
        $wipeFiles = isset($data['wipe_files']) && ($data['wipe_files'] === true || $data['wipe_files'] === 'true' || $data['wipe_files'] === 1);

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Get updated server data
        $updatedServer = Server::getServerById($server['id']);
        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new \App\Services\Wings\Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            // Wipe files if requested
            if ($wipeFiles) {
                $this->wipeServerFiles($wings, $server['uuid']);
            }

            $response = $wings->getServer()->reinstallServer($server['uuid']);

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

                return ApiResponse::error('Failed to send power action to Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send power action to Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to send power action to Wings: ' . $e->getMessage(), 'FAILED_TO_SEND_POWER_ACTION_TO_WINGS', 500);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerReinstalled(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                ]
            );
        }

        // Log activity
        $this->logActivity($server, $node, 'server_reinstalled', [
            'server_uuid' => $server['uuid'],
        ], $user);

        return ApiResponse::success([
            'server' => [
                'id' => $updatedServer['id'],
                'uuid' => $updatedServer['uuid'],
                'uuidShort' => $updatedServer['uuidShort'],
                'name' => $updatedServer['name'],
                'description' => $updatedServer['description'],
                'updated_at' => $updatedServer['updated_at'] ?? null,
            ],
        ], 'Server reinstalled successfully', 200);
    }

    /**
     * Send a console command to the server via Wings WebSocket.
     *
     * @param Request $request The HTTP request
     * @param string $uuidShort The server's short UUID
     *
     * @return Response The API response
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/command',
        summary: 'Send console command',
        description: 'Send a console command to the server via Wings daemon WebSocket connection.',
        tags: ['User - Server Management'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'command', type: 'string', description: 'Console command to execute'),
                ],
                required: ['command']
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Command sent successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                        new OA\Property(property: 'command', type: 'string', description: 'Command that was sent'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing command or server offline'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied or insufficient permissions'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to send command'),
        ]
    )]
    public function sendCommand(Request $request, string $uuidShort): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server details
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'NOT_FOUND', 404);
        }

        // Check if user is owner (full access)
        $isOwner = (int) $server['owner_id'] === (int) $user['id'];

        // Check permissions for non-owners (control.console is required for sending commands)
        if (!$isOwner) {
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::CONTROL_CONSOLE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }
        }

        // Get request data
        $data = json_decode($request->getContent(), true);
        if (!$data || !is_array($data)) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST', 400);
        }

        // Validate command
        if (!isset($data['command']) || !is_string($data['command'])) {
            return ApiResponse::error('Command is required', 'COMMAND_REQUIRED', 400);
        }

        $command = trim($data['command']);
        if ($command === '') {
            return ApiResponse::error('Command cannot be empty', 'COMMAND_EMPTY', 400);
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        try {
            $scheme = $node['scheme'];
            $host = $node['fqdn'];
            $port = $node['daemonListen'];
            $token = $node['daemon_token'];

            $timeout = (int) 30;
            $wings = new \App\Services\Wings\Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            // Send command to Wings daemon
            $response = $wings->getServer()->sendCommands($server['uuid'], [$command]);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($response->getStatusCode() === 400) {
                    return ApiResponse::error('Invalid command or server offline: ' . $error, 'INVALID_COMMAND', 400);
                } elseif ($response->getStatusCode() === 401) {
                    return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
                } elseif ($response->getStatusCode() === 403) {
                    return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
                }

                return ApiResponse::error('Failed to send command to Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log the command execution
            $node = Node::getNodeById($server['node_id']);
            if (!$node) {
                return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
            }
            $this->logActivity($server, $node, 'command_sent', [
                'command' => $command,
            ], $user);

            return ApiResponse::success([
                'message' => 'Command sent successfully',
                'command' => $command,
            ], 'Command sent successfully', 200);

        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send command to Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to send command: ' . $e->getMessage(), 'COMMAND_SEND_FAILED', 500);
        }
    }

    /**
     * Validate a variable value against a rules string (e.g., "required|string|max:20", "required|regex:/^foo$/").
     * Returns an error message string if invalid, or null if valid.
     */
    private function validateVariableValue(string $value, string $rules, string $fieldType = ''): ?string
    {
        $rules = trim($rules);
        if ($rules === '') {
            return null;
        }
        $parts = explode('|', $rules);
        $required = in_array('required', $parts, true);
        $nullable = in_array('nullable', $parts, true);
        $isNumeric = in_array('numeric', $parts, true) || in_array('integer', $parts, true);
        // string rule is informational for our basic validator

        if ($value === '') {
            if ($required) {
                return 'This field is required';
            }
            if ($nullable) {
                return null;
            }

            // Not required and not nullable but empty -> treat as valid to avoid breaking existing behavior
            return null;
        }

        // Numeric check
        if ($isNumeric) {
            if (!preg_match('/^\d+$/', $value)) {
                return 'Must be numeric';
            }
        }

        foreach ($parts as $part) {
            if (preg_match('/^max:(\d+)$/', $part, $m)) {
                $limit = (int) $m[1];
                if ($isNumeric) {
                    if ((int) $value > $limit) {
                        return 'Must be less than or equal to ' . $limit;
                    }
                } else {
                    if (strlen($value) > $limit) {
                        return 'Must be at most ' . $limit . ' characters';
                    }
                }
                continue;
            }
            if (preg_match('/^min:(\d+)$/', $part, $m)) {
                $limit = (int) $m[1];
                if ($isNumeric) {
                    if ((int) $value < $limit) {
                        return 'Must be at least ' . $limit;
                    }
                } else {
                    if (strlen($value) < $limit) {
                        return 'Must be at least ' . $limit . ' characters';
                    }
                }
                continue;
            }
            if (str_starts_with($part, 'regex:')) {
                $pattern = substr($part, strlen('regex:'));
                // Expect pattern to include delimiters (e.g., /.../)
                if (@preg_match($pattern, '') === false) {
                    return 'Invalid regex rule';
                }
                if (preg_match($pattern, $value) !== 1) {
                    return 'Value does not match required format';
                }
                continue;
            }
        }

        return null;
    }

    /**
     * Get user permissions for a specific server.
     * Returns full permissions for server owners, or subuser permissions for subusers.
     *
     * @param int $userId The user ID
     * @param int $serverId The server ID
     *
     * @return array The user's permissions
     */
    private function getUserServerPermissions(int $userId, int $serverId, string $userUuid): array
    {
        // Get server to check ownership
        $server = Server::getServerById($serverId);
        if (!$server) {
            return [];
        }

        // Full permissions array (for owner and subuser)
        $fullPermissions = [
            // Basic connection - REQUIRED for any WebSocket access
            'websocket.connect',

            // Console/Command control
            'control.console',           // Send console commands

            // Power control
            'control.start',             // Start server
            'control.stop',              // Stop server
            'control.restart',           // Restart server
            'control.kill',              // Kill server

            // Server management
            'control.settings',          // Modify server settings
            'control.startup',           // Modify startup command
            'control.sftp',              // SFTP access
            'control.database',          // Database management
            'control.backup',            // Backup management
            'control.allocation',        // Allocation management

            // File operations
            'files.read',                // Read files
            'files.write',               // Write files
            'files.delete',              // Delete files
            'files.upload',              // Upload files
            'files.download',            // Download files

            // Receive events
            'admin.websocket.errors',    // See detailed error messages
            'admin.websocket.install',   // See installation output
            'admin.websocket.transfer',  // See transfer logs
            'backup.read',               // See backup events
        ];

        // If user is the server owner, give full permissions
        if ((int) $server['owner_id'] === $userId) {
            return $fullPermissions;
        }

        // Check if user is a subuser
        $subuser = Subuser::getSubuserByUserAndServer($userId, $serverId);
        if ($subuser) {
            // Get actual subuser permissions from database
            $subuserPerms = json_decode($subuser['permissions'] ?? '[]', true) ?: [];

            // Always include websocket.connect - it's required for JWT/WebSocket access
            // The actual permission checks happen in generateServerJwt via checkPermission
            // Here we just return what they're allowed to do
            return $subuserPerms;
        }

        // Admin check required
        if (PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_SERVERS_EDIT)) {
            return $fullPermissions;
        }

        // User is neither owner nor subuser
        return [];
    }

    /**
     * Helper method to wipe all server files before reinstall.
     * Lists all files in root directory and deletes them.
     */
    private function wipeServerFiles(\App\Services\Wings\Wings $wings, string $serverUuid): void
    {
        try {
            // List all files in root directory
            $listResponse = $wings->getServer()->listDirectory($serverUuid, '/');
            if (!$listResponse->isSuccessful()) {
                App::getInstance(true)->getLogger()->warning('Failed to list server files for wipe: ' . $listResponse->getError());

                return;
            }

            $responseData = $listResponse->getData();

            // Handle different response structures
            // Wings might return array directly or wrapped in 'contents' key
            if (is_array($responseData) && isset($responseData['contents']) && is_array($responseData['contents'])) {
                $files = $responseData['contents'];
            } elseif (is_array($responseData)) {
                $files = $responseData;
            } else {
                $files = [];
            }

            if (empty($files) || !is_array($files)) {
                // No files to delete, which is fine
                App::getInstance(true)->getLogger()->info('No files found in server root directory to wipe');

                return;
            }

            App::getInstance(true)->getLogger()->debug('Found ' . count($files) . ' items in server root directory');

            // Extract file names from the list (Wings returns file objects with 'name' property)
            // Wings structure: { name: string, file: boolean, directory: boolean, mime: string, ... }
            $fileNames = [];
            foreach ($files as $file) {
                if (is_array($file)) {
                    // Check for name property (most common)
                    if (isset($file['name'])) {
                        $fileNames[] = $file['name'];
                    } elseif (isset($file['path'])) {
                        // Fallback to path if name not available
                        $fileNames[] = basename($file['path']);
                    } else {
                        // Log unexpected structure for debugging
                        App::getInstance(true)->getLogger()->debug('Unexpected file structure in wipe: ' . json_encode($file));
                    }
                } elseif (is_string($file)) {
                    $fileNames[] = $file;
                }
            }

            // Log what we're about to delete (debug level for details, info for summary)
            if (empty($fileNames)) {
                App::getInstance(true)->getLogger()->warning('No file names extracted from Wings response. Raw response structure: ' . json_encode(array_slice($files, 0, 3)));
            } else {
                App::getInstance(true)->getLogger()->debug('Wiping server files: Found ' . count($fileNames) . ' items to delete: ' . implode(', ', array_slice($fileNames, 0, 10)) . (count($fileNames) > 10 ? '...' : ''));
            }

            if (empty($fileNames)) {
                return;
            }

            // Delete all files in root
            $deleteResponse = $wings->getServer()->deleteFiles($serverUuid, '/', $fileNames);
            if (!$deleteResponse->isSuccessful()) {
                App::getInstance(true)->getLogger()->warning('Failed to delete some files during wipe: ' . $deleteResponse->getError());
                // Continue anyway - reinstall will proceed
            } else {
                App::getInstance(true)->getLogger()->info('Server files wiped before reinstall: ' . count($fileNames) . ' items deleted');
            }
        } catch (\Exception $e) {
            // Log error but don't fail reinstall
            App::getInstance(true)->getLogger()->error('Error wiping server files: ' . $e->getMessage());
        }
    }

    /**
     * Helper method to log server activity.
     */
    private function logActivity(array $server, array $node, string $event, array $metadata, array $user): void
    {
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'ip' => $user['last_ip'],
            'event' => $event,
            'metadata' => json_encode($metadata),
        ]);
    }
}
