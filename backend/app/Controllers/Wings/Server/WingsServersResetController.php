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

namespace App\Controllers\Wings\Server;

use App\Chat\Node;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'ServersResetResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'success', type: 'boolean', description: 'Whether the reset was successful'),
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
class WingsServersResetController
{
    #[OA\Post(
        path: '/api/remote/servers/reset',
        summary: 'Reset servers',
        description: 'Reset all server statuses for the authenticated Wings node. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Server'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Servers reset successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServersResetResponse')
            ),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function resetServers(Request $request): Response
    {
        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);

        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Reset each server's status
        $resetResult = Server::resetAllServerStatuses($node['id']);

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsServersResetCompleted(),
            [
                'node' => $node,
                'reset_result' => $resetResult,
            ]
        );

        return ApiResponse::sendManualResponse([
            'success' => true,
            'message' => 'Servers reset successfully',
        ], 200);
    }
}
