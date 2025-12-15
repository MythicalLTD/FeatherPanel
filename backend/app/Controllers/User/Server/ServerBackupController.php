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
use App\Chat\Backup;
use App\Chat\Server;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\ServerBackupEvent;

#[OA\Schema(
    schema: 'Backup',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Backup ID'),
        new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Backup UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Backup name'),
        new OA\Property(property: 'ignored_files', type: 'string', description: 'JSON string of ignored files'),
        new OA\Property(property: 'disk', type: 'string', description: 'Storage disk type'),
        new OA\Property(property: 'is_successful', type: 'integer', description: 'Whether backup was successful (0 or 1)'),
        new OA\Property(property: 'is_locked', type: 'integer', description: 'Whether backup is locked (0 or 1)'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Backup creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Backup update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'BackupPagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'last_page', type: 'integer', description: 'Last page number'),
        new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
        new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
    ]
)]
#[OA\Schema(
    schema: 'BackupCreateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'uuid', type: 'string', nullable: true, description: 'Custom backup UUID (optional)'),
        new OA\Property(property: 'name', type: 'string', nullable: true, description: 'Backup name (optional)'),
        new OA\Property(property: 'ignore', type: 'string', nullable: true, description: 'JSON string of files to ignore (optional)'),
    ]
)]
#[OA\Schema(
    schema: 'BackupCreateResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Backup ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Backup UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Backup name'),
        new OA\Property(property: 'adapter', type: 'string', description: 'Backup adapter used'),
    ]
)]
#[OA\Schema(
    schema: 'BackupRestoreRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'truncate_directory', type: 'boolean', nullable: true, description: 'Whether to truncate directory before restore (optional)'),
        new OA\Property(property: 'download_url', type: 'string', nullable: true, description: 'Download URL for restore (optional)'),
    ]
)]
#[OA\Schema(
    schema: 'BackupDownloadResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'download_url', type: 'string', description: 'Backup download URL'),
        new OA\Property(property: 'expires_in', type: 'integer', description: 'Token expiration time in seconds'),
    ]
)]
class ServerBackupController
{
    use CheckSubuserPermissionsTrait;

