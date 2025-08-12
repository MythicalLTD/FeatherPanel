<?php

/*
 * This file is part of MythicalPanel.
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
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
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
        $server['activity'] = array_reverse($server['activity']);

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
     * Get user permissions for a specific server.
     * This is a placeholder - implement based on your permission system.
     *
     * @param int $userId The user ID
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
