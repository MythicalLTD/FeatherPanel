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
use App\Chat\ServerVariable;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServersController
{
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

        // Get server variables with details
        $server['variables'] = ServerVariable::getServerVariablesWithDetails($server['id']);

        // Remove sensitive data from related objects
        if ($server['owner']) {
            unset($server['owner']['password'], $server['owner']['remember_token'], $server['owner']['two_fa_key']);
        }

        return ApiResponse::success(['server' => $server], 'Server fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

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

        // Validate required spell variables
        $spellVariables = \App\Chat\SpellVariable::getVariablesBySpellId($data['spell_id']);
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

        return ApiResponse::success(['server_id' => $serverId], 'Server created successfully', 201);
    }

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
        $numericFields = ['node_id', 'owner_id', 'memory', 'disk', 'io', 'cpu', 'allocation_id', 'realms_id', 'spell_id'];
        foreach ($data as $field => $value) {
            if (in_array($field, $numericFields)) {
                if (!is_numeric($value) || (int) $value <= 0) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a positive integer', 'INVALID_DATA_TYPE', 400);
                }
            }
        }

        // Validate string fields
        $stringFields = ['name', 'description', 'startup', 'image'];
        foreach ($data as $field => $value) {
            if (in_array($field, $stringFields)) {
                if (!is_string($value) || trim($value) === '') {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a non-empty string', 'INVALID_DATA_TYPE', 400);
                }
            }
        }

        // Validate field lengths
        $lengthRules = [
            'name' => [1, 191],
            'description' => [1, 65535],
            'startup' => [1, 65535],
            'image' => [1, 191],
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
        if (isset($data['swap'])) {
            // Swap can be 0 or positive
            if (!is_numeric($data['swap']) || (int) $data['swap'] < 0) {
                return ApiResponse::error('Swap must be a non-negative integer', 'INVALID_SWAP_LIMIT', 400);
            }
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
        if (isset($data['allocation_id']) && !Allocation::getAllocationById($data['allocation_id'])) {
            return ApiResponse::error('Invalid allocation_id: Allocation not found', 'INVALID_ALLOCATION_ID', 400);
        }
        if (isset($data['realms_id']) && !Realm::getById($data['realms_id'])) {
            return ApiResponse::error('Invalid realms_id: Realm not found', 'INVALID_REALM_ID', 400);
        }
        if (isset($data['spell_id']) && !Spell::getSpellById($data['spell_id'])) {
            return ApiResponse::error('Invalid spell_id: Spell not found', 'INVALID_SPELL_ID', 400);
        }

        $updated = Server::updateServerById($id, $data);
        if (!$updated) {
            return ApiResponse::error('Failed to update server', 'FAILED_TO_UPDATE_SERVER', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'update_server',
            'context' => 'Updated server ' . $server['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Server updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

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

        return ApiResponse::success([], 'Server deleted successfully', 200);
    }

    public function getByOwner(Request $request, int $ownerId): Response
    {
        $servers = Server::getServersByOwnerId($ownerId);

        return ApiResponse::success(['servers' => $servers], 'Servers fetched successfully', 200);
    }

    public function getByNode(Request $request, int $nodeId): Response
    {
        $servers = Server::getServersByNodeId($nodeId);

        return ApiResponse::success(['servers' => $servers], 'Servers fetched successfully', 200);
    }

    public function getByRealm(Request $request, int $realmId): Response
    {
        $servers = Server::getServersByRealmId($realmId);

        return ApiResponse::success(['servers' => $servers], 'Servers fetched successfully', 200);
    }

    public function getBySpell(Request $request, int $spellId): Response
    {
        $servers = Server::getServersBySpellId($spellId);

        return ApiResponse::success(['servers' => $servers], 'Servers fetched successfully', 200);
    }

    public function getWithRelations(Request $request, int $id): Response
    {
        $server = Server::getServerWithRelations($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        return ApiResponse::success(['server' => $server], 'Server with relations fetched successfully', 200);
    }

    public function getAllWithRelations(Request $request): Response
    {
        $servers = Server::getAllServersWithRelations();

        return ApiResponse::success(['servers' => $servers], 'Servers with relations fetched successfully', 200);
    }

    public function getServerVariables(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $variables = ServerVariable::getServerVariablesWithDetails($id);

        return ApiResponse::success(['variables' => $variables], 'Server variables fetched successfully', 200);
    }
}
