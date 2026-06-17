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

namespace App\Helpers;

use App\Chat\Server;

class NodeStatusHelper
{
    /**
     * Build a lightweight server list for node status displays.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function buildServersForNode(int $nodeId, bool $includePlayerCount = false): array
    {
        if ($nodeId <= 0) {
            return [];
        }

        $servers = Server::getServersByNodeId($nodeId);
        $result = [];

        foreach ($servers as $server) {
            $entry = [
                'id' => (int) $server['id'],
                'name' => $server['name'],
                'uuid_short' => $server['uuidShort'] ?? '',
                'status' => $server['status'] ?? 'offline',
            ];

            if ($includePlayerCount) {
                $uuidShort = $server['uuidShort'] ?? '';
                if ($uuidShort !== '') {
                    $playerStatus = PlayerStatusService::getPlayerStatus($uuidShort);
                    if ($playerStatus !== null) {
                        $entry['player_count'] = (int) ($playerStatus['player_count'] ?? 0);
                    }
                }
            }

            $result[] = $entry;
        }

        usort($result, static fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));

        return $result;
    }
}
