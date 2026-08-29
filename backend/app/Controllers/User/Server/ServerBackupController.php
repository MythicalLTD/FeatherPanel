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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Server;
use App\Helpers\TimeHelper;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Helpers\AppUrlHelper;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Helpers\WingsUrlHelper;
use App\Helpers\BackupIgnoreHelper;
use App\Plugins\Events\Events\ServerEvent;
use App\Services\Backup\BackupFifoEviction;
use Symfony\Component\HttpFoundation\Request;
use App\Services\Backup\BackupAdapterResolver;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\ServerBackupEvent;
use App\Services\Backup\ServerFullBackupService;
use App\Services\Database\ServerDatabaseDumpService;

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
        $paginatedBackups = TimeHelper::normaliseRows($paginatedBackups, ['completed_at', 'deleted_at']);

        $retention = BackupFifoEviction::retentionMetaForServer($server);

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
            'panel_backup_retention_mode' => $retention['panel_backup_retention_mode'],
            'backup_retention_mode_override' => $retention['backup_retention_mode_override'],
            'effective_backup_retention_mode' => $retention['effective_backup_retention_mode'],
            'fifo_rolling_enabled' => $retention['fifo_rolling_enabled'],
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

        return ApiResponse::success(TimeHelper::normaliseRow($backup, ['completed_at', 'deleted_at']));
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

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            $body = [];
        }

        $backupType = strtolower(trim((string) ($body['type'] ?? 'files')));
        if ($backupType === 'full') {
            return $this->createFullBackup($request, $server, $body);
        }

        // Check backup limit (0 = disabled; optional FIFO rotation per panel setting)
        $currentBackups = count(Backup::getBackupsByServerId((int) $server['id']));
        $backupLimit = (int) ($server['backup_limit'] ?? 0);

        if ($backupLimit === 0) {
            return ApiResponse::error('Backups are disabled for this server', 'BACKUPS_DISABLED', 403);
        }

        if ($currentBackups >= $backupLimit) {
            if (!BackupFifoEviction::isFifoRollingForServer($server)) {
                return ApiResponse::error('Backup limit reached', 'BACKUP_LIMIT_REACHED', 400);
            }
            $nodeForEvict = Node::getNodeById((int) $server['node_id']);
            if (!$nodeForEvict) {
                return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
            }
            try {
                $wingsEvict = new Wings(
                    $nodeForEvict['fqdn'],
                    (int) $nodeForEvict['daemonListen'],
                    $nodeForEvict['scheme'],
                    $nodeForEvict['daemon_token'],
                    30,
                    WingsUrlHelper::isBehindProxy($nodeForEvict)
                );
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error('FIFO backup eviction: Wings client error: ' . $e->getMessage());

                return ApiResponse::error('Failed to connect to node for backup rotation', 'FIFO_EVICTION_FAILED', 500);
            }
            $evictErr = BackupFifoEviction::evictOldestWingsBackup((int) $server['id'], $serverUuid, $wingsEvict);
            if ($evictErr !== null) {
                return ApiResponse::error($evictErr['message'], $evictErr['code'], $evictErr['status']);
            }
        }

        // Generate backup UUID if not provided
        $backupUuid = $body['uuid'] ?? $this->generateUuid();

        // Generate backup name if not provided
        $backupName = trim((string) ($body['name'] ?? ''));
        if ($backupName === '') {
            $backupName = 'Backup at ' . date('Y-m-d H:i:s');
        }

        // Get ignore files (stored as JSON array; Wings receives newline-separated globs)
        $ignoredFiles = BackupIgnoreHelper::normalizeForStorage($body['ignore'] ?? []);

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
        $backupId = null;
        $adapter = BackupAdapterResolver::ADAPTER_WINGS;
        try {
            $wings = new Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout,
                WingsUrlHelper::isBehindProxy($node),
                (string) ($node['daemon_type'] ?? 'featherwings')
            );

            // Adapter is node-admin configured; users cannot choose destination.
            $adapter = BackupAdapterResolver::resolveDefault($wings);

            // Create backup record in database
            $backupData = [
                'server_id' => $server['id'],
                'uuid' => $backupUuid,
                'name' => $backupName,
                'ignored_files' => $ignoredFiles,
                'disk' => $adapter,
                'is_successful' => 0,
                'is_locked' => 1, // Lock while backup is in progress
            ];

            $backupId = Backup::createBackup($backupData);
            if (!$backupId) {
                return ApiResponse::error('Failed to create backup record', 'CREATION_FAILED', 500);
            }

            // Initiate backup on Wings (map pbs ↔ proxmox-backup-server for wings_rs)
            $daemonAdapter = BackupAdapterResolver::toDaemonAdapter($adapter, $wings);
            $response = $wings->getServer()->createBackup($serverUuid, $daemonAdapter, $backupUuid, $ignoredFiles);

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
            if ($backupId) {
                Backup::deleteBackup($backupId);
            }
            App::getInstance(true)->getLogger()->error('Failed to initiate backup on Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to initiate backup on Wings: ' . $e->getMessage(), 'FAILED_TO_INITIATE_BACKUP_ON_WINGS', 500);
        }
        // Log activity
        $user = $request->attributes->get('user');
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
                    'user_uuid' => $request->attributes->get('user')['uuid'],
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
     * Dump one or more server databases to SQL files on the server filesystem.
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/backups/databases',
        summary: 'Create database backup files',
        description: 'Export MySQL/MariaDB databases to SQL dumps on the server filesystem. Requires backup.create and database.view_password.',
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
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'databases', description: '"all" or array of database IDs', oneOf: [
                        new OA\Schema(type: 'string', enum: ['all']),
                        new OA\Schema(type: 'array', items: new OA\Items(type: 'integer')),
                    ]),
                    new OA\Property(property: 'directory', type: 'string', nullable: true, description: 'Dump directory on the server filesystem'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Database backups written successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server or node not found'),
            new OA\Response(response: 500, description: 'Failed to create database backups'),
        ]
    )]
    public function createDatabaseBackup(Request $request, string $serverUuid): Response
    {
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_CREATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $user = $request->attributes->get('user');
        $canViewPassword = \App\Helpers\SubuserPermissionChecker::hasPermission(
            $user['id'],
            $server['id'],
            SubuserPermissions::DATABASE_VIEW_PASSWORD
        );
        if (!$canViewPassword) {
            return ApiResponse::error('Insufficient permissions to back up databases', 'FORBIDDEN', 403);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        try {
            $payload = json_encode([
                'type' => 'database',
                'databases' => $body['databases'] ?? null,
                'directory' => ServerDatabaseDumpService::DEFAULT_BACKUP_DIRECTORY,
            ]);
            $parsed = ServerDatabaseDumpService::parseBackupPayload((string) $payload);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'INVALID_PAYLOAD', 400);
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        try {
            $wings = Wings::fromNode($node, 120);
            $result = \App\Services\Database\ServerDatabaseFilesystemBackupService::backup($wings, $server, $parsed);

            if ($result['backed_up'] === [] && $result['errors'] === []) {
                return ApiResponse::error('No MySQL/MariaDB databases found to back up', 'NO_DATABASES', 400);
            }

            $this->logActivity($server, $node, 'database_backup_created', [
                'directory' => $parsed['directory'],
                'scope' => $parsed['databases'] === 'all' ? 'all' : 'specific',
                'backed_up' => $result['backed_up'],
                'errors' => $result['errors'],
            ], $user);

            $message = empty($result['errors'])
                ? 'Database backups created successfully'
                : 'Some database backups failed';

            return ApiResponse::success([
                'directory' => $parsed['directory'],
                'backed_up' => $result['backed_up'],
                'errors' => $result['errors'],
            ], $message, empty($result['errors']) ? 200 : 207);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'INVALID_PAYLOAD', 400);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to create database backups: ' . $e->getMessage());

            return ApiResponse::error('Failed to create database backups: ' . $e->getMessage(), 'DATABASE_BACKUP_FAILED', 500);
        }
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

        // Use the adapter stored on the backup (wings local archive or PBS)
        $adapter = BackupAdapterResolver::normalizeStored($backup['disk'] ?? null);

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
                $timeout,
                WingsUrlHelper::isBehindProxy($node),
                (string) ($node['daemon_type'] ?? 'featherwings')
            );

            $daemonAdapter = BackupAdapterResolver::toDaemonAdapter($adapter, $wings);

            // Initiate restore on Wings
            $response = $wings->getServer()->restoreBackup($serverUuid, $backupUuid, $daemonAdapter, $truncateDirectory, $downloadUrl);

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
        $user = $request->attributes->get('user');
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
                    'user_uuid' => $request->attributes->get('user')['uuid'],
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
        $user = $request->attributes->get('user');
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
                    'user_uuid' => $request->attributes->get('user')['uuid'],
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
        $user = $request->attributes->get('user');
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
                    'user_uuid' => $request->attributes->get('user')['uuid'],
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
                $timeout,
                WingsUrlHelper::isBehindProxy($node)
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
        $user = $request->attributes->get('user');
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
                    'user_uuid' => $request->attributes->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'backup_uuid' => $backupUuid,
                ]
            );
        }

        return ApiResponse::success(null, 'Backup deleted successfully');
    }

    /**
     * Bulk delete backups for a server.
     *
     * Accepts either a list of backup UUIDs or `{ "all": true }` to delete every unlocked backup.
     * Locked backups are skipped.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/backups/bulk-delete',
        summary: 'Bulk delete server backups',
        description: 'Delete multiple backups at once. Pass an array of backup UUIDs, or set all=true to delete every unlocked backup. Locked backups are skipped.',
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
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'uuids', type: 'array', items: new OA\Items(type: 'string'), description: 'Backup UUIDs to delete'),
                    new OA\Property(property: 'all', type: 'boolean', description: 'When true, delete all unlocked backups for the server'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Bulk delete completed',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'deleted_count', type: 'integer'),
                        new OA\Property(property: 'skipped_count', type: 'integer'),
                        new OA\Property(property: 'failed_count', type: 'integer'),
                        new OA\Property(property: 'skipped_uuids', type: 'array', items: new OA\Items(type: 'string')),
                        new OA\Property(property: 'failed', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid or missing parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function bulkDeleteBackups(Request $request, string $serverUuid): Response
    {
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_DELETE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $deleteAll = !empty($data['all']);
        $uuids = $data['uuids'] ?? [];

        if (!$deleteAll) {
            if (!is_array($uuids) || empty($uuids)) {
                return ApiResponse::error('Provide a non-empty uuids array or set all=true', 'MISSING_UUIDS', 400);
            }
            if (count($uuids) > 100) {
                return ApiResponse::error('Cannot delete more than 100 backups at once', 'TOO_MANY_UUIDS', 400);
            }
            foreach ($uuids as $uuid) {
                if (!is_string($uuid) || !preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
                    return ApiResponse::error('All UUIDs must be valid UUID strings', 'INVALID_UUIDS', 400);
                }
            }
            $uuids = array_values(array_unique($uuids));
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $backupsToDelete = [];
        $skippedUuids = [];

        if ($deleteAll) {
            $allBackups = Backup::getBackupsByServerId((int) $server['id']);
            foreach ($allBackups as $backup) {
                if ((int) ($backup['is_locked'] ?? 0) === 1) {
                    $skippedUuids[] = $backup['uuid'];
                    continue;
                }
                $backupsToDelete[] = $backup;
            }
        } else {
            foreach ($uuids as $backupUuid) {
                $backup = Backup::getBackupByUuid($backupUuid);
                if (!$backup || (int) $backup['server_id'] !== (int) $server['id']) {
                    $skippedUuids[] = $backupUuid;
                    continue;
                }
                if ((int) ($backup['is_locked'] ?? 0) === 1) {
                    $skippedUuids[] = $backupUuid;
                    continue;
                }
                $backupsToDelete[] = $backup;
            }
        }

        if (empty($backupsToDelete) && empty($skippedUuids)) {
            return ApiResponse::error('No backups to delete', 'NO_BACKUPS', 400);
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
                $timeout,
                WingsUrlHelper::isBehindProxy($node)
            );
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to connect to Wings for bulk backup delete: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Wings: ' . $e->getMessage(), 'WINGS_CONNECTION_FAILED', 500);
        }

        $user = $request->attributes->get('user');
        $deletedCount = 0;
        $failed = [];

        foreach ($backupsToDelete as $backup) {
            $backupUuid = $backup['uuid'];
            try {
                $response = $wings->getServer()->deleteBackup($serverUuid, $backupUuid);
                if (!$response->isSuccessful()) {
                    $failed[] = [
                        'uuid' => $backupUuid,
                        'error' => $response->getError() ?: 'Wings delete failed',
                    ];
                    continue;
                }

                if (!Backup::deleteBackup($backup['id'])) {
                    $failed[] = [
                        'uuid' => $backupUuid,
                        'error' => 'Failed to delete backup record',
                    ];
                    continue;
                }

                $this->logActivity($server, $node, 'backup_deleted', [
                    'backup_uuid' => $backupUuid,
                    'backup_name' => $backup['name'],
                    'bulk' => true,
                ], $user);

                global $eventManager;
                if (isset($eventManager) && $eventManager !== null) {
                    $eventManager->emit(
                        ServerBackupEvent::onServerBackupDeleted(),
                        [
                            'user_uuid' => $user['uuid'] ?? null,
                            'server_uuid' => $server['uuid'],
                            'backup_uuid' => $backupUuid,
                        ]
                    );
                }

                ++$deletedCount;
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->error('Failed to delete backup ' . $backupUuid . ': ' . $e->getMessage());
                $failed[] = [
                    'uuid' => $backupUuid,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $skippedCount = count($skippedUuids);
        $failedCount = count($failed);
        $message = "Successfully deleted {$deletedCount} backup(s)";
        if ($skippedCount > 0) {
            $message .= ". Skipped {$skippedCount} locked or missing backup(s)";
        }
        if ($failedCount > 0) {
            $message .= ". Failed to delete {$failedCount} backup(s)";
        }

        return ApiResponse::success([
            'deleted_count' => $deletedCount,
            'skipped_count' => $skippedCount,
            'failed_count' => $failedCount,
            'skipped_uuids' => $skippedUuids,
            'failed' => $failed,
        ], $message);
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

        if (BackupAdapterResolver::isPbs($backup['disk'] ?? null)) {
            return ApiResponse::error(
                'Proxmox Backup Server backups cannot be downloaded as a file. Restore them from the panel instead.',
                'PBS_DOWNLOAD_UNSUPPORTED',
                400
            );
        }

        // Get node info
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Get authenticated user for permissions
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        try {
            $token = $node['daemon_token'];
            $wingsBaseUrl = WingsUrlHelper::buildFromNode($node);

            // Create JWT service instance
            $jwtService = new \App\Services\Wings\Services\JwtService(
                $token, // Node secret
                AppUrlHelper::wingsRemoteUrl(), // Must match Wings `remote:` (issuer)
                $wingsBaseUrl // Wings URL
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
            $baseUrl = rtrim($wingsBaseUrl, '/');
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
     * List backup adapters/destinations available on the server's node.
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/backups/destinations',
        summary: 'Get backup destinations',
        description: 'List backup adapters available on the server\'s node, including the default adapter.',
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
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backup destinations retrieved',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'adapters', type: 'array', items: new OA\Items(type: 'string')),
                        new OA\Property(
                            property: 'destinations',
                            type: 'array',
                            items: new OA\Items(
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'id', type: 'string'),
                                    new OA\Property(property: 'adapter', type: 'string'),
                                    new OA\Property(property: 'name', type: 'string'),
                                ]
                            )
                        ),
                        new OA\Property(property: 'default_adapter', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server or node not found'),
            new OA\Response(response: 500, description: 'Failed to list backup destinations'),
        ]
    )]
    public function getBackupDestinations(Request $request, string $serverUuid): Response
    {
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::BACKUP_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        try {
            $wings = Wings::fromNode($node, 30);
            $adapters = BackupAdapterResolver::listAvailableAdapters($wings);
            $default = BackupAdapterResolver::normalizeStored(BackupAdapterResolver::resolveDefault($wings));

            $destinations = array_map(static function (string $adapter): array {
                return [
                    'id' => $adapter,
                    'adapter' => $adapter,
                    'name' => $adapter,
                ];
            }, $adapters);

            return ApiResponse::success([
                'adapters' => $adapters,
                'destinations' => $destinations,
                'default_adapter' => $default,
            ], 'Backup destinations retrieved');
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to list backup destinations: ' . $e->getMessage(), 'BACKUP_DESTINATIONS_FAILED', 500);
        }
    }

    /**
     * Full server backup: dump databases, write panel metadata, then Wings archive.
     *
     * @param array<string, mixed> $body
     */
    private function createFullBackup(Request $request, array $server, array $body): Response
    {
        $user = $request->attributes->get('user');
        $canViewPassword = \App\Helpers\SubuserPermissionChecker::hasPermission(
            (int) $user['id'],
            (int) $server['id'],
            SubuserPermissions::DATABASE_VIEW_PASSWORD
        );

        $includeEncrypted = !empty($body['include_encrypted']);
        if ($includeEncrypted && !$canViewPassword) {
            return ApiResponse::error(
                'database.view_password is required to include encrypted secrets',
                'FORBIDDEN',
                403
            );
        }

        // Database dumps need password access; allow full without dumps only if explicitly none — always dump all MySQL when permitted
        if (!$canViewPassword) {
            return ApiResponse::error(
                'Insufficient permissions to create a full backup (database.view_password required)',
                'FORBIDDEN',
                403
            );
        }

        $currentBackups = count(Backup::getBackupsByServerId((int) $server['id']));
        $backupLimit = (int) ($server['backup_limit'] ?? 0);

        if ($backupLimit === 0) {
            return ApiResponse::error('Backups are disabled for this server', 'BACKUPS_DISABLED', 403);
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        try {
            $wings = Wings::fromNode($node, 120);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to node: ' . $e->getMessage(), 'WINGS_CONNECTION_FAILED', 500);
        }

        if ($currentBackups >= $backupLimit) {
            if (!BackupFifoEviction::isFifoRollingForServer($server)) {
                return ApiResponse::error('Backup limit reached', 'BACKUP_LIMIT_REACHED', 400);
            }
            $evictErr = BackupFifoEviction::evictOldestWingsBackup((int) $server['id'], (string) $server['uuid'], $wings);
            if ($evictErr !== null) {
                return ApiResponse::error($evictErr['message'], $evictErr['code'], $evictErr['status']);
            }
        }

        try {
            $payload = json_encode([
                'type' => 'full',
                'ignored_files' => $body['ignore'] ?? ($body['ignored_files'] ?? ''),
                'databases' => $body['databases'] ?? 'all',
                'directory' => ServerDatabaseDumpService::DEFAULT_BACKUP_DIRECTORY,
                'include_metadata' => array_key_exists('include_metadata', $body) ? !empty($body['include_metadata']) : true,
                'include_encrypted' => $includeEncrypted,
                'include_activities' => !empty($body['include_activities']),
            ]);
            $parsed = ServerDatabaseDumpService::parseBackupPayload((string) $payload);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'INVALID_PAYLOAD', 400);
        }

        $backupName = trim((string) ($body['name'] ?? ''));
        if ($backupName === '') {
            $backupName = 'Full backup at ' . date('Y-m-d H:i:s');
        }

        try {
            $result = ServerFullBackupService::run($wings, $server, $parsed, [
                'name' => $backupName,
                'uuid' => $body['uuid'] ?? null,
            ]);

            $this->logActivity($server, $node, 'full_backup_created', [
                'backup_uuid' => $result['wings_backup']['uuid'],
                'backup_name' => $result['wings_backup']['name'],
                'metadata_included' => $result['metadata_included'],
                'backed_up' => $result['backed_up'],
                'dump_errors' => $result['dump_errors'],
            ], $user);

            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerBackupEvent::onServerBackupCreated(),
                    [
                        'user_uuid' => $user['uuid'] ?? null,
                        'server_uuid' => $server['uuid'],
                        'backup_uuid' => $result['wings_backup']['uuid'],
                        'type' => 'full',
                    ]
                );
            }

            return ApiResponse::success([
                'id' => $result['wings_backup']['id'],
                'uuid' => $result['wings_backup']['uuid'],
                'name' => $result['wings_backup']['name'],
                'adapter' => $result['wings_backup']['adapter'],
                'type' => 'full',
                'backed_up' => $result['backed_up'],
                'dump_errors' => $result['dump_errors'],
                'metadata_included' => $result['metadata_included'],
                'metadata_path' => $result['metadata_path'],
            ], 'Full backup initiated successfully', 202);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'INVALID_PAYLOAD', 400);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to create full backup: ' . $e->getMessage());

            return ApiResponse::error('Failed to create full backup: ' . $e->getMessage(), 'FULL_BACKUP_FAILED', 500);
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
