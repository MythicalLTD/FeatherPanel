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
use App\Chat\Server;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Chat\ServerImport as ServerImportModel;

#[OA\Schema(
    schema: 'ServerImportRequest',
    type: 'object',
    required: ['user', 'password', 'hote', 'port', 'srclocation', 'dstlocation', 'type'],
    properties: [
        new OA\Property(property: 'user', type: 'string', description: 'Username for SFTP/FTP authentication'),
        new OA\Property(property: 'password', type: 'string', description: 'Password for SFTP/FTP authentication'),
        new OA\Property(property: 'hote', type: 'string', description: 'Hostname or IP address of the remote server'),
        new OA\Property(property: 'port', type: 'integer', description: 'Port number (1-65535). Typically 22 for SFTP, 21 for FTP'),
        new OA\Property(property: 'srclocation', type: 'string', description: 'Source path on the remote server (absolute path)'),
        new OA\Property(property: 'dstlocation', type: 'string', description: 'Destination path on the local server (relative to server root)'),
        new OA\Property(property: 'wipe', type: 'boolean', description: 'If true, clears the destination directory before importing', default: false),
        new OA\Property(property: 'type', type: 'string', enum: ['sftp', 'ftp'], description: 'Connection type'),
    ]
)]
class ServerImportController
{
    use CheckSubuserPermissionsTrait;

    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    /**
     * Import server files from a remote SFTP or FTP server.
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/import',
        summary: 'Import server files',
        description: 'Import server files from a remote SFTP or FTP server. The server must be offline for imports to work.',
        tags: ['User - Server Import'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                required: true,
                description: 'Server short UUID',
                schema: new OA\Schema(type: 'string'),
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ServerImportRequest')
        ),
        responses: [
            new OA\Response(response: 202, description: 'Import process started successfully'),
            new OA\Response(response: 400, description: 'Bad request - Invalid data or server is online'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Feature disabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Server or node not found'),
            new OA\Response(response: 409, description: 'Conflict - Server is executing another power action'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function importServer(Request $request, string $uuidShort): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if user-made import is enabled
        $importEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_IMPORT, 'false');
        if ($importEnabled !== 'true') {
            return ApiResponse::error('Server import is disabled', 'IMPORT_DISABLED', 403);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::IMPORT_MANAGE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_REQUEST_BODY', 400);
        }

        // Validate payload
        $validationError = $this->validateImportPayload($payload);
        if ($validationError !== null) {
            return $validationError;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            // Check server status - imports can only be performed when server is offline
            $serverStatusResponse = $wings->getServer()->getServer($server['uuid']);
            if ($serverStatusResponse->isSuccessful()) {
                $serverData = $serverStatusResponse->getData();
                $serverState = $serverData['state'] ?? 'unknown';
                if ($serverState !== 'offline' && $serverState !== 'stopped') {
                    return ApiResponse::error(
                        'Server must be offline to perform imports. Current state: ' . $serverState,
                        'SERVER_MUST_BE_OFFLINE',
                        400
                    );
                }
            }

            $response = $wings->getServer()->importServer($server['uuid'], [
                'user' => $payload['user'],
                'password' => $payload['password'],
                'hote' => $payload['hote'],
                'port' => (int) $payload['port'],
                'srclocation' => $payload['srclocation'],
                'dstlocation' => $payload['dstlocation'],
                'wipe' => $payload['wipe'] ?? false,
                'type' => $payload['type'],
            ]);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';
                $statusCode = $response->getStatusCode();

                // Handle specific error codes
                if ($statusCode === 409) {
                    return ApiResponse::error(
                        'Server is executing another power action. Please wait and try again.',
                        'SERVER_BUSY',
                        409
                    );
                }

                return ApiResponse::error(
                    'Failed to start import: ' . $error,
                    'IMPORT_FAILED',
                    $statusCode
                );
            }

            // Create import record in database
            $importId = ServerImportModel::create([
                'server_id' => $server['id'],
                'user' => $payload['user'],
                'host' => $payload['hote'],
                'port' => (int) $payload['port'],
                'source_location' => $payload['srclocation'],
                'destination_location' => $payload['dstlocation'],
                'type' => $payload['type'],
                'wipe' => $payload['wipe'] ?? false ? 1 : 0,
                'wipe_all_files' => $payload['wipe_all_files'] ?? false ? 1 : 0,
                'status' => 'importing',
                'started_at' => date('Y-m-d H:i:s'),
            ]);

            if (!$importId) {
                App::getInstance(true)->getLogger()->warning('Failed to create import record for server ' . $server['uuid']);
            }

            $this->logActivity(
                $server,
                $node,
                'server_import_started',
                [
                    'host' => $payload['hote'],
                    'port' => $payload['port'],
                    'source_location' => $payload['srclocation'],
                    'destination_location' => $payload['dstlocation'],
                    'type' => $payload['type'],
                    'wipe' => $payload['wipe'] ?? false,
                    'import_id' => $importId,
                ],
                $user
            );

            return ApiResponse::success([
                'message' => 'Import process started successfully',
                'import_id' => $importId,
            ], 'Import process started successfully', 202);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to start server import: ' . $e->getMessage());

            return ApiResponse::error('Failed to start import: ' . $e->getMessage(), 'IMPORT_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/imports',
        summary: 'List server imports',
        description: 'Get a list of all imports for a server with their statuses.',
        tags: ['User - Server Import'],
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
                description: 'List of imports',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean'),
                        new OA\Property(
                            property: 'data',
                            type: 'object',
                            properties: [
                                new OA\Property(
                                    property: 'imports',
                                    type: 'array',
                                    items: new OA\Items(
                                        properties: [
                                            new OA\Property(property: 'id', type: 'integer'),
                                            new OA\Property(property: 'server_id', type: 'integer'),
                                            new OA\Property(property: 'user', type: 'string'),
                                            new OA\Property(property: 'host', type: 'string'),
                                            new OA\Property(property: 'port', type: 'integer'),
                                            new OA\Property(property: 'source_location', type: 'string'),
                                            new OA\Property(property: 'destination_location', type: 'string'),
                                            new OA\Property(property: 'type', type: 'string', enum: ['sftp', 'ftp']),
                                            new OA\Property(property: 'wipe', type: 'boolean'),
                                            new OA\Property(property: 'wipe_all_files', type: 'boolean'),
                                            new OA\Property(property: 'status', type: 'string', enum: ['pending', 'importing', 'completed', 'failed']),
                                            new OA\Property(property: 'error', type: 'string', nullable: true),
                                            new OA\Property(property: 'started_at', type: 'string', nullable: true),
                                            new OA\Property(property: 'completed_at', type: 'string', nullable: true),
                                            new OA\Property(property: 'created_at', type: 'string'),
                                            new OA\Property(property: 'updated_at', type: 'string'),
                                        ]
                                    )
                                ),
                            ]
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server not found'),
        ]
    )]
    public function listImports(Request $request, string $serverUuid): Response
    {
        try {
            $user = $request->get('user');
            if (!$user) {
                return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
            }

            $server = Server::getServerByUuidShort($serverUuid);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            // Check import.read permission
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::IMPORT_READ);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $imports = ServerImportModel::getByServerId($server['id']);

            // Convert boolean fields from int to bool for JSON response
            foreach ($imports as &$import) {
                $import['wipe'] = (bool) $import['wipe'];
                $import['wipe_all_files'] = (bool) $import['wipe_all_files'];
            }

            return ApiResponse::success([
                'imports' => $imports,
            ], 'Imports retrieved successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to list imports: ' . $e->getMessage());

            return ApiResponse::error('Failed to retrieve imports: ' . $e->getMessage(), 'LIST_IMPORTS_FAILED', 500);
        }
    }

    /**
     * Validate import payload.
     *
     * @param array<string,mixed> $payload
     */
    private function validateImportPayload(array $payload): ?Response
    {
        // Required fields
        $requiredFields = ['user', 'password', 'hote', 'port', 'srclocation', 'dstlocation', 'type'];
        foreach ($requiredFields as $field) {
            if (!isset($payload[$field])) {
                return ApiResponse::error("Missing required field: {$field}", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Validate user
        if (!is_string($payload['user']) || trim($payload['user']) === '') {
            return ApiResponse::error('User must be a non-empty string', 'INVALID_USER', 400);
        }
        if (strlen($payload['user']) > 255) {
            return ApiResponse::error('User must be less than 255 characters', 'USER_TOO_LONG', 400);
        }

        // Validate password
        if (!is_string($payload['password']) || trim($payload['password']) === '') {
            return ApiResponse::error('Password must be a non-empty string', 'INVALID_PASSWORD', 400);
        }

        // Validate host (hote)
        if (!is_string($payload['hote']) || trim($payload['hote']) === '') {
            return ApiResponse::error('Host must be a non-empty string', 'INVALID_HOST', 400);
        }
        if (strlen($payload['hote']) > 255) {
            return ApiResponse::error('Host must be less than 255 characters', 'HOST_TOO_LONG', 400);
        }
        // Basic hostname/IP validation
        if (!filter_var($payload['hote'], FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) && !filter_var($payload['hote'], FILTER_VALIDATE_IP)) {
            return ApiResponse::error('Host must be a valid hostname or IP address', 'INVALID_HOST_FORMAT', 400);
        }

        // Validate port
        if (!is_numeric($payload['port'])) {
            return ApiResponse::error('Port must be a number', 'INVALID_PORT', 400);
        }
        $port = (int) $payload['port'];
        if ($port < 1 || $port > 65535) {
            return ApiResponse::error('Port must be between 1 and 65535', 'INVALID_PORT_RANGE', 400);
        }

        // Validate source location
        if (!is_string($payload['srclocation']) || trim($payload['srclocation']) === '') {
            return ApiResponse::error('Source location must be a non-empty string', 'INVALID_SOURCE_LOCATION', 400);
        }
        if (strlen($payload['srclocation']) > 500) {
            return ApiResponse::error('Source location must be less than 500 characters', 'SOURCE_LOCATION_TOO_LONG', 400);
        }

        // Validate destination location
        if (!is_string($payload['dstlocation']) || trim($payload['dstlocation']) === '') {
            return ApiResponse::error('Destination location must be a non-empty string', 'INVALID_DESTINATION_LOCATION', 400);
        }
        if (strlen($payload['dstlocation']) > 500) {
            return ApiResponse::error('Destination location must be less than 500 characters', 'DESTINATION_LOCATION_TOO_LONG', 400);
        }

        // Validate type
        if (!in_array($payload['type'], ['sftp', 'ftp'], true)) {
            return ApiResponse::error('Type must be either "sftp" or "ftp"', 'INVALID_TYPE', 400);
        }

        // Validate wipe (optional boolean)
        if (isset($payload['wipe']) && !is_bool($payload['wipe'])) {
            return ApiResponse::error('Wipe must be a boolean value', 'INVALID_WIPE', 400);
        }

        return null;
    }

    /**
     * Create a Wings instance for the given node.
     */
    private function createWings(array $node): Wings
    {
        $scheme = $node['scheme'] ?? 'http';
        $host = $node['fqdn'] ?? 'localhost';
        $port = $node['daemonListen'] ?? 8080;
        $token = $node['daemon_token'] ?? '';
        $timeout = 30;

        return new Wings($host, $port, $scheme, $token, $timeout);
    }

    /**
     * Log server activity.
     */
    private function logActivity(array $server, array $node, string $event, array $metadata, array $user): void
    {
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'ip' => $user['last_ip'] ?? null,
            'event' => $event,
            'metadata' => json_encode($metadata),
        ]);
    }
}
