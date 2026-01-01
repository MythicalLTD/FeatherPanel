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

        unset($user['password'], $user['remember_token']);

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
            $context = [
                'attributes' => $request->attributes->all(),
                'query' => $request->query->all(),
                'serverParamName' => $serverParamName,
                'path' => $request->getPathInfo(),
            ];
            App::getInstance(true)->getLogger()->error('SERVER_UUID_MISSING: Attributes dump: ' . json_encode($context));

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
            App::getInstance(true)->getLogger()->error('Error checking server access: ' . $e->getMessage());

            return false;
        }
    }

    private function getServerByShortUuid(string $serverUuid): ?array
    {
        return Server::getServerByUuidShort($serverUuid);
    }
}
