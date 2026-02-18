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
use App\Chat\Node;
use App\Chat\Task;
use App\Chat\User;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Backup;
use App\Chat\Server;
use App\Chat\Subuser;
use App\Chat\Activity;
use App\Chat\Location;
use App\Chat\Allocation;
use App\Chat\UserSshKey;
use App\Config\ConfigInterface;
use App\Helpers\UUIDUtils;
use App\Chat\SpellVariable;
use App\Chat\ServerDatabase;
use App\Chat\ServerSchedule;
use App\Chat\ServerVariable;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\DatabaseInstance;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\UserEvent;
use App\Plugins\Events\Events\NodesEvent;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use App\Plugins\Events\Events\UserSshKeyEvent;
use Symfony\Component\HttpFoundation\Response;

class PterodactylImporterController
{
    #[OA\Get(
        path: '/api/admin/pterodactyl-importer/prerequisites',
        summary: 'Check prerequisites for Pterodactyl import',
        description: 'Verify that the panel meets the requirements for importing Pterodactyl data. Checks user count (must be <= 1), nodes (must be 0), locations (must be 0), realms (must be 0), spells (must be 0), servers (must be 0), databases (must be 0), and allocations (must be 0).',
        tags: ['Admin - Pterodactyl Importer'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Prerequisites check completed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'users_count', type: 'integer', description: 'Current number of users', example: 1),
                        new OA\Property(property: 'nodes_count', type: 'integer', description: 'Current number of nodes', example: 0),
                        new OA\Property(property: 'locations_count', type: 'integer', description: 'Current number of locations', example: 0),
                        new OA\Property(property: 'realms_count', type: 'integer', description: 'Current number of realms', example: 0),
                        new OA\Property(property: 'spells_count', type: 'integer', description: 'Current number of spells', example: 0),
                        new OA\Property(property: 'servers_count', type: 'integer', description: 'Current number of servers', example: 0),
                        new OA\Property(property: 'databases_count', type: 'integer', description: 'Current number of databases', example: 0),
                        new OA\Property(property: 'allocations_count', type: 'integer', description: 'Current number of allocations', example: 0),
                        new OA\Property(property: 'panel_clean', type: 'boolean', description: 'Whether all prerequisites are met', example: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function prerequisites(Request $request): Response
    {
        try {
            // Get counts for all entities
            $usersCount = User::getCount();
            $nodesCount = Node::getNodesCount();
            $locationsCount = Location::getCount();
            $realmsCount = Realm::getCount();
            $spellsCount = Spell::getSpellsCount();
            $serversCount = Server::getCount();
            $databasesCount = DatabaseInstance::getDatabasesCount();
            $allocationsCount = Allocation::getCount();

            // Check if panel is clean (all prerequisites met)
            $panelClean =
                $usersCount <= 1
                && $nodesCount === 0
                && $locationsCount === 0
                && $realmsCount === 0
                && $spellsCount === 0
                && $serversCount === 0
                && $databasesCount === 0
                && $allocationsCount === 0;

            return ApiResponse::success(
                [
                    'users_count' => $usersCount,
                    'nodes_count' => $nodesCount,
                    'locations_count' => $locationsCount,
                    'realms_count' => $realmsCount,
                    'spells_count' => $spellsCount,
                    'servers_count' => $serversCount,
                    'databases_count' => $databasesCount,
                    'allocations_count' => $allocationsCount,
                    'panel_clean' => $panelClean,
                ],
                'Prerequisites check completed',
                200
            );
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to check prerequisites: ' . $e->getMessage(), 'PREREQUISITES_CHECK_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import',
        summary: 'Import Pterodactyl data (deprecated)',
        description: 'Deprecated: Direct HTTP import is no longer supported. Use the external Pterodactyl Migration Agent instead.',
        tags: ['Admin - Pterodactyl Importer'],
        responses: [
            new OA\Response(
                response: 410,
                description: 'Deprecated - Import must be performed via the Pterodactyl Migration Agent'
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function import(Request $request): Response
    {
        return ApiResponse::error(
            'Direct HTTP import is no longer supported. Please use the Pterodactyl Migration Agent (curl -sSL https://get.featherpanel.com/stable.sh | bash).',
            'PTERODACTYL_IMPORT_DEPRECATED',
            410
        );
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-egg',
        summary: 'Import Pterodactyl egg as spell',
        description: 'Import a Pterodactyl egg (with variables) as a FeatherPanel spell. Maps nest_id to realm_id and converts egg_variables to spell_variables.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'egg',
                        type: 'object',
                        description: 'Pterodactyl egg data',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', description: 'Egg ID'),
                            new OA\Property(property: 'uuid', type: 'string', description: 'Egg UUID'),
                            new OA\Property(property: 'nest_id', type: 'integer', description: 'Nest ID (will be mapped to realm_id)'),
                            new OA\Property(property: 'author', type: 'string', description: 'Egg author'),
                            new OA\Property(property: 'name', type: 'string', description: 'Egg name'),
                            new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Egg description'),
                            new OA\Property(property: 'features', type: 'string', nullable: true, description: 'Features JSON'),
                            new OA\Property(property: 'docker_images', type: 'string', nullable: true, description: 'Docker images JSON'),
                            new OA\Property(property: 'file_denylist', type: 'string', nullable: true, description: 'File denylist JSON'),
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
                            new OA\Property(property: 'config_from', type: 'integer', nullable: true, description: 'Config from egg ID'),
                            new OA\Property(property: 'copy_script_from', type: 'integer', nullable: true, description: 'Copy script from egg ID'),
                        ]
                    ),
                    new OA\Property(
                        property: 'variables',
                        type: 'array',
                        description: 'Egg variables to import',
                        items: new OA\Items(
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'id', type: 'integer', description: 'Variable ID'),
                                new OA\Property(property: 'name', type: 'string', description: 'Variable name'),
                                new OA\Property(property: 'description', type: 'string', description: 'Variable description'),
                                new OA\Property(property: 'env_variable', type: 'string', description: 'Environment variable name'),
                                new OA\Property(property: 'default_value', type: 'string', description: 'Default value'),
                                new OA\Property(property: 'user_viewable', type: 'boolean', description: 'User viewable flag'),
                                new OA\Property(property: 'user_editable', type: 'boolean', description: 'User editable flag'),
                                new OA\Property(property: 'rules', type: 'string', nullable: true, description: 'Validation rules'),
                            ]
                        )
                    ),
                    new OA\Property(
                        property: 'nest_to_realm_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl nest_id to FeatherPanel realm_id. If not provided, will use realm_id from egg data or default to realm_id=1.',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                ],
                required: ['egg']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Egg imported successfully as spell',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'spell', ref: '#/components/schemas/Spell'),
                        new OA\Property(property: 'variables_imported', type: 'integer', description: 'Number of variables imported'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data, missing required fields, invalid realm, or UUID already exists'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Realm not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importEgg(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['egg']) || !is_array($data['egg'])) {
                return ApiResponse::error('Missing or invalid egg data', 'MISSING_EGG_DATA', 400);
            }

            $egg = $data['egg'];
            $variables = $data['variables'] ?? [];
            $nestToRealmMapping = $data['nest_to_realm_mapping'] ?? [];

            // Map nest_id to realm_id
            $nestId = $egg['nest_id'] ?? null;
            $realmId = null;

            if ($nestId !== null && isset($nestToRealmMapping[$nestId])) {
                $realmId = (int) $nestToRealmMapping[$nestId];
            } elseif (isset($egg['realm_id'])) {
                // Allow direct realm_id in egg data
                $realmId = (int) $egg['realm_id'];
            } else {
                // Default to realm_id 1 if no mapping provided
                $realmId = 1;
            }

            // Validate realm exists
            $realm = Realm::getById($realmId);
            if (!$realm) {
                return ApiResponse::error('Realm not found: ' . $realmId, 'REALM_NOT_FOUND', 404);
            }

            // Prepare spell data from egg data
            $spellData = [
                'uuid' => $egg['uuid'] ?? Spell::generateUuid(),
                'realm_id' => $realmId,
                'author' => $egg['author'] ?? 'Unknown',
                'name' => $egg['name'] ?? 'Imported Spell',
                'description' => $egg['description'] ?? null,
                'features' => $egg['features'] ?? null,
                'docker_images' => $egg['docker_images'] ?? null,
                'file_denylist' => $egg['file_denylist'] ?? null,
                'update_url' => $egg['update_url'] ?? null,
                'config_files' => $egg['config_files'] ?? null,
                'config_startup' => $egg['config_startup'] ?? null,
                'config_logs' => $egg['config_logs'] ?? null,
                'config_stop' => $egg['config_stop'] ?? null,
                'startup' => $egg['startup'] ?? null,
                'script_container' => $egg['script_container'] ?? 'alpine:3.4',
                'script_entry' => $egg['script_entry'] ?? 'ash',
                'script_is_privileged' => isset($egg['script_is_privileged']) ? (bool) $egg['script_is_privileged'] : true,
                'script_install' => $egg['script_install'] ?? null,
                'force_outgoing_ip' => isset($egg['force_outgoing_ip']) ? (bool) $egg['force_outgoing_ip'] : false,
                'config_from' => isset($egg['config_from']) ? (int) $egg['config_from'] : null,
                'copy_script_from' => isset($egg['copy_script_from']) ? (int) $egg['copy_script_from'] : null,
            ];

            // Validate required fields
            if (empty($spellData['name']) || empty($spellData['author'])) {
                return ApiResponse::error('Egg must have name and author', 'MISSING_REQUIRED_FIELDS', 400);
            }

            // Check if UUID already exists
            if (isset($spellData['uuid']) && Spell::getSpellByUuid($spellData['uuid'])) {
                return ApiResponse::error('Spell with UUID already exists: ' . $spellData['uuid'], 'UUID_ALREADY_EXISTS', 400);
            }

            // Handle optional ID for migrations (preserve original egg ID)
            if (isset($egg['id']) && is_numeric($egg['id'])) {
                $spellIdValue = (int) $egg['id'];
                if ($spellIdValue > 0) {
                    // Check if spell with this ID already exists
                    if (Spell::getSpellById($spellIdValue)) {
                        return ApiResponse::error('Spell with ID already exists: ' . $spellIdValue, 'DUPLICATE_ID', 400);
                    }
                    $spellData['id'] = $spellIdValue;
                }
            }

            // Create spell
            $spellId = Spell::createSpell($spellData);
            if (!$spellId) {
                return ApiResponse::error('Failed to create spell', 'SPELL_CREATE_FAILED', 400);
            }

            $spell = Spell::getSpellById($spellId);
            if (!$spell) {
                return ApiResponse::error('Failed to retrieve created spell', 'SPELL_RETRIEVE_FAILED', 500);
            }

            // Import variables
            $variablesImported = 0;
            $variableErrors = [];

            foreach ($variables as $var) {
                $variableData = [
                    'spell_id' => $spellId,
                    'name' => $var['name'] ?? '',
                    'description' => $var['description'] ?? '',
                    'env_variable' => $var['env_variable'] ?? '',
                    'default_value' => $var['default_value'] ?? '',
                    'user_viewable' => isset($var['user_viewable']) ? (bool) $var['user_viewable'] : true,
                    'user_editable' => isset($var['user_editable']) ? (bool) $var['user_editable'] : true,
                    'rules' => $var['rules'] ?? null,
                    'field_type' => 'text', // Pterodactyl doesn't have field_type, default to 'text'
                ];

                // Validate required fields
                if (empty($variableData['name']) || empty($variableData['env_variable'])) {
                    $variableErrors[] = 'Variable missing name or env_variable: ' . json_encode($var);
                    continue;
                }

                $varId = SpellVariable::createVariable($variableData);
                if ($varId) {
                    ++$variablesImported;
                } else {
                    $variableErrors[] = 'Failed to create variable: ' . $variableData['name'];
                }
            }

            // Log any variable import errors
            if (!empty($variableErrors)) {
                $logger = \App\App::getInstance(true)->getLogger();
                $logger->warning('Some variables failed to import for spell ' . $spell['name'] . ': ' . implode(', ', $variableErrors));
            }

            return ApiResponse::success(
                [
                    'spell' => $spell,
                    'variables_imported' => $variablesImported,
                    'variables_total' => count($variables),
                    'variable_errors' => !empty($variableErrors) ? $variableErrors : null,
                ],
                'Egg imported successfully as spell',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import egg: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import egg: ' . $e->getMessage(), 'EGG_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-node',
        summary: 'Import Pterodactyl node',
        description: 'Import a Pterodactyl node as a FeatherPanel node. Maps location_id and generates new daemon tokens.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'node',
                        type: 'object',
                        description: 'Pterodactyl node data',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', description: 'Node ID'),
                            new OA\Property(property: 'uuid', type: 'string', description: 'Node UUID'),
                            new OA\Property(property: 'public', type: 'boolean', description: 'Public node flag'),
                            new OA\Property(property: 'name', type: 'string', description: 'Node name'),
                            new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Node description'),
                            new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID (will be mapped if mapping provided)'),
                            new OA\Property(property: 'fqdn', type: 'string', description: 'Fully qualified domain name'),
                            new OA\Property(property: 'scheme', type: 'string', description: 'URL scheme (http/https)'),
                            new OA\Property(property: 'behind_proxy', type: 'boolean', description: 'Behind proxy flag'),
                            new OA\Property(property: 'maintenance_mode', type: 'boolean', description: 'Maintenance mode flag'),
                            new OA\Property(property: 'memory', type: 'integer', description: 'Memory limit in MB'),
                            new OA\Property(property: 'memory_overallocate', type: 'integer', description: 'Memory overallocation percentage'),
                            new OA\Property(property: 'disk', type: 'integer', description: 'Disk limit in MB'),
                            new OA\Property(property: 'disk_overallocate', type: 'integer', description: 'Disk overallocation percentage'),
                            new OA\Property(property: 'upload_size', type: 'integer', description: 'Upload size limit in MB'),
                            new OA\Property(property: 'daemonListen', type: 'integer', description: 'Daemon listen port'),
                            new OA\Property(property: 'daemonSFTP', type: 'integer', description: 'Daemon SFTP port'),
                            new OA\Property(property: 'daemonBase', type: 'string', description: 'Daemon base directory'),
                        ]
                    ),
                    new OA\Property(
                        property: 'location_to_location_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl location_id to FeatherPanel location_id. If not provided, will use location_id from node data.',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'generate_new_tokens',
                        type: 'boolean',
                        description: 'Whether to generate new daemon tokens (default: true). Set to false to preserve original tokens (not recommended).',
                        default: true
                    ),
                ],
                required: ['node']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Node imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'node', ref: '#/components/schemas/Node'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data, missing required fields, invalid location, or UUID already exists'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Location not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importNode(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['node']) || !is_array($data['node'])) {
                return ApiResponse::error('Missing or invalid node data', 'MISSING_NODE_DATA', 400);
            }

            $node = $data['node'];
            $locationToLocationMapping = $data['location_to_location_mapping'] ?? [];
            $generateNewTokens = isset($data['generate_new_tokens']) ? (bool) $data['generate_new_tokens'] : true;

            // Map location_id
            $locationId = $node['location_id'] ?? null;
            if ($locationId !== null && isset($locationToLocationMapping[$locationId])) {
                $locationId = (int) $locationToLocationMapping[$locationId];
            } elseif (isset($node['location_id'])) {
                $locationId = (int) $node['location_id'];
            } else {
                return ApiResponse::error('Missing location_id', 'MISSING_LOCATION_ID', 400);
            }

            // Validate location exists
            $location = Location::getById($locationId);
            if (!$location) {
                return ApiResponse::error('Location not found: ' . $locationId, 'LOCATION_NOT_FOUND', 404);
            }

            // Prepare node data from Pterodactyl node data
            $nodeData = [
                'uuid' => $node['uuid'] ?? Node::generateUuid(),
                'name' => $node['name'] ?? 'Imported Node',
                'description' => $node['description'] ?? null,
                'location_id' => $locationId,
                'fqdn' => $node['fqdn'] ?? '',
                'scheme' => $node['scheme'] ?? 'https',
                'public' => isset($node['public']) ? (bool) $node['public'] : true,
                'behind_proxy' => isset($node['behind_proxy']) ? (bool) $node['behind_proxy'] : false,
                'maintenance_mode' => isset($node['maintenance_mode']) ? (bool) $node['maintenance_mode'] : false,
                'memory' => isset($node['memory']) ? (int) $node['memory'] : 0,
                'memory_overallocate' => isset($node['memory_overallocate']) ? (int) $node['memory_overallocate'] : 0,
                'disk' => isset($node['disk']) ? (int) $node['disk'] : 0,
                'disk_overallocate' => isset($node['disk_overallocate']) ? (int) $node['disk_overallocate'] : 0,
                'upload_size' => isset($node['upload_size']) ? (int) $node['upload_size'] : 100,
                'daemonListen' => isset($node['daemonListen']) ? (int) $node['daemonListen'] : 8080,
                'daemonSFTP' => isset($node['daemonSFTP']) ? (int) $node['daemonSFTP'] : 2022,
                'daemonBase' => $node['daemonBase'] ?? '/var/lib/pterodactyl/volumes',
                'public_ip_v4' => $node['public_ip_v4'] ?? null,
                'public_ip_v6' => $node['public_ip_v6'] ?? null,
            ];

            // Validate required fields
            if (empty($nodeData['name']) || empty($nodeData['fqdn'])) {
                return ApiResponse::error('Node must have name and fqdn', 'MISSING_REQUIRED_FIELDS', 400);
            }

            // Validate IP addresses if provided
            if ($nodeData['public_ip_v4'] !== null && !filter_var($nodeData['public_ip_v4'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return ApiResponse::error('public_ip_v4 must be a valid IPv4 address', 'INVALID_IPV4', 400);
            }
            if ($nodeData['public_ip_v6'] !== null && !filter_var($nodeData['public_ip_v6'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                return ApiResponse::error('public_ip_v6 must be a valid IPv6 address', 'INVALID_IPV6', 400);
            }

            // Check if UUID already exists
            if (isset($nodeData['uuid']) && Node::getNodeByUuid($nodeData['uuid'])) {
                return ApiResponse::error('Node with UUID already exists: ' . $nodeData['uuid'], 'UUID_ALREADY_EXISTS', 400);
            }

            // Handle optional ID for migrations (preserve original node ID)
            if (isset($node['id']) && is_numeric($node['id'])) {
                $nodeIdValue = (int) $node['id'];
                if ($nodeIdValue > 0) {
                    // Check if node with this ID already exists
                    if (Node::getNodeById($nodeIdValue)) {
                        return ApiResponse::error('Node with ID already exists: ' . $nodeIdValue, 'DUPLICATE_ID', 400);
                    }
                    $nodeData['id'] = $nodeIdValue;
                }
            }

            // Generate new daemon tokens (recommended for security)
            if ($generateNewTokens) {
                $nodeData['daemon_token_id'] = Node::generateDaemonTokenId();
                $nodeData['daemon_token'] = Node::generateDaemonToken();
            } else {
                // Preserve original tokens (not recommended, but allowed for migration scenarios)
                $nodeData['daemon_token_id'] = $node['daemon_token_id'] ?? Node::generateDaemonTokenId();
                $nodeData['daemon_token'] = $node['daemon_token'] ?? Node::generateDaemonToken();
            }

            // Validate node data
            $requiredFields = ['name', 'fqdn', 'location_id'];
            $errors = Node::validateNodeData($nodeData, $requiredFields);
            if (!empty($errors)) {
                return ApiResponse::error(implode('; ', $errors), 'NODE_VALIDATION_FAILED', 400);
            }

            // Create node
            $nodeId = Node::createNode($nodeData);
            if (!$nodeId) {
                return ApiResponse::error('Failed to create node', 'NODE_CREATE_FAILED', 400);
            }

            $createdNode = Node::getNodeById($nodeId);
            if (!$createdNode) {
                return ApiResponse::error('Failed to retrieve created node', 'NODE_RETRIEVE_FAILED', 500);
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_node',
                'context' => 'Imported node from Pterodactyl: ' . $createdNode['name'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    NodesEvent::onNodeCreated(),
                    [
                        'node' => $createdNode,
                        'created_by' => $admin,
                    ]
                );
            }

            return ApiResponse::success(
                [
                    'node' => $createdNode,
                ],
                'Node imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import node: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import node: ' . $e->getMessage(), 'NODE_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-allocation',
        summary: 'Import Pterodactyl allocation',
        description: 'Import a Pterodactyl allocation as a FeatherPanel allocation. Maps node_id and allows unknown/non-existent server_id (will be set to null).',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'allocation',
                        type: 'object',
                        description: 'Pterodactyl allocation data',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Allocation ID (optional, for migrations)'),
                            new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID (will be mapped if mapping provided)'),
                            new OA\Property(property: 'ip', type: 'string', description: 'IP address'),
                            new OA\Property(property: 'ip_alias', type: 'string', nullable: true, description: 'IP alias'),
                            new OA\Property(property: 'port', type: 'integer', description: 'Port number', minimum: 1, maximum: 65535),
                            new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Server ID (optional, will be set to null if unknown/non-existent)'),
                            new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Notes'),
                        ]
                    ),
                    new OA\Property(
                        property: 'node_to_node_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl node_id to FeatherPanel node_id. If not provided, will use node_id from allocation data.',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'server_to_server_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl server_id to FeatherPanel server_id. If not provided, server_id will be used as-is (no existence checks).',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                ],
                required: ['allocation']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Allocation imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'allocation', type: 'object', description: 'Created allocation data'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data, missing required fields, invalid node, or IP/port already exists'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importAllocation(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['allocation']) || !is_array($data['allocation'])) {
                return ApiResponse::error('Missing or invalid allocation data', 'MISSING_ALLOCATION_DATA', 400);
            }

            $allocation = $data['allocation'];
            $nodeToNodeMapping = $data['node_to_node_mapping'] ?? [];
            $serverToServerMapping = $data['server_to_server_mapping'] ?? [];

            // Map node_id
            $nodeId = $allocation['node_id'] ?? null;
            if ($nodeId !== null && isset($nodeToNodeMapping[$nodeId])) {
                $nodeId = (int) $nodeToNodeMapping[$nodeId];
            } elseif (isset($allocation['node_id'])) {
                $nodeId = (int) $allocation['node_id'];
            } else {
                return ApiResponse::error('Missing node_id', 'MISSING_NODE_ID', 400);
            }

            // Validate node exists
            $node = Node::getNodeById($nodeId);
            if (!$node) {
                return ApiResponse::error('Node not found: ' . $nodeId, 'NODE_NOT_FOUND', 404);
            }

            // Prepare allocation data
            $allocationData = [
                'node_id' => $nodeId,
                'ip' => $allocation['ip'] ?? '',
                'port' => isset($allocation['port']) ? (int) $allocation['port'] : 0,
                'ip_alias' => $allocation['ip_alias'] ?? null,
                'notes' => $allocation['notes'] ?? null,
            ];

            // Validate required fields
            if (empty($allocationData['ip']) || $allocationData['port'] <= 0 || $allocationData['port'] > 65535) {
                return ApiResponse::error('Allocation must have valid IP and port (1-65535)', 'MISSING_REQUIRED_FIELDS', 400);
            }

            // Validate IP format
            if (!filter_var($allocationData['ip'], FILTER_VALIDATE_IP)) {
                return ApiResponse::error('Invalid IP address format', 'INVALID_IP_FORMAT', 400);
            }

            // Handle server_id - use as-is, no existence checks (servers may not exist yet)
            if (isset($allocation['server_id']) && $allocation['server_id'] !== null) {
                $pterodactylServerId = (int) $allocation['server_id'];

                // Try to map server_id if mapping provided
                if (isset($serverToServerMapping[$pterodactylServerId])) {
                    $allocationData['server_id'] = (int) $serverToServerMapping[$pterodactylServerId];
                } else {
                    // No mapping provided, use server_id as-is
                    $allocationData['server_id'] = $pterodactylServerId;
                }
            } else {
                // No server_id provided, set to null
                $allocationData['server_id'] = null;
            }

            // Check if IP/port combination already exists for this node
            if (!Allocation::isUniqueIpPort($nodeId, $allocationData['ip'], $allocationData['port'])) {
                return ApiResponse::error('Allocation with IP ' . $allocationData['ip'] . ' and port ' . $allocationData['port'] . ' already exists for this node', 'DUPLICATE_ALLOCATION', 400);
            }

            // Handle optional ID for migrations (preserve original allocation ID)
            if (isset($allocation['id']) && is_numeric($allocation['id'])) {
                $allocationIdValue = (int) $allocation['id'];
                if ($allocationIdValue > 0) {
                    // Check if allocation with this ID already exists
                    if (Allocation::getById($allocationIdValue)) {
                        return ApiResponse::error('Allocation with ID already exists: ' . $allocationIdValue, 'DUPLICATE_ID', 400);
                    }
                    $allocationData['id'] = $allocationIdValue;
                }
            }

            // Create allocation (now supports optional ID)
            $allocationId = Allocation::create($allocationData);
            if (!$allocationId) {
                return ApiResponse::error('Failed to create allocation', 'ALLOCATION_CREATE_FAILED', 400);
            }

            $createdAllocation = Allocation::getById($allocationId);
            if (!$createdAllocation) {
                return ApiResponse::error('Failed to retrieve created allocation', 'ALLOCATION_RETRIEVE_FAILED', 500);
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_allocation',
                'context' => 'Imported allocation from Pterodactyl: ' . $createdAllocation['ip'] . ':' . $createdAllocation['port'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(
                [
                    'allocation' => $createdAllocation,
                ],
                'Allocation imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import allocation: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import allocation: ' . $e->getMessage(), 'ALLOCATION_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-user',
        summary: 'Import Pterodactyl user',
        description: 'Import a Pterodactyl user as a FeatherPanel user. Maps fields and preserves bcrypt passwords. ID 1 is reserved for the main user and will be skipped.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'user',
                        type: 'object',
                        description: 'Pterodactyl user data',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'User ID (optional, for migrations). ID 1 is reserved and will be skipped.'),
                            new OA\Property(property: 'uuid', type: 'string', description: 'User UUID'),
                            new OA\Property(property: 'username', type: 'string', description: 'Username'),
                            new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Email address'),
                            new OA\Property(property: 'name_first', type: 'string', nullable: true, description: 'First name (Pterodactyl field)'),
                            new OA\Property(property: 'name_last', type: 'string', nullable: true, description: 'Last name (Pterodactyl field)'),
                            new OA\Property(property: 'password', type: 'string', description: 'Bcrypt hashed password (compatible with FeatherPanel)'),
                            new OA\Property(property: 'remember_token', type: 'string', nullable: true, description: 'Remember token'),
                            new OA\Property(property: 'external_id', type: 'string', nullable: true, description: 'External ID'),
                            new OA\Property(property: 'root_admin', type: 'boolean', description: 'Root admin flag'),
                            new OA\Property(property: 'use_totp', type: 'boolean', description: 'TOTP enabled flag'),
                            new OA\Property(property: 'totp_secret', type: 'string', nullable: true, description: 'TOTP secret'),
                            new OA\Property(property: 'language', type: 'string', nullable: true, description: 'Language code', default: 'en'),
                        ]
                    ),
                ],
                required: ['user']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'User imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'user', type: 'object', description: 'Created user data'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data, missing required fields, duplicate email/username, or ID 1 provided'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 409, description: 'Conflict - User with email/username/ID already exists'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importUser(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['user']) || !is_array($data['user'])) {
                return ApiResponse::error('Missing or invalid user data', 'MISSING_USER_DATA', 400);
            }

            $user = $data['user'];

            // Validate required fields
            $requiredFields = ['uuid', 'username', 'email', 'password'];
            $missingFields = [];
            foreach ($requiredFields as $field) {
                if (!isset($user[$field]) || trim((string) $user[$field]) === '') {
                    $missingFields[] = $field;
                }
            }
            if (!empty($missingFields)) {
                return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
            }

            // Validate email format (lenient - just check for @ and basic structure)
            $email = trim((string) $user['email']);
            if (empty($email)) {
                return ApiResponse::error('Email cannot be empty', 'INVALID_EMAIL_FORMAT', 400);
            }
            // Use PHP native email validation
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return ApiResponse::error('Invalid email address format: ' . $email, 'INVALID_EMAIL_FORMAT', 400);
            }
            $user['email'] = $email; // Use trimmed email

            // Validate UUID format
            if (!preg_match('/^[a-f0-9\-]{36}$/i', $user['uuid'])) {
                return ApiResponse::error('Invalid UUID format', 'INVALID_UUID_FORMAT', 400);
            }

            // Handle optional ID for migrations (skip ID 1 - reserved for main user)
            if (isset($user['id']) && is_numeric($user['id'])) {
                $userIdValue = (int) $user['id'];
                if ($userIdValue === 1) {
                    return ApiResponse::error('ID 1 is reserved for the main user and cannot be used', 'RESERVED_ID', 400);
                }
                if ($userIdValue > 1) {
                    // Check if user with this ID already exists
                    if (User::getUserById($userIdValue)) {
                        return ApiResponse::error('User with ID already exists: ' . $userIdValue, 'DUPLICATE_ID', 409);
                    }
                }
            }

            // Check for existing email
            if (User::getUserByEmail($user['email'])) {
                return ApiResponse::error('User with email already exists: ' . $user['email'], 'DUPLICATE_EMAIL', 409);
            }

            // Check for existing username
            if (User::getUserByUsername($user['username'])) {
                return ApiResponse::error('User with username already exists: ' . $user['username'], 'DUPLICATE_USERNAME', 409);
            }

            // Check for existing UUID
            if (User::getUserByUuid($user['uuid'])) {
                return ApiResponse::error('User with UUID already exists: ' . $user['uuid'], 'DUPLICATE_UUID', 409);
            }

            // Map Pterodactyl fields to FeatherPanel fields
            // Determine role_id: root_admin = 4 (admin), otherwise 1 (user)
            $isRootAdmin = false;
            if (isset($user['root_admin'])) {
                // Handle boolean, integer (1/0), or string ('1'/'0', 'true'/'false')
                if (is_bool($user['root_admin'])) {
                    $isRootAdmin = $user['root_admin'];
                } elseif (is_int($user['root_admin'])) {
                    $isRootAdmin = $user['root_admin'] === 1;
                } elseif (is_string($user['root_admin'])) {
                    $isRootAdmin = in_array(strtolower($user['root_admin']), ['1', 'true', 'yes'], true);
                }
            }
            $roleId = $isRootAdmin ? 4 : 1; // 4 = admin, 1 = user
			$config = App::getInstance(true)->getConfig();
			$avatar = $config->getSetting(ConfigInterface::APP_LOGO_DARK, 'https://cdn.mythical.systems/featherpanel/logo.png');
            $userData = [
                'uuid' => $user['uuid'],
                'username' => $user['username'],
                'email' => $user['email'],
                'first_name' => $user['name_first'] ?? $user['username'], // Fallback to username if name_first not provided
                'last_name' => $user['name_last'] ?? '', // Empty string if not provided
                'password' => $user['password'], // Bcrypt password from Pterodactyl (compatible)
                'remember_token' => $user['remember_token'] ?? User::generateAccountToken(),
                'avatar' => $avatar, // Default avatar
                'role_id' => $roleId, // Map root_admin to role_id (4 = admin, 1 = user)
                'external_id' => $user['external_id'] ?? null,
                'two_fa_enabled' => 'false', // Don't import 2FA - always set to false
            ];

            // Handle optional ID (skip ID 1)
            if (isset($user['id']) && is_numeric($user['id'])) {
                $userIdValue = (int) $user['id'];
                if ($userIdValue > 1) {
                    $userData['id'] = $userIdValue;
                }
            }

            // Create user
            $userId = User::createUser($userData, true);
            if (!$userId) {
                return ApiResponse::error('Failed to create user', 'USER_CREATE_FAILED', 400);
            }

            $createdUser = User::getUserById($userId);
            if (!$createdUser) {
                return ApiResponse::error('Failed to retrieve created user', 'USER_RETRIEVE_FAILED', 500);
            }

            // Remove sensitive information from response
            unset($createdUser['password'], $createdUser['remember_token'], $createdUser['two_fa_key']);

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_user',
                'context' => 'Imported user from Pterodactyl: ' . $createdUser['username'] . ' (' . $createdUser['email'] . ')',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    UserEvent::onUserCreated(),
                    [
                        'user' => $createdUser,
                        'created_by' => $admin,
                    ]
                );
            }

            return ApiResponse::success(
                [
                    'user' => $createdUser,
                ],
                'User imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import user: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import user: ' . $e->getMessage(), 'USER_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-ssh-key',
        summary: 'Import Pterodactyl SSH key',
        description: 'Import a Pterodactyl SSH key as a FeatherPanel SSH key. Maps user_id and preserves fingerprint.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'ssh_key',
                        type: 'object',
                        description: 'Pterodactyl SSH key data',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'SSH key ID (optional, for migrations)', example: 1),
                            new OA\Property(property: 'user_id', type: 'integer', description: 'User ID (will be mapped if mapping provided)'),
                            new OA\Property(property: 'name', type: 'string', description: 'SSH key name'),
                            new OA\Property(property: 'public_key', type: 'string', description: 'SSH public key'),
                            new OA\Property(property: 'fingerprint', type: 'string', nullable: true, description: 'SSH key fingerprint (will be generated if not provided)'),
                        ]
                    ),
                    new OA\Property(
                        property: 'user_to_user_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl user_id to FeatherPanel user_id. If not provided, will use user_id from SSH key data.',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                ],
                required: ['ssh_key']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'SSH key imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ssh_key', type: 'object', description: 'Created SSH key data'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data, missing required fields, invalid user, duplicate fingerprint, or invalid SSH key format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 409, description: 'Conflict - SSH key with fingerprint already exists'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importSshKey(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['ssh_key']) || !is_array($data['ssh_key'])) {
                return ApiResponse::error('Missing or invalid SSH key data', 'MISSING_SSH_KEY_DATA', 400);
            }

            $sshKey = $data['ssh_key'];
            $userToUserMapping = $data['user_to_user_mapping'] ?? [];

            // Map user_id
            $userId = $sshKey['user_id'] ?? null;
            if ($userId !== null && isset($userToUserMapping[$userId])) {
                $userId = (int) $userToUserMapping[$userId];
            } elseif (isset($sshKey['user_id'])) {
                $userId = (int) $sshKey['user_id'];
            } else {
                return ApiResponse::error('Missing user_id', 'MISSING_USER_ID', 400);
            }

            // Validate user exists
            $user = User::getUserById($userId);
            if (!$user) {
                return ApiResponse::error('User not found: ' . $userId, 'USER_NOT_FOUND', 404);
            }

            // Prepare SSH key data
            $sshKeyData = [
                'user_id' => $userId,
                'name' => $sshKey['name'] ?? '',
                'public_key' => $sshKey['public_key'] ?? '',
            ];

            // Validate required fields
            if (empty($sshKeyData['name']) || empty($sshKeyData['public_key'])) {
                return ApiResponse::error('SSH key must have name and public_key', 'MISSING_REQUIRED_FIELDS', 400);
            }

            // Validate SSH public key format
            if (!UserSshKey::isValidSshPublicKey($sshKeyData['public_key'])) {
                return ApiResponse::error('Invalid SSH public key format', 'INVALID_SSH_PUBLIC_KEY', 400);
            }

            // Handle fingerprint - use provided or generate
            if (isset($sshKey['fingerprint']) && !empty($sshKey['fingerprint'])) {
                $sshKeyData['fingerprint'] = $sshKey['fingerprint'];
            } else {
                // Generate fingerprint if not provided
                $sshKeyData['fingerprint'] = UserSshKey::generateFingerprint($sshKeyData['public_key']);
            }

            // Check if fingerprint already exists for this user
            if (UserSshKey::getUserSshKeyByFingerprint($sshKeyData['fingerprint'], $userId)) {
                return ApiResponse::error('SSH key with fingerprint already exists for this user: ' . $sshKeyData['fingerprint'], 'DUPLICATE_FINGERPRINT', 409);
            }

            // Handle optional ID for migrations (preserve original SSH key ID)
            if (isset($sshKey['id']) && is_numeric($sshKey['id'])) {
                $sshKeyIdValue = (int) $sshKey['id'];
                if ($sshKeyIdValue > 0) {
                    // Check if SSH key with this ID already exists
                    if (UserSshKey::getUserSshKeyById($sshKeyIdValue)) {
                        return ApiResponse::error('SSH key with ID already exists: ' . $sshKeyIdValue, 'DUPLICATE_ID', 409);
                    }
                    $sshKeyData['id'] = $sshKeyIdValue;
                }
            }

            // Create SSH key
            $sshKeyId = UserSshKey::createUserSshKey($sshKeyData);
            if (!$sshKeyId) {
                return ApiResponse::error('Failed to create SSH key', 'SSH_KEY_CREATE_FAILED', 400);
            }

            $createdSshKey = UserSshKey::getUserSshKeyById($sshKeyId);
            if (!$createdSshKey) {
                return ApiResponse::error('Failed to retrieve created SSH key', 'SSH_KEY_RETRIEVE_FAILED', 500);
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_ssh_key',
                'context' => 'Imported SSH key from Pterodactyl: ' . $createdSshKey['name'] . ' for user ID ' . $userId,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    UserSshKeyEvent::onUserSshKeyCreated(),
                    [
                        'ssh_key' => $createdSshKey,
                        'created_by' => $admin,
                    ]
                );
            }

            return ApiResponse::success(
                [
                    'ssh_key' => $createdSshKey,
                ],
                'SSH key imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import SSH key: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import SSH key: ' . $e->getMessage(), 'SSH_KEY_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-server',
        summary: 'Import Pterodactyl server',
        description: 'Import a Pterodactyl server as a FeatherPanel server. Maps nest_id to realms_id, egg_id to spell_id, and preserves server variables. Skips Wings API calls.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'server',
                        type: 'object',
                        description: 'Pterodactyl server data',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Server ID (optional, for migrations)', example: 2),
                            new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
                            new OA\Property(property: 'uuidShort', type: 'string', description: 'Short server UUID'),
                            new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID (will be mapped)'),
                            new OA\Property(property: 'name', type: 'string', description: 'Server name'),
                            new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Server description'),
                            new OA\Property(property: 'status', type: 'string', nullable: true, description: 'Server status'),
                            new OA\Property(property: 'skip_scripts', type: 'boolean', description: 'Skip scripts flag'),
                            new OA\Property(property: 'owner_id', type: 'integer', description: 'Owner user ID (will be mapped)'),
                            new OA\Property(property: 'memory', type: 'integer', description: 'Memory limit in MB'),
                            new OA\Property(property: 'swap', type: 'integer', description: 'Swap limit in MB'),
                            new OA\Property(property: 'disk', type: 'integer', description: 'Disk limit in MB'),
                            new OA\Property(property: 'io', type: 'integer', description: 'IO limit'),
                            new OA\Property(property: 'cpu', type: 'integer', description: 'CPU limit percentage'),
                            new OA\Property(property: 'threads', type: 'string', nullable: true, description: 'CPU threads'),
                            new OA\Property(property: 'oom_disabled', type: 'boolean', description: 'OOM disabled flag (maps to oom_killer)'),
                            new OA\Property(property: 'allocation_id', type: 'integer', description: 'Allocation ID (will be mapped)'),
                            new OA\Property(property: 'nest_id', type: 'integer', description: 'Nest ID (will be mapped to realms_id)'),
                            new OA\Property(property: 'egg_id', type: 'integer', description: 'Egg ID (will be mapped to spell_id)'),
                            new OA\Property(property: 'startup', type: 'string', description: 'Server startup command'),
                            new OA\Property(property: 'image', type: 'string', description: 'Server Docker image'),
                            new OA\Property(property: 'allocation_limit', type: 'integer', nullable: true, description: 'Allocation limit'),
                            new OA\Property(property: 'database_limit', type: 'integer', description: 'Database limit'),
                            new OA\Property(property: 'backup_limit', type: 'integer', description: 'Backup limit'),
                            new OA\Property(property: 'parent_id', type: 'integer', nullable: true, description: 'Parent server ID'),
                            new OA\Property(property: 'external_id', type: 'string', nullable: true, description: 'External ID'),
                            new OA\Property(property: 'installed_at', type: 'string', nullable: true, format: 'date-time', description: 'Installation timestamp'),
                        ]
                    ),
                    new OA\Property(
                        property: 'server_variables',
                        type: 'array',
                        description: 'Server variables array',
                        items: new OA\Items(
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Variable ID (optional)'),
                                new OA\Property(property: 'variable_id', type: 'integer', description: 'Egg variable ID (will be mapped to spell variable ID)'),
                                new OA\Property(property: 'variable_value', type: 'string', description: 'Variable value'),
                            ]
                        )
                    ),
                    new OA\Property(
                        property: 'nest_to_realm_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl nest_id to FeatherPanel realm_id',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'egg_to_spell_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl egg_id to FeatherPanel spell_id',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'node_to_node_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl node_id to FeatherPanel node_id',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'user_to_user_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl user_id to FeatherPanel user_id',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'allocation_to_allocation_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl allocation_id to FeatherPanel allocation_id',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'variable_to_variable_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl egg_variable_id to FeatherPanel spell_variable_id',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'server_to_server_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl server_id to FeatherPanel server_id (for parent_id)',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                ],
                required: ['server']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Server imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'server', type: 'object', description: 'Created server data'),
                        new OA\Property(property: 'variables_imported', type: 'integer', description: 'Number of server variables imported'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data, missing required fields, or invalid mappings'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node, user, allocation, realm, or spell not found'),
            new OA\Response(response: 409, description: 'Conflict - Server with UUID or ID already exists'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importServer(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['server']) || !is_array($data['server'])) {
                return ApiResponse::error('Missing or invalid server data', 'MISSING_SERVER_DATA', 400);
            }

            $server = $data['server'];
            $serverVariables = $data['server_variables'] ?? [];
            $nestToRealmMapping = $data['nest_to_realm_mapping'] ?? [];
            $eggToSpellMapping = $data['egg_to_spell_mapping'] ?? [];
            $nodeToNodeMapping = $data['node_to_node_mapping'] ?? [];
            $userToUserMapping = $data['user_to_user_mapping'] ?? [];
            $allocationToAllocationMapping = $data['allocation_to_allocation_mapping'] ?? [];
            $variableToVariableMapping = $data['variable_to_variable_mapping'] ?? [];
            $serverToServerMapping = $data['server_to_server_mapping'] ?? [];

            // Map nest_id to realms_id
            $nestId = $server['nest_id'] ?? null;
            $realmId = null;
            if ($nestId !== null && isset($nestToRealmMapping[$nestId])) {
                $realmId = (int) $nestToRealmMapping[$nestId];
            } else {
                return ApiResponse::error('Missing nest_to_realm_mapping for nest_id: ' . $nestId, 'MISSING_NEST_MAPPING', 400);
            }

            // Map egg_id to spell_id
            $eggId = $server['egg_id'] ?? null;
            $spellId = null;
            if ($eggId !== null && isset($eggToSpellMapping[$eggId])) {
                $spellId = (int) $eggToSpellMapping[$eggId];
            } else {
                return ApiResponse::error('Missing egg_to_spell_mapping for egg_id: ' . $eggId, 'MISSING_EGG_MAPPING', 400);
            }

            // Map node_id
            $nodeId = $server['node_id'] ?? null;
            if ($nodeId !== null && isset($nodeToNodeMapping[$nodeId])) {
                $nodeId = (int) $nodeToNodeMapping[$nodeId];
            } elseif (isset($server['node_id'])) {
                $nodeId = (int) $server['node_id'];
            } else {
                return ApiResponse::error('Missing node_id', 'MISSING_NODE_ID', 400);
            }

            // Map owner_id
            $ownerId = $server['owner_id'] ?? null;
            if ($ownerId !== null && isset($userToUserMapping[$ownerId])) {
                $ownerId = (int) $userToUserMapping[$ownerId];
            } elseif (isset($server['owner_id'])) {
                $ownerId = (int) $server['owner_id'];
            } else {
                return ApiResponse::error('Missing owner_id', 'MISSING_OWNER_ID', 400);
            }

            // Map allocation_id
            $allocationId = $server['allocation_id'] ?? null;
            if ($allocationId !== null && isset($allocationToAllocationMapping[$allocationId])) {
                $allocationId = (int) $allocationToAllocationMapping[$allocationId];
            } elseif (isset($server['allocation_id'])) {
                $allocationId = (int) $server['allocation_id'];
            } else {
                return ApiResponse::error('Missing allocation_id', 'MISSING_ALLOCATION_ID', 400);
            }

            // Validate entities exist
            if (!Node::getNodeById($nodeId)) {
                return ApiResponse::error('Node not found: ' . $nodeId, 'NODE_NOT_FOUND', 404);
            }

            if (!User::getUserById($ownerId)) {
                return ApiResponse::error('User not found: ' . $ownerId, 'USER_NOT_FOUND', 404);
            }

            if (!Allocation::getAllocationById($allocationId)) {
                return ApiResponse::error('Allocation not found: ' . $allocationId, 'ALLOCATION_NOT_FOUND', 404);
            }

            if (!Realm::getById($realmId)) {
                return ApiResponse::error('Realm not found: ' . $realmId, 'REALM_NOT_FOUND', 404);
            }

            if (!Spell::getSpellById($spellId)) {
                return ApiResponse::error('Spell not found: ' . $spellId, 'SPELL_NOT_FOUND', 404);
            }

            // Check for duplicate UUID
            if (isset($server['uuid']) && Server::getServerByUuid($server['uuid'])) {
                return ApiResponse::error('Server with UUID already exists: ' . $server['uuid'], 'DUPLICATE_UUID', 409);
            }

            // Check for duplicate UUID Short
            if (isset($server['uuidShort']) && Server::getServerByUuidShort($server['uuidShort'])) {
                return ApiResponse::error('Server with UUID Short already exists: ' . $server['uuidShort'], 'DUPLICATE_UUID_SHORT', 409);
            }

            // Prepare server data
            $serverData = [
                'uuid' => $server['uuid'] ?? UUIDUtils::generateV4(),
                'uuidShort' => $server['uuidShort'] ?? substr(str_replace('-', '', $server['uuid'] ?? UUIDUtils::generateV4()), 0, 8),
                'node_id' => $nodeId,
                'name' => $server['name'] ?? '',
                'owner_id' => $ownerId,
                'memory' => (int) ($server['memory'] ?? 0),
                'swap' => (int) ($server['swap'] ?? 0),
                'disk' => (int) ($server['disk'] ?? 0),
                'io' => (int) ($server['io'] ?? 500),
                'cpu' => (int) ($server['cpu'] ?? 0),
                'allocation_id' => $allocationId,
                'realms_id' => $realmId,
                'spell_id' => $spellId,
                'startup' => $server['startup'] ?? '',
                'image' => $server['image'] ?? '',
            ];

            // Validate required fields
            if (empty($serverData['name']) || empty($serverData['startup']) || empty($serverData['image'])) {
                return ApiResponse::error('Server must have name, startup, and image', 'MISSING_REQUIRED_FIELDS', 400);
            }

            // Add optional fields
            if (isset($server['description'])) {
                $serverData['description'] = $server['description'];
            }
            if (isset($server['status'])) {
                $serverData['status'] = $server['status'];
            }
            if (isset($server['skip_scripts'])) {
                $serverData['skip_scripts'] = (bool) $server['skip_scripts'] ? 1 : 0;
            }
            if (isset($server['threads'])) {
                $serverData['threads'] = $server['threads'];
            }
            // Map oom_disabled directly (same meaning in both systems: 1 = disabled, 0 = enabled)
            if (isset($server['oom_disabled'])) {
                $serverData['oom_disabled'] = (int) $server['oom_disabled'];
            }
            if (isset($server['allocation_limit'])) {
                $serverData['allocation_limit'] = (int) $server['allocation_limit'];
            }
            if (isset($server['database_limit'])) {
                $serverData['database_limit'] = (int) $server['database_limit'];
            }
            if (isset($server['backup_limit'])) {
                $serverData['backup_limit'] = (int) $server['backup_limit'];
            }

            if (isset($server['installed_at'])) {
                $serverData['installed_at'] = $server['installed_at'];
            }
            // Map parent_id if provided
            if (isset($server['parent_id']) && $server['parent_id'] !== null) {
                $parentId = (int) $server['parent_id'];
                if (isset($serverToServerMapping[$parentId])) {
                    $serverData['parent_id'] = (int) $serverToServerMapping[$parentId];
                } else {
                    // Try to use parent_id directly if it exists in FeatherPanel
                    $parentServer = Server::getServerById($parentId);
                    if ($parentServer) {
                        $serverData['parent_id'] = $parentId;
                    } else {
                        // Skip parent_id if mapping not found and server doesn't exist
                        $serverData['parent_id'] = null;
                    }
                }
            }
            if (isset($server['external_id'])) {
                $serverData['external_id'] = $server['external_id'];
            }

            // Handle optional ID for migrations (preserve original server ID)
            if (isset($server['id']) && is_numeric($server['id'])) {
                $serverIdValue = (int) $server['id'];
                if ($serverIdValue > 0) {
                    // Check if server with this ID already exists
                    if (Server::getServerById($serverIdValue)) {
                        return ApiResponse::error('Server with ID already exists: ' . $serverIdValue, 'DUPLICATE_ID', 409);
                    }
                    $serverData['id'] = $serverIdValue;
                }
            }

            // Create server (skip Wings API call - just insert to database)
            $serverId = Server::createServer($serverData);
            if (!$serverId) {
                // Get the last error from the logger to provide more details
                $logger = \App\App::getInstance(true)->getLogger();

                // Try to get more details about why it failed
                $errorDetails = [];

                // Check for common validation issues
                $requiredFields = ['uuid', 'uuidShort', 'node_id', 'name', 'owner_id', 'memory', 'swap', 'disk', 'io', 'cpu', 'allocation_id', 'realms_id', 'spell_id', 'startup', 'image'];
                $missingFields = [];
                foreach ($requiredFields as $field) {
                    if (!isset($serverData[$field]) || (is_string($serverData[$field]) && trim($serverData[$field]) === '')) {
                        $missingFields[] = $field;
                    }
                }
                if (!empty($missingFields)) {
                    $errorDetails[] = 'Missing required fields: ' . implode(', ', $missingFields);
                }

                // Check UUID format
                if (isset($serverData['uuid']) && !preg_match('/^[a-f0-9\-]{36}$/i', $serverData['uuid'])) {
                    $errorDetails[] = 'Invalid UUID format: ' . $serverData['uuid'];
                }

                // Check UUID Short format
                if (isset($serverData['uuidShort']) && !preg_match('/^[a-f0-9]{8}$/i', $serverData['uuidShort'])) {
                    $errorDetails[] = 'Invalid UUID Short format: ' . $serverData['uuidShort'];
                }

                // Check foreign keys
                if (isset($serverData['node_id']) && !Node::getNodeById($serverData['node_id'])) {
                    $errorDetails[] = 'Node not found: ' . $serverData['node_id'];
                }
                if (isset($serverData['owner_id']) && !User::getUserById($serverData['owner_id'])) {
                    $errorDetails[] = 'User not found: ' . $serverData['owner_id'];
                }
                if (isset($serverData['allocation_id']) && !Allocation::getAllocationById($serverData['allocation_id'])) {
                    $errorDetails[] = 'Allocation not found: ' . $serverData['allocation_id'];
                }
                if (isset($serverData['realms_id']) && !Realm::getById($serverData['realms_id'])) {
                    $errorDetails[] = 'Realm not found: ' . $serverData['realms_id'];
                }
                if (isset($serverData['spell_id']) && !Spell::getSpellById($serverData['spell_id'])) {
                    $errorDetails[] = 'Spell not found: ' . $serverData['spell_id'];
                }

                // Check numeric fields
                $strictPositiveFields = ['node_id', 'owner_id', 'allocation_id', 'realms_id', 'spell_id'];
                foreach ($strictPositiveFields as $field) {
                    if (isset($serverData[$field]) && (!is_numeric($serverData[$field]) || (int) $serverData[$field] <= 0)) {
                        $errorDetails[] = "Invalid {$field}: " . $serverData[$field] . ' (must be > 0)';
                    }
                }

                $nonNegativeFields = ['memory', 'disk', 'io', 'cpu'];
                foreach ($nonNegativeFields as $field) {
                    if (isset($serverData[$field]) && (!is_numeric($serverData[$field]) || (int) $serverData[$field] < 0)) {
                        $errorDetails[] = "Invalid {$field}: " . $serverData[$field] . ' (must be >= 0)';
                    }
                }

                // Swap is special: -1 = unlimited, 0 = disabled, >0 = limited
                if (isset($serverData['swap']) && (!is_numeric($serverData['swap']) || (int) $serverData['swap'] < -1)) {
                    $errorDetails[] = 'Invalid swap: ' . $serverData['swap'] . ' (must be -1 for unlimited, 0 for disabled, or >0 for limited)';
                }

                // Log the server data for debugging (sanitized)
                $sanitizedData = $serverData;
                unset($sanitizedData['password']); // Remove any sensitive data
                $logger->error('Server creation failed. Server data: ' . json_encode($sanitizedData));

                $errorMessage = 'Failed to create server';
                if (!empty($errorDetails)) {
                    $errorMessage .= ': ' . implode('; ', $errorDetails);
                } else {
                    $errorMessage .= '. Check application logs for details.';
                }

                return ApiResponse::error($errorMessage, 'SERVER_CREATE_FAILED', 400);
            }

            $createdServer = Server::getServerById($serverId);
            if (!$createdServer) {
                return ApiResponse::error('Failed to retrieve created server', 'SERVER_RETRIEVE_FAILED', 500);
            }

            // Claim the allocation for this server
            Allocation::assignToServer($allocationId, $serverId);

            // Import server variables
            $variablesImported = 0;
            $variableErrors = [];

            foreach ($serverVariables as $var) {
                $eggVariableId = $var['variable_id'] ?? null;
                if ($eggVariableId === null) {
                    $variableErrors[] = 'Variable missing variable_id: ' . json_encode($var);
                    continue;
                }

                // Map egg_variable_id to spell_variable_id
                if (!isset($variableToVariableMapping[$eggVariableId])) {
                    $variableErrors[] = 'Missing variable_to_variable_mapping for variable_id: ' . $eggVariableId;
                    continue;
                }

                $spellVariableId = (int) $variableToVariableMapping[$eggVariableId];

                // Validate spell variable exists
                $spellVariable = SpellVariable::getVariableById($spellVariableId);
                if (!$spellVariable) {
                    $variableErrors[] = 'Spell variable not found: ' . $spellVariableId;
                    continue;
                }

                $variableData = [
                    'server_id' => $serverId,
                    'variable_id' => $spellVariableId,
                    'variable_value' => $var['variable_value'] ?? '',
                ];

                $varId = ServerVariable::createServerVariable($variableData);
                if ($varId) {
                    ++$variablesImported;
                } else {
                    $variableErrors[] = 'Failed to create server variable for variable_id: ' . $spellVariableId;
                }
            }

            // Log any variable import errors
            if (!empty($variableErrors)) {
                $logger = \App\App::getInstance(true)->getLogger();
                $logger->warning('Some server variables failed to import for server ID ' . $serverId . ': ' . implode(', ', $variableErrors));
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_server',
                'context' => 'Imported server from Pterodactyl: ' . $createdServer['name'] . ' (ID: ' . $serverId . ')',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerCreated(),
                    [
                        'server_id' => $serverId,
                        'server_data' => $createdServer,
                        'created_by' => $admin,
                    ]
                );
            }

            return ApiResponse::success(
                [
                    'server' => $createdServer,
                    'variables_imported' => $variablesImported,
                ],
                'Server imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import server: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import server: ' . $e->getMessage(), 'SERVER_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-server-database',
        summary: 'Import Pterodactyl server database',
        description: 'Import a Pterodactyl server database as a FeatherPanel server database. Maps server_id and database_host_id.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'database',
                        type: 'object',
                        description: 'Pterodactyl server database data',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Database ID (optional, for migrations)', example: 10),
                            new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID (will be mapped)'),
                            new OA\Property(property: 'database_host_id', type: 'integer', description: 'Database host ID (will be mapped)'),
                            new OA\Property(property: 'database', type: 'string', description: 'Database name'),
                            new OA\Property(property: 'username', type: 'string', description: 'Database username'),
                            new OA\Property(property: 'remote', type: 'string', nullable: true, description: 'Remote access (default: %)'),
                            new OA\Property(property: 'password', type: 'string', description: 'Encrypted password'),
                            new OA\Property(property: 'max_connections', type: 'integer', nullable: true, description: 'Max connections (default: 0)'),
                            new OA\Property(property: 'created_at', type: 'string', nullable: true, format: 'date-time', description: 'Creation timestamp'),
                            new OA\Property(property: 'updated_at', type: 'string', nullable: true, format: 'date-time', description: 'Update timestamp'),
                        ]
                    ),
                    new OA\Property(
                        property: 'server_to_server_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl server_id to FeatherPanel server_id',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                    new OA\Property(
                        property: 'database_host_to_database_host_mapping',
                        type: 'object',
                        description: 'Mapping of Pterodactyl database_host_id to FeatherPanel database_host_id',
                        additionalProperties: new OA\AdditionalProperties(type: 'integer')
                    ),
                ],
                required: ['database']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Server database imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'database', type: 'object', description: 'Created server database data'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data, missing required fields, or invalid mappings'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server or database host not found'),
            new OA\Response(response: 409, description: 'Conflict - Database already exists for this server'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importServerDatabase(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['database']) || !is_array($data['database'])) {
                return ApiResponse::error('Missing or invalid database data', 'MISSING_DATABASE_DATA', 400);
            }

            $database = $data['database'];
            $serverToServerMapping = $data['server_to_server_mapping'] ?? [];
            $databaseHostToDatabaseHostMapping = $data['database_host_to_database_host_mapping'] ?? [];

            // Map server_id
            $serverId = $database['server_id'] ?? null;
            if ($serverId !== null && isset($serverToServerMapping[$serverId])) {
                $serverId = (int) $serverToServerMapping[$serverId];
            } elseif (isset($database['server_id'])) {
                $serverId = (int) $database['server_id'];
            } else {
                return ApiResponse::error('Missing server_id', 'MISSING_SERVER_ID', 400);
            }

            // Map database_host_id
            $databaseHostId = $database['database_host_id'] ?? null;
            if ($databaseHostId !== null && isset($databaseHostToDatabaseHostMapping[$databaseHostId])) {
                $databaseHostId = (int) $databaseHostToDatabaseHostMapping[$databaseHostId];
            } elseif (isset($database['database_host_id'])) {
                $databaseHostId = (int) $database['database_host_id'];
            } else {
                return ApiResponse::error('Missing database_host_id', 'MISSING_DATABASE_HOST_ID', 400);
            }

            // Validate entities exist
            if (!Server::getServerById($serverId)) {
                return ApiResponse::error('Server not found: ' . $serverId, 'SERVER_NOT_FOUND', 404);
            }

            if (!DatabaseInstance::getDatabaseById($databaseHostId)) {
                return ApiResponse::error('Database host not found: ' . $databaseHostId, 'DATABASE_HOST_NOT_FOUND', 404);
            }

            // Prepare database data
            $databaseData = [
                'server_id' => $serverId,
                'database_host_id' => $databaseHostId,
                'database' => $database['database'] ?? '',
                'username' => $database['username'] ?? '',
                'password' => $database['password'] ?? '',
            ];

            // Validate required fields
            if (empty($databaseData['database']) || empty($databaseData['username']) || empty($databaseData['password'])) {
                return ApiResponse::error('Database must have database, username, and password', 'MISSING_REQUIRED_FIELDS', 400);
            }

            // Add optional fields
            if (isset($database['remote'])) {
                $databaseData['remote'] = $database['remote'];
            }
            if (isset($database['max_connections'])) {
                $databaseData['max_connections'] = (int) $database['max_connections'];
            }
            if (isset($database['created_at'])) {
                $databaseData['created_at'] = $database['created_at'];
            }
            if (isset($database['updated_at'])) {
                $databaseData['updated_at'] = $database['updated_at'];
            }

            // Check if database already exists for this server
            if (ServerDatabase::getServerDatabaseByServerAndName($serverId, $databaseData['database'])) {
                return ApiResponse::error('Database already exists for server: ' . $serverId . ' with name: ' . $databaseData['database'], 'DUPLICATE_DATABASE', 409);
            }

            // Handle optional ID for migrations (preserve original database ID)
            if (isset($database['id']) && is_numeric($database['id'])) {
                $databaseIdValue = (int) $database['id'];
                if ($databaseIdValue > 0) {
                    // Check if database with this ID already exists
                    if (ServerDatabase::getServerDatabaseById($databaseIdValue)) {
                        return ApiResponse::error('Database with ID already exists: ' . $databaseIdValue, 'DUPLICATE_ID', 409);
                    }
                    $databaseData['id'] = $databaseIdValue;
                }
            }

            // Create server database
            $databaseId = ServerDatabase::createServerDatabase($databaseData);
            if (!$databaseId) {
                return ApiResponse::error('Failed to create server database', 'DATABASE_CREATE_FAILED', 400);
            }

            $createdDatabase = ServerDatabase::getServerDatabaseById($databaseId);
            if (!$createdDatabase) {
                return ApiResponse::error('Failed to retrieve created server database', 'DATABASE_RETRIEVE_FAILED', 500);
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_server_database',
                'context' => 'Imported server database from Pterodactyl: ' . $createdDatabase['database'] . ' for server ID ' . $serverId,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(
                [
                    'database' => $createdDatabase,
                ],
                'Server database imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import server database: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import server database: ' . $e->getMessage(), 'DATABASE_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-backup',
        summary: 'Import Pterodactyl backup',
        description: 'Import a backup from Pterodactyl to FeatherPanel. Maps server_id using provided mapping and preserves original backup ID, UUID, and metadata.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['backup', 'server_to_server_mapping'],
                properties: [
                    new OA\Property(property: 'backup', type: 'object', description: 'Pterodactyl backup data'),
                    new OA\Property(property: 'server_to_server_mapping', type: 'object', description: 'Mapping of Pterodactyl server IDs to FeatherPanel server IDs'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Backup imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'backup', type: 'object', description: 'Imported backup data'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 409, description: 'Conflict - Backup with UUID or ID already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to import backup'),
        ]
    )]
    public function importBackup(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['backup']) || !is_array($data['backup'])) {
                return ApiResponse::error('Missing or invalid backup data', 'MISSING_BACKUP_DATA', 400);
            }

            $backup = $data['backup'];
            $serverToServerMapping = $data['server_to_server_mapping'] ?? [];

            // Map server_id
            $serverId = $backup['server_id'] ?? null;
            if ($serverId !== null && isset($serverToServerMapping[$serverId])) {
                $serverId = (int) $serverToServerMapping[$serverId];
            } elseif (isset($backup['server_id'])) {
                $serverId = (int) $backup['server_id'];
            } else {
                return ApiResponse::error('Missing server_id', 'MISSING_SERVER_ID', 400);
            }

            // Validate server exists
            if (!Server::getServerById($serverId)) {
                return ApiResponse::error('Server not found: ' . $serverId, 'SERVER_NOT_FOUND', 404);
            }

            // Validate required fields
            if (empty($backup['uuid'])) {
                return ApiResponse::error('Backup must have uuid', 'MISSING_UUID', 400);
            }
            if (empty($backup['name'])) {
                return ApiResponse::error('Backup must have name', 'MISSING_NAME', 400);
            }

            // Check if backup with this UUID already exists
            $existingBackup = Backup::getBackupByUuid($backup['uuid']);
            if ($existingBackup) {
                return ApiResponse::error('Backup with UUID already exists: ' . $backup['uuid'], 'DUPLICATE_UUID', 409);
            }

            // Prepare backup data
            $backupData = [
                'server_id' => $serverId,
                'uuid' => $backup['uuid'],
                'name' => $backup['name'],
                'ignored_files' => $backup['ignored_files'] ?? '[]',
                'disk' => $backup['disk'] ?? 'wings',
            ];

            // Add optional fields
            if (isset($backup['upload_id'])) {
                $backupData['upload_id'] = $backup['upload_id'];
            }
            if (isset($backup['is_successful'])) {
                $backupData['is_successful'] = (int) $backup['is_successful'];
            }
            if (isset($backup['is_locked'])) {
                $backupData['is_locked'] = (int) $backup['is_locked'];
            }
            if (isset($backup['checksum'])) {
                $backupData['checksum'] = $backup['checksum'];
            }
            if (isset($backup['bytes'])) {
                $backupData['bytes'] = (int) $backup['bytes'];
            }
            if (isset($backup['completed_at'])) {
                $backupData['completed_at'] = $backup['completed_at'];
            }
            if (isset($backup['created_at'])) {
                $backupData['created_at'] = $backup['created_at'];
            }
            if (isset($backup['updated_at'])) {
                $backupData['updated_at'] = $backup['updated_at'];
            }

            // Handle optional ID for migrations (preserve original backup ID)
            if (isset($backup['id']) && is_numeric($backup['id'])) {
                $backupIdValue = (int) $backup['id'];
                if ($backupIdValue > 0) {
                    // Check if backup with this ID already exists
                    if (Backup::getBackupById($backupIdValue)) {
                        return ApiResponse::error('Backup with ID already exists: ' . $backupIdValue, 'DUPLICATE_ID', 409);
                    }
                    $backupData['id'] = $backupIdValue;
                }
            }

            // Create backup
            $backupId = Backup::createBackup($backupData);
            if (!$backupId) {
                return ApiResponse::error('Failed to create backup', 'BACKUP_CREATE_FAILED', 400);
            }

            $createdBackup = Backup::getBackupById($backupId);
            if (!$createdBackup) {
                return ApiResponse::error('Failed to retrieve created backup', 'BACKUP_RETRIEVE_FAILED', 500);
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_backup',
                'context' => 'Imported backup from Pterodactyl: ' . $createdBackup['name'] . ' (UUID: ' . $createdBackup['uuid'] . ') for server ID ' . $serverId,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(
                [
                    'backup' => $createdBackup,
                ],
                'Backup imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import backup: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import backup: ' . $e->getMessage(), 'BACKUP_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-subuser',
        summary: 'Import Pterodactyl subuser',
        description: 'Import a subuser from Pterodactyl to FeatherPanel. Maps user_id and server_id using provided mappings and preserves original subuser ID and permissions.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['subuser', 'user_to_user_mapping', 'server_to_server_mapping'],
                properties: [
                    new OA\Property(property: 'subuser', type: 'object', description: 'Pterodactyl subuser data'),
                    new OA\Property(property: 'user_to_user_mapping', type: 'object', description: 'Mapping of Pterodactyl user IDs to FeatherPanel user IDs'),
                    new OA\Property(property: 'server_to_server_mapping', type: 'object', description: 'Mapping of Pterodactyl server IDs to FeatherPanel server IDs'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Subuser imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'subuser', type: 'object', description: 'Imported subuser data'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 409, description: 'Conflict - Subuser already exists'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importSubuser(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (!$data) {
                return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
            }

            // Validate required fields
            if (!isset($data['subuser']) || !is_array($data['subuser'])) {
                return ApiResponse::error('Missing or invalid subuser data', 'MISSING_SUBUSER_DATA', 400);
            }

            if (!isset($data['user_to_user_mapping']) || !is_array($data['user_to_user_mapping'])) {
                return ApiResponse::error('Missing or invalid user_to_user_mapping', 'MISSING_USER_MAPPING', 400);
            }

            if (!isset($data['server_to_server_mapping']) || !is_array($data['server_to_server_mapping'])) {
                return ApiResponse::error('Missing or invalid server_to_server_mapping', 'MISSING_SERVER_MAPPING', 400);
            }

            $subuserData = $data['subuser'];
            $userMapping = $data['user_to_user_mapping'];
            $serverMapping = $data['server_to_server_mapping'];

            // Map user_id
            $pterodactylUserId = isset($subuserData['user_id']) ? (int) $subuserData['user_id'] : null;
            if (!$pterodactylUserId || !isset($userMapping[$pterodactylUserId])) {
                return ApiResponse::error('Invalid or unmapped user_id: ' . ($pterodactylUserId ?? 'null'), 'INVALID_USER_ID', 400);
            }
            $userId = (int) $userMapping[$pterodactylUserId];

            // Map server_id
            $pterodactylServerId = isset($subuserData['server_id']) ? (int) $subuserData['server_id'] : null;
            if (!$pterodactylServerId || !isset($serverMapping[$pterodactylServerId])) {
                return ApiResponse::error('Invalid or unmapped server_id: ' . ($pterodactylServerId ?? 'null'), 'INVALID_SERVER_ID', 400);
            }
            $serverId = (int) $serverMapping[$pterodactylServerId];

            // Validate user exists
            if (!User::getUserById($userId)) {
                return ApiResponse::error('User not found: ' . $userId, 'USER_NOT_FOUND', 404);
            }

            // Validate server exists
            if (!Server::getServerById($serverId)) {
                return ApiResponse::error('Server not found: ' . $serverId, 'SERVER_NOT_FOUND', 404);
            }

            // Handle permissions (can be JSON string or array)
            $permissions = $subuserData['permissions'] ?? '[]';
            if (is_string($permissions)) {
                $decoded = json_decode($permissions, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $permissions = $decoded;
                } else {
                    // If it's not valid JSON, treat as empty array
                    $permissions = [];
                }
            }
            if (!is_array($permissions)) {
                $permissions = [];
            }

            // Validate permissions format
            if (!Subuser::validatePermissions($permissions)) {
                return ApiResponse::error('Invalid permissions format', 'INVALID_PERMISSIONS', 400);
            }

            // Check if subuser already exists for this user+server combination
            if (Subuser::getSubuserByUserAndServer($userId, $serverId)) {
                return ApiResponse::error('Subuser already exists for user_id: ' . $userId . ' and server_id: ' . $serverId, 'DUPLICATE_SUBUSER', 409);
            }

            // Prepare subuser data
            $subuserInsertData = [
                'user_id' => $userId,
                'server_id' => $serverId,
                'permissions' => is_array($permissions) ? json_encode($permissions) : $permissions,
            ];

            // Add optional timestamps
            if (isset($subuserData['created_at'])) {
                $subuserInsertData['created_at'] = $subuserData['created_at'];
            }
            if (isset($subuserData['updated_at'])) {
                $subuserInsertData['updated_at'] = $subuserData['updated_at'];
            }

            // Handle optional ID for migrations (preserve original subuser ID)
            if (isset($subuserData['id']) && is_numeric($subuserData['id'])) {
                $subuserIdValue = (int) $subuserData['id'];
                if ($subuserIdValue > 0) {
                    // Check if subuser with this ID already exists
                    if (Subuser::getSubuserById($subuserIdValue)) {
                        return ApiResponse::error('Subuser with ID already exists: ' . $subuserIdValue, 'DUPLICATE_ID', 409);
                    }
                    $subuserInsertData['id'] = $subuserIdValue;
                }
            }

            // Create subuser
            $subuserId = Subuser::createSubuser($subuserInsertData);
            if (!$subuserId) {
                return ApiResponse::error('Failed to create subuser', 'SUBUSER_CREATE_FAILED', 400);
            }

            $createdSubuser = Subuser::getSubuserById($subuserId);
            if (!$createdSubuser) {
                return ApiResponse::error('Failed to retrieve created subuser', 'SUBUSER_RETRIEVE_FAILED', 500);
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_subuser',
                'context' => 'Imported subuser from Pterodactyl (ID: ' . $subuserId . ') for user ID ' . $userId . ' and server ID ' . $serverId,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(
                [
                    'subuser' => $createdSubuser,
                ],
                'Subuser imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import subuser: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import subuser: ' . $e->getMessage(), 'SUBUSER_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-schedule',
        summary: 'Import Pterodactyl schedule',
        description: 'Import a schedule from Pterodactyl to FeatherPanel. Maps server_id using provided mapping and preserves original schedule ID, cron settings, and timestamps. Calculates next_run_at if not provided.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['schedule', 'server_to_server_mapping'],
                properties: [
                    new OA\Property(property: 'schedule', type: 'object', description: 'Pterodactyl schedule data'),
                    new OA\Property(property: 'server_to_server_mapping', type: 'object', description: 'Mapping of Pterodactyl server IDs to FeatherPanel server IDs'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Schedule imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'schedule', type: 'object', description: 'Imported schedule data'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 409, description: 'Conflict - Schedule with ID already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to import schedule'),
        ]
    )]
    public function importSchedule(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['schedule']) || !is_array($data['schedule'])) {
                return ApiResponse::error('Missing or invalid schedule data', 'MISSING_SCHEDULE_DATA', 400);
            }

            $schedule = $data['schedule'];
            $serverToServerMapping = $data['server_to_server_mapping'] ?? [];

            // Map server_id
            $serverId = $schedule['server_id'] ?? null;
            if ($serverId !== null && isset($serverToServerMapping[$serverId])) {
                $serverId = (int) $serverToServerMapping[$serverId];
            } elseif (isset($schedule['server_id'])) {
                $serverId = (int) $schedule['server_id'];
            } else {
                return ApiResponse::error('Missing server_id', 'MISSING_SERVER_ID', 400);
            }

            // Validate server exists
            if (!Server::getServerById($serverId)) {
                return ApiResponse::error('Server not found: ' . $serverId, 'SERVER_NOT_FOUND', 404);
            }

            // Validate required fields
            if (empty($schedule['name'])) {
                return ApiResponse::error('Schedule must have name', 'MISSING_NAME', 400);
            }

            // Prepare schedule data
            $scheduleData = [
                'server_id' => $serverId,
                'name' => $schedule['name'] ?? '',
                'cron_day_of_week' => $schedule['cron_day_of_week'] ?? '*',
                'cron_month' => $schedule['cron_month'] ?? '*',
                'cron_day_of_month' => $schedule['cron_day_of_month'] ?? '*',
                'cron_hour' => $schedule['cron_hour'] ?? '*',
                'cron_minute' => $schedule['cron_minute'] ?? '*',
                'is_active' => isset($schedule['is_active']) ? (int) $schedule['is_active'] : 1,
                'is_processing' => isset($schedule['is_processing']) ? (int) $schedule['is_processing'] : 0,
                'only_when_online' => isset($schedule['only_when_online']) ? (int) $schedule['only_when_online'] : 0,
            ];

            // Add optional fields
            if (isset($schedule['last_run_at'])) {
                $scheduleData['last_run_at'] = $schedule['last_run_at'];
            }
            // Handle next_run_at - calculate if not provided or null
            if (isset($schedule['next_run_at']) && $schedule['next_run_at'] !== null && $schedule['next_run_at'] !== '') {
                $scheduleData['next_run_at'] = $schedule['next_run_at'];
            } else {
                // Calculate next_run_at from cron expression if not provided or null
                $scheduleData['next_run_at'] = ServerSchedule::calculateNextRunTime(
                    $scheduleData['cron_day_of_week'],
                    $scheduleData['cron_month'],
                    $scheduleData['cron_day_of_month'],
                    $scheduleData['cron_hour'],
                    $scheduleData['cron_minute']
                );
            }
            if (isset($schedule['created_at'])) {
                $scheduleData['created_at'] = $schedule['created_at'];
            }
            if (isset($schedule['updated_at'])) {
                $scheduleData['updated_at'] = $schedule['updated_at'];
            }

            // Handle optional ID for migrations (preserve original schedule ID)
            if (isset($schedule['id']) && is_numeric($schedule['id'])) {
                $scheduleIdValue = (int) $schedule['id'];
                if ($scheduleIdValue > 0) {
                    // Check if schedule with this ID already exists
                    if (ServerSchedule::getScheduleById($scheduleIdValue)) {
                        return ApiResponse::error('Schedule with ID already exists: ' . $scheduleIdValue, 'DUPLICATE_ID', 409);
                    }
                    $scheduleData['id'] = $scheduleIdValue;
                }
            }

            // Create schedule (need to handle ID insertion manually if provided)
            $pdo = \App\Chat\Database::getPdoConnection();
            if (isset($scheduleData['id'])) {
                // Insert with explicit ID
                $fields = array_keys($scheduleData);
                $placeholders = array_map(fn ($f) => ':' . $f, $fields);
                $sql = 'INSERT INTO featherpanel_server_schedules (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
                $stmt = $pdo->prepare($sql);
                if ($stmt->execute($scheduleData)) {
                    $scheduleId = (int) $scheduleData['id'];
                } else {
                    $errorInfo = $stmt->errorInfo();

                    return ApiResponse::error('Failed to create schedule: ' . ($errorInfo[2] ?? 'Unknown error'), 'SCHEDULE_CREATE_FAILED', 500);
                }
            } else {
                // Use model method
                $scheduleId = ServerSchedule::createSchedule($scheduleData);
                if (!$scheduleId) {
                    return ApiResponse::error('Failed to create schedule', 'SCHEDULE_CREATE_FAILED', 500);
                }
            }

            $createdSchedule = ServerSchedule::getScheduleById($scheduleId);
            if (!$createdSchedule) {
                return ApiResponse::error('Failed to retrieve created schedule', 'SCHEDULE_RETRIEVE_FAILED', 500);
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_schedule',
                'context' => 'Imported schedule from Pterodactyl: ' . $createdSchedule['name'] . ' (ID: ' . $scheduleId . ') for server ID ' . $serverId,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(
                [
                    'schedule' => $createdSchedule,
                ],
                'Schedule imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import schedule: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import schedule: ' . $e->getMessage(), 'SCHEDULE_IMPORT_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import-task',
        summary: 'Import Pterodactyl task',
        description: 'Import a task from Pterodactyl to FeatherPanel. Maps schedule_id using provided mapping and preserves original task ID, sequence, action, payload, and other settings.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['task', 'schedule_to_schedule_mapping'],
                properties: [
                    new OA\Property(property: 'task', type: 'object', description: 'Pterodactyl task data'),
                    new OA\Property(property: 'schedule_to_schedule_mapping', type: 'object', description: 'Mapping of Pterodactyl schedule IDs to FeatherPanel schedule IDs'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Task imported successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'task', type: 'object', description: 'Imported task data'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Schedule not found'),
            new OA\Response(response: 409, description: 'Conflict - Task with ID already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to import task'),
        ]
    )]
    public function importTask(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['task']) || !is_array($data['task'])) {
                return ApiResponse::error('Missing or invalid task data', 'MISSING_TASK_DATA', 400);
            }

            $task = $data['task'];
            $scheduleToScheduleMapping = $data['schedule_to_schedule_mapping'] ?? [];

            // Map schedule_id
            $scheduleId = $task['schedule_id'] ?? null;
            if ($scheduleId !== null && isset($scheduleToScheduleMapping[$scheduleId])) {
                $scheduleId = (int) $scheduleToScheduleMapping[$scheduleId];
            } elseif (isset($task['schedule_id'])) {
                $scheduleId = (int) $task['schedule_id'];
            } else {
                return ApiResponse::error('Missing schedule_id', 'MISSING_SCHEDULE_ID', 400);
            }

            // Validate schedule exists
            if (!ServerSchedule::getScheduleById($scheduleId)) {
                return ApiResponse::error('Schedule not found: ' . $scheduleId, 'SCHEDULE_NOT_FOUND', 404);
            }

            // Validate required fields
            if (empty($task['action'])) {
                return ApiResponse::error('Task must have action', 'MISSING_ACTION', 400);
            }
            if (!isset($task['sequence_id']) || !is_numeric($task['sequence_id'])) {
                return ApiResponse::error('Task must have sequence_id', 'MISSING_SEQUENCE_ID', 400);
            }

            // Prepare task data
            $taskData = [
                'schedule_id' => $scheduleId,
                'sequence_id' => (int) ($task['sequence_id'] ?? 1),
                'action' => $task['action'] ?? '',
                'payload' => isset($task['payload']) ? (string) $task['payload'] : '',
                'time_offset' => isset($task['time_offset']) ? (int) $task['time_offset'] : 0,
                'is_queued' => isset($task['is_queued']) ? (int) $task['is_queued'] : 0,
                'continue_on_failure' => isset($task['continue_on_failure']) ? (int) $task['continue_on_failure'] : 0,
            ];

            // Add optional fields
            if (isset($task['created_at'])) {
                $taskData['created_at'] = $task['created_at'];
            }
            if (isset($task['updated_at'])) {
                $taskData['updated_at'] = $task['updated_at'];
            }

            // Handle optional ID for migrations (preserve original task ID)
            if (isset($task['id']) && is_numeric($task['id'])) {
                $taskIdValue = (int) $task['id'];
                if ($taskIdValue > 0) {
                    // Check if task with this ID already exists
                    if (Task::getTaskById($taskIdValue)) {
                        return ApiResponse::error('Task with ID already exists: ' . $taskIdValue, 'DUPLICATE_ID', 409);
                    }
                    $taskData['id'] = $taskIdValue;
                }
            }

            // Create task (need to handle ID insertion manually if provided)
            $pdo = \App\Chat\Database::getPdoConnection();
            if (isset($taskData['id'])) {
                // Insert with explicit ID
                $fields = array_keys($taskData);
                $placeholders = array_map(fn ($f) => ':' . $f, $fields);
                $sql = 'INSERT INTO featherpanel_server_schedules_tasks (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
                $stmt = $pdo->prepare($sql);
                if ($stmt->execute($taskData)) {
                    $taskId = (int) $taskData['id'];
                } else {
                    $errorInfo = $stmt->errorInfo();

                    return ApiResponse::error('Failed to create task: ' . ($errorInfo[2] ?? 'Unknown error'), 'TASK_CREATE_FAILED', 500);
                }
            } else {
                // Use model method
                $taskId = Task::createTask($taskData);
                if (!$taskId) {
                    return ApiResponse::error('Failed to create task', 'TASK_CREATE_FAILED', 500);
                }
            }

            $createdTask = Task::getTaskById($taskId);
            if (!$createdTask) {
                return ApiResponse::error('Failed to retrieve created task', 'TASK_RETRIEVE_FAILED', 500);
            }

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'import_task',
                'context' => 'Imported task from Pterodactyl: ' . $createdTask['action'] . ' (ID: ' . $taskId . ') for schedule ID ' . $scheduleId,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(
                [
                    'task' => $createdTask,
                ],
                'Task imported successfully',
                201
            );
        } catch (\Exception $e) {
            $logger = \App\App::getInstance(true)->getLogger();
            $logger->error('Failed to import task: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());

            return ApiResponse::error('Failed to import task: ' . $e->getMessage(), 'TASK_IMPORT_ERROR', 500);
        }
    }
}
