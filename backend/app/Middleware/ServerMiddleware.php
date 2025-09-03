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

use App\App;
use App\Chat\User;
use App\Chat\Server;
use App\Permissions;
use App\Helpers\ApiResponse;
use App\Helpers\ServerGateway;
use App\Helpers\PermissionHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $user = $request->attributes->get('user');

        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401, []);
        }

        // Resolve server UUID from route attributes
        $serverUuid = null;
        $serverParamName = $request->attributes->get('server');
        if ($serverParamName && $request->attributes->has($serverParamName)) {
            $serverUuid = (string) $request->attributes->get($serverParamName);
        }
        if (!$serverUuid) {
            $serverUuid = (string) ($request->attributes->get('uuidShort') ?? $request->get('uuidShort'));
        }

        if (!$serverUuid) {
            return ApiResponse::error('Server UUID not provided', 'SERVER_UUID_MISSING', 400, []);
        }

        // Get the server details first
        $server = $this->getServerByUuid($serverUuid);

        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404, [
                'serverUuid' => $serverUuid,
                'server' => $server,
                'user' => $user,
                'request' => $request,
            ]);
        }

        // Check if user can access the server (owner or subuser)
        if (!$this->userCanAccessServer($user, $server)) {
            // Maybe the user is admin? If not, deny access
            if (!PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_VIEW) && !PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_EDIT) && !PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_DELETE)) {
                return ApiResponse::error('Access denied: Server not accessible by user', 'ACCESS_DENIED', 403, []);
            }
        }

        if (isset($server['suspended']) && $server['suspended'] == 1) {
            return ApiResponse::error('Sorry, but you can\'t access servers while they are suspended.', 'SERVER_SUSPENDED', 403, []);
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
     * Get server by UUID.
     */
    private function getServerByUuid(string $serverUuid): ?array
    {
        try {
            return $this->getServerByShortUuid($serverUuid);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->warning('Error getting server by UUID: ' . $e->getMessage());

            return null;
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->warning('Error getting server by UUID: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * Check if the user can access the specified server (owner or subuser).
     */
    private function userCanAccessServer(array $user, array $server): bool
    {
        try {
            // Use ServerGateway to check access (handles both owners and subusers)
            return ServerGateway::canUserAccessServer($user['uuid'], $server['uuid']);
        } catch (\Exception $e) {
            // Log the error but deny access for security
            error_log('Error checking server access: ' . $e->getMessage());

            return false;
        }
    }

    private function getServerByShortUuid(string $serverUuid): ?array
    {
        return Server::getServerByUuidShort($serverUuid);
    }
}