    /**
     * Get all backups for a server.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/backups',
        summary: 'Get server backups',
        description: 'Retrieve all backups for a specific server that the user owns or has subuser access to.',
        tags: ['User - Server Backups'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server backups retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Backup')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/BackupPagination'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve backups'),
        ]
    )]
    public function getBackups(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check backup.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get page and per_page from query parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 20)));

        // Get backups from database
        $backups = Backup::getBackupsByServerId($server['id']);
        if (empty($backups)) {
            $backups = [];
        }

        // Apply pagination manually since we're getting all backups
        $total = count($backups);
        $offset = ($page - 1) * $perPage;
        $paginatedBackups = array_slice($backups, $offset, $perPage);

        return ApiResponse::success([
            'data' => $paginatedBackups,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total),
            ],
        ]);
    }

    /**
     * Get a specific backup.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/backups/{backupUuid}',
        summary: 'Get specific backup',
        description: 'Retrieve details of a specific backup for a server that the user owns or has subuser access to.',
        tags: ['User - Server Backups'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backup details retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/Backup')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or backup not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve backup'),
        ]
    )]
    public function getBackup(Request $request, string $serverUuid, string $backupUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        // Check backup.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Verify backup belongs to this server
        if ($backup['server_id'] != $server['id']) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        return ApiResponse::success($backup);
    }

    /**
     * Create a new backup.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/backups',
        summary: 'Create backup',
        description: 'Create a new backup for a server. Checks backup limits and initiates backup creation on Wings daemon.',
        tags: ['User - Server Backups'],
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
            content: new OA\JsonContent(ref: '#/components/schemas/BackupCreateRequest')
        ),
        responses: [
            new OA\Response(
                response: 202,
                description: 'Backup creation initiated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/BackupCreateResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID, backup limit reached, or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create backup'),
        ]
    )]
    public function createBackup(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check backup.create permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_CREATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Check backup limit
        $currentBackups = count(Backup::getBackupsByServerId($server['id']));
        $backupLimit = (int) ($server['backup_limit'] ?? 1);

        if ($currentBackups >= $backupLimit) {
            return ApiResponse::error('Backup limit reached', 'BACKUP_LIMIT_REACHED', 400);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Always use Wings adapter
        $adapter = 'wings';

        // Generate backup UUID if not provided
        $backupUuid = $body['uuid'] ?? $this->generateUuid();

        // Generate backup name if not provided
        $backupName = $body['name'] ?? 'Backup at ' . date('Y-m-d H:i:s');

        // Get ignore files
        $ignoredFiles = $body['ignore'] ?? '[]';

        // Create backup record in database
        $backupData = [
            'server_id' => $server['id'],
            'uuid' => $backupUuid,
            'name' => $backupName,
            'ignored_files' => $ignoredFiles,
            'disk' => 'wings', // Default to wings for now
            'is_successful' => 0,
            'is_locked' => 1, // Lock while backup is in progress
        ];

        $backupId = Backup::createBackup($backupData);
        if (!$backupId) {
            return ApiResponse::error('Failed to create backup record', 'CREATION_FAILED', 500);
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            // Initiate backup on Wings
            $response = $wings->getServer()->createBackup($serverUuid, $adapter, $backupUuid, $ignoredFiles);

            if (!$response->isSuccessful()) {
                // Rollback database record
                Backup::deleteBackup($backupId);

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

                return ApiResponse::error('Failed to initiate backup on Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            // Rollback database record
            Backup::deleteBackup($backupId);
            App::getInstance(true)->getLogger()->error('Failed to initiate backup on Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to initiate backup on Wings: ' . $e->getMessage(), 'FAILED_TO_INITIATE_BACKUP_ON_WINGS', 500);
        }
        // Log activity
        $user = $request->get('user');
        $this->logActivity($server, $node, 'backup_created', [
            'backup_uuid' => $backupUuid,
            'adapter' => $adapter,
            'backup_name' => $backupName,
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerBackupEvent::onServerBackupCreated(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'backup_uuid' => $backupUuid,
                ]
            );
        }

        return ApiResponse::success([
            'id' => $backupId,
            'uuid' => $backupUuid,
            'name' => $backupName,
            'adapter' => $adapter,
        ], 'Backup initiated successfully', 202);
    }

    /**
     * Restore a backup.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/backups/{backupUuid}/restore',
        summary: 'Restore backup',
        description: 'Restore a backup to the server. Cannot restore locked backups.',
        tags: ['User - Server Backups'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/BackupRestoreRequest')
        ),
        responses: [
            new OA\Response(
                response: 202,
                description: 'Backup restoration initiated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, backup, or node not found'),
            new OA\Response(response: 423, description: 'Locked - Backup is currently locked'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to restore backup'),
        ]
    )]
    public function restoreBackup(Request $request, string $serverUuid, string $backupUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Verify backup belongs to this server
        if ($backup['server_id'] != $server['id']) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Check backup.restore permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_RESTORE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Check if backup is locked
        if ($backup['is_locked'] == 1) {
            return ApiResponse::error('Backup is currently locked. Please unlock it first.', 'BACKUP_LOCKED', 423);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Always use Wings adapter
        $adapter = 'wings';

        $truncateDirectory = $body['truncate_directory'] ?? false;
        $downloadUrl = $body['download_url'] ?? null;

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            // Initiate restore on Wings
            $response = $wings->getServer()->restoreBackup($serverUuid, $backupUuid, $adapter, $truncateDirectory, $downloadUrl);

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

                return ApiResponse::error('Failed to initiate restore on Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to initiate restore on Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to initiate restore on Wings: ' . $e->getMessage(), 'FAILED_TO_INITIATE_RESTORE_ON_WINGS', 500);
        }
        // Log activity
        $user = $request->get('user');
        // Log activity
        $this->logActivity($server, $node, 'backup_restored', [
            'backup_uuid' => $backupUuid,
            'adapter' => $adapter,
            'truncate_directory' => $truncateDirectory,
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerBackupEvent::onServerBackupRestored(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'backup_uuid' => $backupUuid,
                ]
            );
        }

        return ApiResponse::success(null, 'Backup restoration initiated successfully', 202);
    }

    /**
     * Lock a backup to prevent deletion and restoration.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/backups/{backupUuid}/lock',
        summary: 'Lock backup',
        description: 'Lock a backup to prevent deletion and restoration.',
        tags: ['User - Server Backups'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backup locked successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or backup not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to lock backup'),
        ]
    )]
    public function lockBackup(Request $request, string $serverUuid, string $backupUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Verify backup belongs to this server
        if ($backup['server_id'] != $server['id']) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Check backup.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Update backup to locked status
        if (!Backup::updateBackup($backup['id'], ['is_locked' => 1])) {
            return ApiResponse::error('Failed to lock backup', 'LOCK_FAILED', 500);
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Log activity
        $user = $request->get('user');
        $this->logActivity($server, $node, 'backup_locked', [
            'backup_uuid' => $backupUuid,
            'backup_name' => $backup['name'],
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerBackupLocked(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'backup_uuid' => $backupUuid,
                ]
            );
        }

        return ApiResponse::success(null, 'Backup locked successfully', 200);
    }

    /**
     * Unlock a backup to allow deletion and restoration.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/backups/{backupUuid}/unlock',
        summary: 'Unlock backup',
        description: 'Unlock a backup to allow deletion and restoration.',
        tags: ['User - Server Backups'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backup unlocked successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or backup not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to unlock backup'),
        ]
    )]
    public function unlockBackup(Request $request, string $serverUuid, string $backupUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Verify backup belongs to this server
        if ($backup['server_id'] != $server['id']) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Update backup to unlocked status
        if (!Backup::updateBackup($backup['id'], ['is_locked' => 0])) {
            return ApiResponse::error('Failed to unlock backup', 'UNLOCK_FAILED', 500);
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Log activity
        $user = $request->get('user');
        $this->logActivity($server, $node, 'backup_unlocked', [
            'backup_uuid' => $backupUuid,
            'backup_name' => $backup['name'],
        ], $user);
        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerBackupUnlocked(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'backup_uuid' => $backupUuid,
                ]
            );
        }

        return ApiResponse::success(null, 'Backup unlocked successfully', 200);
    }

    /**
     * Delete a backup.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/backups/{backupUuid}',
        summary: 'Delete backup',
        description: 'Delete a backup from the server. Cannot delete locked backups.',
        tags: ['User - Server Backups'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backup deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, backup, or node not found'),
            new OA\Response(response: 423, description: 'Locked - Backup is currently locked'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete backup'),
        ]
    )]
    public function deleteBackup(Request $request, string $serverUuid, string $backupUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Verify backup belongs to this server
        if ($backup['server_id'] != $server['id']) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Check if backup is locked
        if ($backup['is_locked'] == 1) {
            return ApiResponse::error('Backup is currently locked. Please unlock it first.', 'BACKUP_LOCKED', 423);
        }

        // Check backup.delete permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_DELETE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            // Delete backup on Wings
            $response = $wings->getServer()->deleteBackup($serverUuid, $backupUuid);

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

                return ApiResponse::error('Failed to delete backup on Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete backup on Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to delete backup on Wings: ' . $e->getMessage(), 'FAILED_TO_DELETE_BACKUP_ON_WINGS', 500);
        }

        // Delete backup record from database
        if (!Backup::deleteBackup($backup['id'])) {
            return ApiResponse::error('Failed to delete backup record', 'DELETION_FAILED', 500);
        }

        // Log activity
        $user = $request->get('user');
        $this->logActivity($server, $node, 'backup_deleted', [
            'backup_uuid' => $backupUuid,
            'backup_name' => $backup['name'],
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerBackupEvent::onServerBackupDeleted(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'backup_uuid' => $backupUuid,
                ]
            );
        }

        return ApiResponse::success(null, 'Backup deleted successfully');
    }

    /**
     * Get backup download URL.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/backups/{backupUuid}/download',
        summary: 'Get backup download URL',
        description: 'Generate a secure download URL for a backup with JWT token authentication.',
        tags: ['User - Server Backups'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Download URL generated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/BackupDownloadResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, backup, or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to generate download URL'),
        ]
    )]
    public function getBackupDownloadUrl(Request $request, string $serverUuid, string $backupUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Verify backup belongs to this server
        if ($backup['server_id'] != $server['id']) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Check backup.download permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_DOWNLOAD);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Validate backup is successful before allowing download
        if (!isset($backup['is_successful']) || $backup['is_successful'] != 1) {
            return ApiResponse::error('Backup is not available for download. The backup may have failed or is still in progress.', 'BACKUP_NOT_SUCCESSFUL', 400);
        }

        // Get node info
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Get authenticated user for permissions
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        try {
            $scheme = $node['scheme'];
            $host = $node['fqdn'];
            $port = $node['daemonListen'];
            $token = $node['daemon_token'];

            // Create JWT service instance
            $jwtService = new \App\Services\Wings\Services\JwtService(
                $token, // Node secret
                App::getInstance(true)->getConfig()->getSetting(\App\Config\ConfigInterface::APP_URL, 'https://devsv.mythical.systems'), // Panel URL
                $scheme . '://' . $host . ':' . $port // Wings URL
            );

            // Get user permissions
            $permissions = ['backup.download'];

            // Generate backup download token
            // Note: Each token has a unique jti (JWT ID) via bin2hex(random_bytes(16)).
            // The unique_id field in the token payload is set to match the jti value,
            // ensuring Wings can track each token uniquely and allow multiple download
            // tokens for the same backup.
            $jwtToken = $jwtService->generateBackupToken(
                $serverUuid,
                $user['uuid'],
                $permissions,
                $backupUuid,
                'download'
            );

            // Decode token to extract details for logging (for debugging token reuse issues)
            try {
                $tokenParts = explode('.', $jwtToken);
                if (count($tokenParts) === 3) {
                    $payload = json_decode(base64_decode(strtr($tokenParts[1], '-_', '+/')), true);
                    $tokenDetails = [
                        'jti' => $payload['jti'] ?? 'unknown',
                        'iat' => $payload['iat'] ?? 'unknown',
                        'exp' => $payload['exp'] ?? 'unknown',
                        'backup_uuid' => $payload['backup_uuid'] ?? 'unknown',
                        'operation' => $payload['operation'] ?? 'unknown',
                    ];
                }
            } catch (\Exception $e) {
                // Logging failure should not break the flow
                App::getInstance(true)->getLogger()->warning('Failed to decode token for logging: ' . $e->getMessage());
            }

            // Construct the download URL
            $baseUrl = rtrim($scheme . '://' . $host . ':' . $port, '/');
            $downloadUrl = "{$baseUrl}/download/backup?token={$jwtToken}&server={$serverUuid}&backup={$backupUuid}";

            // Log activity
            $this->logActivity($server, $node, 'backup_download_url_generated', [
                'backup_uuid' => $backupUuid,
                'backup_name' => $backup['name'],
            ], $user);

            // Log activity
            return ApiResponse::success([
                'download_url' => $downloadUrl,
                'expires_in' => 300, // 5 minutes
            ]);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to generate download URL: ' . $e->getMessage(), 'DOWNLOAD_URL_GENERATION_FAILED', 500);
        }
    }

    /**
     * Generate a UUID v4.
     *
     * @return string The generated UUID
     */
    private function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0x0FFF) | 0x4000,
            mt_rand(0, 0x3FFF) | 0x8000,
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0xFFFF)
        );
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
