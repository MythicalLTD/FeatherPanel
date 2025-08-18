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

namespace App\Middleware;

use App\Chat\User;
use App\Chat\Server;
use App\Permissions;
use App\Helpers\ApiResponse;
use App\Helpers\PermissionHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $user = $request->attributes->get('user');
        $server = $request->attributes->get('server');

        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401, []);
        }

        // Check if server is provided in the request
        $serverUuid = $request->attributes->get('server') ?? $request->get('uuidShort');

        if (!$serverUuid) {
            return ApiResponse::error('Server UUID not provided', 'SERVER_UUID_MISSING', 400, []);
        }

        // Check if user owns the server
        if (!$this->userOwnsServer($user, $serverUuid)) {
            // Maybe the user is admin? If not, deny access
            if (!PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_VIEW) && !PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_EDIT) && !PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_DELETE)) {
                return ApiResponse::error('Access denied: Server not owned by user', 'ACCESS_DENIED', 403, []);
            }
        }

        return $next($request);
    }

    /**
     * Get the authenticated user from the request (if available).
     */
    public static function getCurrentUser(Request $request): ?array
    {
        return $request->attributes->get('user');
    }

    /**
     * Get the server UUID from the request (if available).
     */
    public static function getServerUuid(Request $request): ?string
    {
        return $request->attributes->get('server') ?? $request->get('uuidShort');
    }

    /**
     * Check if the user owns the specified server.
     */
    private function userOwnsServer(array $user, string $serverUuid): bool
    {
        try {
            // Get user's servers from the database
            $userServers = $this->getUserServers($user['id']);

            // Check if the server UUID exists in user's servers
            foreach ($userServers as $server) {
                if ($server['uuid'] === $serverUuid || $server['uuidShort'] === $serverUuid) {
                    return true;
                }
            }

            return false;
        } catch (\Exception $e) {
            // Log the error but deny access for security
            error_log('Error checking server ownership: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Get user's servers from database using the Server CRUD class.
     */
    private function getUserServers(int $userId): array
    {
        // Use the existing Server CRUD class method
        return Server::getServersByOwnerId($userId);
    }
}
