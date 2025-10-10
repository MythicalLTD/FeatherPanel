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

namespace App\Controllers\User\Server\Power;

use App\App;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'PowerActionResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'response', type: 'object', description: 'Response from Wings daemon'),
    ]
)]
class ServerPowerController
{
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/power/{action}',
        summary: 'Send power action to server',
        description: 'Send a power action (start, stop, restart, kill) to a server through the Wings daemon.',
        tags: ['User - Server Power'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'action',
                in: 'path',
                description: 'Power action to perform',
                required: true,
                schema: new OA\Schema(
                    type: 'string',
                    enum: ['start', 'stop', 'restart', 'kill'],
                    description: 'Power action: start, stop, restart, or kill'
                )
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Power action sent successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/PowerActionResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server configuration or invalid power action'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated or Wings daemon unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server or Wings daemon'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 422, description: 'Unprocessable entity - Invalid server data'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to send power action'),
        ]
    )]
    public function sendPowerAction(Request $request, string $uuidShort, string $action): Response
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

        // Send power action
        $allowedActions = ['start', 'stop', 'restart', 'kill'];
        if (!in_array($action, $allowedActions)) {
            return ApiResponse::error('Invalid power action', 'INVALID_POWER_ACTION', 400);
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

            if ($action === 'start') {
                $response = $wings->getServer()->startServer($server['uuid']);
            } elseif ($action === 'stop') {
                $response = $wings->getServer()->stopServer($server['uuid']);
            } elseif ($action === 'restart') {
                $response = $wings->getServer()->restartServer($server['uuid']);
            } elseif ($action === 'kill') {
                $response = $wings->getServer()->killServer($server['uuid']);
            }

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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerPowerAction(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'action' => $action,
                ]
            );
        }

        return ApiResponse::success(['response' => $response->getData()], 'Response from Wings', 200);
    }
}
