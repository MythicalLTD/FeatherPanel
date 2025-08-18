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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Server;
use App\Chat\SpellVariable;
use App\Chat\ServerActivity;
use App\Chat\ServerVariable;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Services\Wings\Services\Wings;
use App\Services\Wings\Services\JwtService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerUserController
{
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

        // Get user's servers with pagination and search
        $servers = Server::searchServers(
            page: $page,
            limit: $limit,
            search: $search,
            ownerId: $user['id']
        );

        // Add related data to each server.
        foreach ($servers as &$server) {
            $server['node'] = \App\Chat\Node::getNodeById($server['node_id']);
            $server['realm'] = \App\Chat\Realm::getById($server['realms_id']);
            $server['spell'] = \App\Chat\Spell::getSpellById($server['spell_id']);
            $server['allocation'] = \App\Chat\Allocation::getAllocationById($server['allocation_id']);
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

        }

        $total = Server::getCount($search, $user['id']);
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
        $server['node'] = \App\Chat\Node::getNodeById($server['node_id']);
        $server['realm'] = \App\Chat\Realm::getById($server['realms_id']);
        $server['spell'] = \App\Chat\Spell::getSpellById($server['spell_id']);

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

        // Check if user owns the server
        if ($server['owner_id'] != $user['id']) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        // Get node information
        $node = \App\Chat\Node::getNodeById($server['node_id']);
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
                App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://devsv.mythical.systems'), // Panel URL
                $scheme . '://' . $host . ':' . $port // Wings URL
            );

            // Get user permissions (you'll need to implement this based on your permission system)
            $permissions = $this->getUserServerPermissions($user['id'], $server['id']);

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

        // Check if user owns the server
        if ($server['owner_id'] != $user['id']) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        // Get request data
        $data = json_decode($request->getContent(), true);
        if (!$data || !is_array($data)) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST', 400);
        }

        // Validate and sanitize input
        $updateData = [];

        // Allow updating name, description, startup, image
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
        $allowedFields = ['name', 'description', 'startup', 'image'];
        $updateData = array_intersect_key($updateData, array_flip($allowedFields));

        // Double check that we only have allowed fields
        foreach ($updateData as $field => $value) {
            if (!in_array($field, $allowedFields)) {
                return ApiResponse::error('Invalid field: ' . $field, 'INVALID_FIELD', 400);
            }
        }

        // Update the server fields, if any
        if (!empty($updateData)) {
            $updated = Server::updateServerById($server['id'], $updateData);
            if (!$updated) {
                return ApiResponse::error('Failed to update server', 'UPDATE_FAILED', 500);
            }
        }

        // Update variables if provided
        if ($variablesPayload !== null) {
            // Fetch spell variables for this server's spell
            $spellVariables = SpellVariable::getVariablesBySpellId((int) $server['spell_id']);
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
                if ((int) $sv['spell_id'] !== (int) $server['spell_id']) {
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

            $ok = ServerVariable::createOrUpdateServerVariables((int) $server['id'], $variablesPayload);
            if (!$ok) {
                return ApiResponse::error('Failed to update server variables', 'VARIABLES_UPDATE_FAILED', 500);
            }
        }

        // Log the update
        App::getInstance(true)->getLogger()->info('Server updated');
        $node = \App\Chat\Node::getNodeById($server['node_id']);
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

            $response = $wings->getServer()->syncServer($server['uuid']);

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

        // Check if user owns the server
        if ($server['owner_id'] != $user['id']) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        // Get node information
        $node = \App\Chat\Node::getNodeById($server['node_id']);
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
        $isNumeric = in_array('numeric', $parts, true);
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
     * This is a placeholder - implement based on your permission system.
     *
     * @param int $serverId The server ID
     *
     * @return array The user's permissions
     */
    private function getUserServerPermissions(int $userId, int $serverId): array
    {
        // TODO: Implement based on permission system
        $permissions = [
            // Basic connection - REQUIRED for any WebSocket access
            'websocket.connect',

            // Console/Command control
            'control.console',           // Send console commands

            // Power control
            'control.start',             // Start server
            'control.stop',              // Stop server
            'control.restart',           // Restart server

            // Receive events
            'admin.websocket.errors',    // See detailed error messages
            'admin.websocket.install',   // See installation output
            'admin.websocket.transfer',  // See transfer logs
            'backup.read',               // See backup events
        ];

        return $permissions;
    }
}
