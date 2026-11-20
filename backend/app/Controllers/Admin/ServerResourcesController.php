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

namespace App\Controllers\Admin;

use App\Chat\Node;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\ServerResourcesHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerResourcesController
{
    /** Upper bound per request; the admin list pages hold at most 100 rows. */
    public const MAX_IDS = 100;

    /** @var callable|null Test seam forwarded to ServerResourcesHelper::probeNodes */
    public static $fetcher;

    #[OA\Get(
        path: '/api/admin/servers/resources',
        summary: 'Live resource usage for a set of servers',
        description: 'Returns CPU, memory, disk and state for the given servers. The daemon of each node is asked once for all its servers.',
        tags: ['Admin - Servers'],
        parameters: [
            new OA\Parameter(name: 'ids', in: 'query', required: true, description: 'Comma separated server IDs (max 100)', schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Resource usage keyed by server ID'),
            new OA\Response(response: 400, description: 'Missing or invalid IDs'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function index(Request $request): Response
    {
        $rawIds = (string) $request->query->get('ids', '');
        $ids = array_values(array_unique(array_filter(
            array_map('intval', explode(',', $rawIds)),
            static fn (int $id): bool => $id > 0
        )));

        if ($ids === []) {
            return ApiResponse::error('Missing or invalid server IDs', 'INVALID_SERVER_IDS', 400);
        }
        if (count($ids) > self::MAX_IDS) {
            return ApiResponse::error('Too many server IDs (max ' . self::MAX_IDS . ')', 'TOO_MANY_SERVER_IDS', 400);
        }

        $servers = Server::getServersByIds($ids);
        $nodes = Node::getNodesByIds(array_map(static fn (array $s): int => (int) ($s['node_id'] ?? 0), $servers));
        $probes = ServerResourcesHelper::probeNodes(array_values($nodes), ServerResourcesHelper::PROBE_TIMEOUT, self::$fetcher);

        $resources = [];
        foreach ($servers as $id => $server) {
            $nodeId = (int) ($server['node_id'] ?? 0);
            $probe = $probes[$nodeId] ?? null;
            if ($probe === null || !$probe['online']) {
                $resources[(string) $id] = ['node_online' => false, 'found' => false];
                continue;
            }
            $usage = $probe['servers'][strtolower((string) ($server['uuid'] ?? ''))] ?? null;
            $resources[(string) $id] = $usage === null
                ? ['node_online' => true, 'found' => false]
                : ['node_online' => true, 'found' => true] + $usage;
        }

        $nodeStatus = [];
        foreach ($probes as $nodeId => $probe) {
            $nodeStatus[(string) $nodeId] = ['online' => $probe['online']];
        }

        return ApiResponse::success([
            'resources' => (object) $resources,
            'nodes' => (object) $nodeStatus,
            'fetched_at' => time(),
        ], 'Server resources retrieved successfully', 200);
    }
}
