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

namespace App\Controllers\Wings\Sftp;

use App\App;
use App\Chat\User;
use App\Chat\Server;
use App\Permissions;
use App\Chat\Subuser;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\ServerGateway;
use App\Helpers\PermissionHelper;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'SftpAuthRequest',
    type: 'object',
    required: ['type', 'username', 'password', 'ip'],
    properties: [
        new OA\Property(property: 'type', type: 'string', enum: ['password', 'public_key'], description: 'Authentication type'),
        new OA\Property(property: 'username', type: 'string', description: 'Username in format username.serverid'),
        new OA\Property(property: 'password', type: 'string', description: 'Password or public key content'),
        new OA\Property(property: 'ip', type: 'string', description: 'Client IP address'),
        new OA\Property(property: 'session_id', type: 'string', description: 'Session ID'),
        new OA\Property(property: 'client_version', type: 'string', description: 'SFTP client version'),
    ]
)]
#[OA\Schema(
    schema: 'SftpAuthSuccessResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'server', type: 'string', description: 'Server UUID'),
        new OA\Property(property: 'user', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'File permissions'),
    ]
)]
#[OA\Schema(
    schema: 'SftpAuthErrorResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'error', type: 'string', description: 'Error message'),
    ]
)]
class SftpAuthController
{
    #[OA\Post(
        path: '/api/remote/sftp/auth',
        summary: 'SFTP authentication',
        description: 'Handle SFTP authentication requests from Wings daemon. Supports both password and public key authentication. Requires Wings node token authentication.',
        tags: ['Wings - SFTP'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SftpAuthRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'SFTP authentication successful',
                content: new OA\JsonContent(ref: '#/components/schemas/SftpAuthSuccessResponse')
            ),
            new OA\Response(
                response: 400,
                description: 'Bad request - Invalid request data or username format',
                content: new OA\JsonContent(ref: '#/components/schemas/SftpAuthErrorResponse')
            ),
            new OA\Response(
                response: 401,
                description: 'Unauthorized - Invalid Wings node token or credentials',
                content: new OA\JsonContent(ref: '#/components/schemas/SftpAuthErrorResponse')
            ),
            new OA\Response(
                response: 403,
                description: 'Forbidden - Invalid Wings node token or access denied',
                content: new OA\JsonContent(ref: '#/components/schemas/SftpAuthErrorResponse')
            ),
            new OA\Response(
                response: 404,
                description: 'Not found - Server not found',
                content: new OA\JsonContent(ref: '#/components/schemas/SftpAuthErrorResponse')
            ),
            new OA\Response(
                response: 500,
                description: 'Internal server error',
                content: new OA\JsonContent(ref: '#/components/schemas/SftpAuthErrorResponse')
            ),
        ]
    )]
    public function authenticate(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            // Validate request data
            if (!$this->validateRequestData($data)) {
                App::getInstance(true)->getLogger()->warning('SFTP auth failed: Invalid request data');

                return ApiResponse::sendManualResponse([
                    'error' => 'Invalid request data',
                ], 400);
            }

            $type = $data['type'];
            $username = $data['username'];
            $password = $data['password'];
            $ip = $data['ip'];
            $sessionId = $data['session_id'] ?? '';
            $clientVersion = $data['client_version'] ?? '';

            // Parse username format: username.serverid
            $parsedUsername = $this->parseUsername($username);
            if (!$parsedUsername) {
                App::getInstance(true)->getLogger()->warning('SFTP auth failed: Invalid username format');

                return ApiResponse::sendManualResponse([
                    'error' => 'Invalid username format',
                ], 400);
            }

            // Find server by short ID
            $server = Server::getServerByUuidShort($parsedUsername['serverId']);
            if (!$server) {
                App::getInstance(true)->getLogger()->warning('SFTP auth failed: Server not found');

                return ApiResponse::sendManualResponse([
                    'error' => 'Server not found',
                ], 404);
            }

            // Authenticate user
            $user = $this->authenticateUser($parsedUsername['username'], $password, $type);
            if (!$user) {
                App::getInstance(true)->getLogger()->warning('SFTP auth failed: Invalid credentials');

                return ApiResponse::sendManualResponse([
                    'error' => 'Invalid credentials',
                ], 401);
            }

            // Check if user has access to this server
            if (!$this->userHasServerAccess($user['id'], $server['id'])) {
                App::getInstance(true)->getLogger()->warning('SFTP auth failed: User does not have server access');

                return ApiResponse::sendManualResponse([
                    'error' => 'Access denied',
                ], 403);
            }

            // Get user's file permissions for this server
            $permissions = $this->getUserFilePermissions($user['id'], $server['id']);

            // Log successful authentication
            App::getInstance(true)->getLogger()->info('SFTP auth success');

            // Emit event
            global $eventManager;
            $eventManager->emit(
                WingsEvent::onWingsSftpAuthentication(),
                [
                    'server' => $server,
                    'user' => $user,
                    'permissions' => $permissions,
                    'auth_type' => $type,
                    'ip' => $ip,
                    'session_id' => $sessionId,
                    'client_version' => $clientVersion,
                ]
            );

            // Return success response in exact schema format
            return ApiResponse::sendManualResponse([
                'server' => $server['uuid'],
                'user' => $user['uuid'],
                'permissions' => $permissions,
            ], 200);

        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('SFTP auth error: ' . $e->getMessage());

            return ApiResponse::sendManualResponse([
                'error' => 'Internal server error',
            ], 500);
        }
    }

    /**
     * Validate the request data.
     *
     * @param array|null $data The request data
     *
     * @return bool True if valid, false otherwise
     */
    private function validateRequestData(?array $data): bool
    {
        if (!$data || !is_array($data)) {
            return false;
        }

        $required = ['type', 'username', 'password', 'ip'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return false;
            }
        }

        // Validate authentication type
        if (!in_array($data['type'], ['password', 'public_key'])) {
            return false;
        }

        return true;
    }

    /**
     * Parse username in format: username.serverid.
     *
     * @param string $username The full username
     *
     * @return array|null Array with 'username' and 'serverId' keys, or null if invalid
     */
    private function parseUsername(string $username): ?array
    {
        // Username format: username.serverid (serverid = 8 chars)
        if (!preg_match('/^(.+)\.([a-zA-Z0-9]{8})$/i', $username, $matches)) {
            return null;
        }

        return [
            'username' => $matches[1],
            'serverId' => strtolower($matches[2]),
        ];
    }

    /**
     * Authenticate user based on authentication type.
     *
     * @param string $username The username
     * @param string $password The password or public key
     * @param string $type The authentication type
     *
     * @return array|null User data if authenticated, null otherwise
     */
    private function authenticateUser(string $username, string $password, string $type): ?array
    {
        // Find user by username
        $user = User::getUserByUsername($username);
        if (!$user) {
            return null;
        }

        // Check if user is banned
        if ($user['banned'] === 'true') {
            return null;
        }

        if ($type === 'password') {
            // Verify password
            if (!password_verify($password, $user['password'])) {
                return null;
            }
        } elseif ($type === 'public_key') {
            // For now, we'll implement basic public key validation
            // In a production environment, you'd want more sophisticated key validation
            if (!$this->validatePublicKey($password)) {
                return null;
            }

            // Check if the public key is associated with this user
            if (!$this->userHasPublicKey($user['id'], $password)) {
                return null;
            }
        }

        return $user;
    }

    /**
     * Validate public key format.
     *
     * @param string $publicKey The public key content
     *
     * @return bool True if valid, false otherwise
     */
    private function validatePublicKey(string $publicKey): bool
    {
        // Basic validation - check if it looks like an SSH public key
        $lines = explode("\n", trim($publicKey));
        if (empty($lines)) {
            return false;
        }

        $firstLine = trim($lines[0]);

        // Check common SSH key formats
        $validFormats = [
            '/^ssh-rsa\s+[A-Za-z0-9+\/=]+/',
            '/^ssh-ed25519\s+[A-Za-z0-9+\/=]+/',
            '/^ecdsa-sha2-nistp256\s+[A-Za-z0-9+\/=]+/',
            '/^ecdsa-sha2-nistp384\s+[A-Za-z0-9+\/=]+/',
            '/^ecdsa-sha2-nistp521\s+[A-Za-z0-9+\/=]+/',
        ];

        foreach ($validFormats as $format) {
            if (preg_match($format, $firstLine)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has a specific public key.
     *
     * @param int $userId The user ID
     * @param string $publicKey The public key content
     *
     * @return bool True if user has the key, false otherwise
     */
    private function userHasPublicKey(int $userId, string $publicKey): bool
    {
        // For now, we'll return true for valid public key format
        // In a production environment, you'd want to store and validate against user's actual public keys
        return true;
    }

    /**
     * Check if user has access to a specific server.
     *
     * @param int $userId The user ID
     * @param int $serverId The server ID
     *
     * @return bool True if user has access, false otherwise
     */
    private function userHasServerAccess(int $userId, int $serverId): bool
    {
        $user = User::getUserById($userId);
        $server = Server::getServerById($serverId);
        if (!$user || !$server) {
            return false;
        }

        return ServerGateway::canUserAccessServer($user['uuid'], $server['uuid']);
    }

    /**
     * Get user's file permissions for a specific server.
     *
     * @param int $userId The user ID
     * @param int $serverId The server ID
     *
     * @return array Array of permission strings
     */
    private function getUserFilePermissions(int $userId, int $serverId): array
    {
        // Get server details
        $server = Server::getServerById($serverId);
        if (!$server) {
            return [];
        }

        // Admins with server management permissions get full file access
        $user = User::getUserById($userId);
        if (
            $user && (
                PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_VIEW)
                || PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_EDIT)
                || PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_DELETE)
            )
        ) {
            return [
                'file.read',
                'file.read-content',
                'file.create',
                'file.update',
                'file.delete',
            ];
        }

        // Check if user is the owner
        if ($server['owner_id'] == $userId) {
            // Owner gets full permissions
            return [
                'file.read',
                'file.read-content',
                'file.create',
                'file.update',
                'file.delete',
            ];
        }

        // Subuser permissions mapping → SFTP file permissions
        $subuser = Subuser::getSubuserByUserAndServer($userId, $serverId);
        if ($subuser) {
            $rawPermissions = $subuser['permissions'] ?? '[]';
            $perms = is_array($rawPermissions) ? $rawPermissions : (json_decode($rawPermissions, true) ?: []);

            // Wildcard grants full access
            if (in_array('*', $perms, true)) {
                return [
                    'file.read',
                    'file.read-content',
                    'file.create',
                    'file.update',
                    'file.delete',
                ];
            }

            $result = [];
            if (in_array('files.read', $perms, true) || in_array('files.download', $perms, true)) {
                $result[] = 'file.read';
                $result[] = 'file.read-content';
            }
            if (in_array('files.write', $perms, true) || in_array('files.upload', $perms, true)) {
                $result[] = 'file.create';
                $result[] = 'file.update';
            }
            if (in_array('files.delete', $perms, true)) {
                $result[] = 'file.delete';
            }

            // Default to read-only if no file-related permissions resolved
            if (empty($result)) {
                $result = ['file.read', 'file.read-content'];
            }

            return array_values(array_unique($result));
        }

        // Default for non-owners without subuser link: read-only
        return ['file.read', 'file.read-content'];
    }
}
