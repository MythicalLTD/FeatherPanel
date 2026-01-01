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
