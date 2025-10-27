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

namespace App\Controllers\User\Server\Logs;

use App\App;
use App\Chat\Server;
use App\Helpers\LogHelper;
use App\SubuserPermissions;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Helpers\ServerGateway;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Controllers\User\Server\CheckSubuserPermissionsTrait;

#[OA\Schema(
    schema: 'ServerLogsResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'response', type: 'array', items: new OA\Items(type: 'string'), description: 'Array of log lines from the server'),
    ]
)]
#[OA\Schema(
    schema: 'InstallLogsResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'response', type: 'array', items: new OA\Items(type: 'string'), description: 'Array of installation log lines from the server'),
    ]
)]
class ServerLogsController
{
    use CheckSubuserPermissionsTrait;

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/logs',
        summary: 'Get server logs',
        description: 'Retrieve the current server logs from the Wings daemon. These logs contain real-time server output and events.',
        tags: ['User - Server Logs'],
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
                description: 'Server logs retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServerLogsResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server configuration'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated or Wings daemon unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server or Wings daemon'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 422, description: 'Unprocessable entity - Invalid server data'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve logs'),
        ]
    )]
    public function getLogs(Request $request, string $uuidShort): Response
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

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        // Check activity.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::ACTIVITY_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get node information
        $node = \App\Chat\Node::getNodeById($server['node_id']);
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

            $response = $wings->getServer()->getServerLogs($server['uuid']);

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

        return ApiResponse::success(['response' => $response->getData()], 'Response from Wings', 200);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/install-logs',
        summary: 'Get server installation logs',
        description: 'Retrieve the installation logs from the Wings daemon. These logs contain the server installation process output and any errors that occurred during setup.',
        tags: ['User - Server Logs'],
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
                description: 'Installation logs retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/InstallLogsResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server configuration'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated or Wings daemon unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server or Wings daemon'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 422, description: 'Unprocessable entity - Invalid server data'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve installation logs'),
        ]
    )]
    public function getInstallLogs(Request $request, string $uuidShort): Response
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

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        // Check activity.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::ACTIVITY_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get node information
        $node = \App\Chat\Node::getNodeById($server['node_id']);
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

            $response = $wings->getServer()->getServerInstallLogs($server['uuid']);

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

        return ApiResponse::success(['response' => $response->getData()], 'Response from Wings', 200);
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/logs/upload',
        summary: 'Upload server logs to mclo.gs',
        description: 'Upload the current server logs to mclo.gs paste service and return the shareable URL.',
        tags: ['User - Server Logs'],
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
                description: 'Logs uploaded successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'id', type: 'string', description: 'mclo.gs paste ID'),
                        new OA\Property(property: 'url', type: 'string', description: 'Full mclo.gs URL'),
                        new OA\Property(property: 'raw', type: 'string', description: 'Raw paste URL'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No logs to upload or upload failed'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to upload logs'),
        ]
    )]
    public function uploadLogs(Request $request, string $uuidShort): Response
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

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        // Check activity.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::ACTIVITY_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get node information
        $node = \App\Chat\Node::getNodeById($server['node_id']);
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

            $response = $wings->getServer()->getServerLogs($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to fetch logs from Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Get log data
            $logData = $response->getData();
            if (empty($logData)) {
                return ApiResponse::error('No logs available to upload', 'NO_LOGS', 400);
            }

            // Convert to string properly
            if (is_array($logData)) {
                // Flatten array and convert to string
                $logLines = [];
                array_walk_recursive($logData, function ($value) use (&$logLines) {
                    if (is_scalar($value)) {
                        $logLines[] = (string) $value;
                    }
                });
                $logContent = implode("\n", $logLines);
            } elseif (is_string($logData)) {
                $logContent = $logData;
            } else {
                // Try to convert to JSON if it's an object
                $logContent = json_encode($logData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            }

            if (empty($logContent) || trim($logContent) === '') {
                return ApiResponse::error('No logs available to upload', 'NO_LOGS', 400);
            }

            // Upload to mclo.gs
            $uploadResult = LogHelper::uploadToMcloGs($logContent);

            if (!$uploadResult['success']) {
                return ApiResponse::error($uploadResult['error'] ?? 'Failed to upload logs', 'UPLOAD_FAILED', 500);
            }

            return ApiResponse::success([
                'id' => $uploadResult['id'],
                'url' => $uploadResult['url'],
                'raw' => $uploadResult['raw'],
            ], 'Logs uploaded successfully', 200);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to upload logs to mclo.gs: ' . $e->getMessage());

            return ApiResponse::error('Failed to upload logs: ' . $e->getMessage(), 'UPLOAD_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/install-logs/upload',
        summary: 'Upload server installation logs to mclo.gs',
        description: 'Upload the server installation logs to mclo.gs paste service and return the shareable URL.',
        tags: ['User - Server Logs'],
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
                description: 'Installation logs uploaded successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'id', type: 'string', description: 'mclo.gs paste ID'),
                        new OA\Property(property: 'url', type: 'string', description: 'Full mclo.gs URL'),
                        new OA\Property(property: 'raw', type: 'string', description: 'Raw paste URL'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No logs to upload or upload failed'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to upload logs'),
        ]
    )]
    public function uploadInstallLogs(Request $request, string $uuidShort): Response
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

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        // Check activity.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::ACTIVITY_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get node information
        $node = \App\Chat\Node::getNodeById($server['node_id']);
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

            $response = $wings->getServer()->getServerInstallLogs($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to fetch install logs from Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Get log data
            $logData = $response->getData();
            if (empty($logData)) {
                return ApiResponse::error('No installation logs available to upload', 'NO_LOGS', 400);
            }

            // Convert array to string if needed
            if (is_array($logData)) {
                $logContent = implode("\n", $logData);
            } else {
                $logContent = (string) $logData;
            }

            if (trim($logContent) === '') {
                return ApiResponse::error('No installation logs available to upload', 'NO_LOGS', 400);
            }

            // Upload to mclo.gs
            $uploadResult = LogHelper::uploadToMcloGs($logContent);

            if (!$uploadResult['success']) {
                return ApiResponse::error($uploadResult['error'] ?? 'Failed to upload installation logs', 'UPLOAD_FAILED', 500);
            }

            return ApiResponse::success([
                'id' => $uploadResult['id'],
                'url' => $uploadResult['url'],
                'raw' => $uploadResult['raw'],
            ], 'Installation logs uploaded successfully', 200);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to upload installation logs to mclo.gs: ' . $e->getMessage());

            return ApiResponse::error('Failed to upload installation logs: ' . $e->getMessage(), 'UPLOAD_ERROR', 500);
        }
    }
}
