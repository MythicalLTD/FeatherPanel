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

namespace App\Services\Servers;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\Subuser;
use App\Services\Wings\Wings;

/**
 * Ends a user's open websocket and SFTP sessions on every server they own or are a subuser of.
 *
 * Used when the account's credentials or standing change (password change, sign out everywhere,
 * suspension, deletion). It is best effort: an unreachable node is logged and skipped.
 */
final class UserServerAccessRevoker
{
    /**
     * @var (callable(array<string, mixed>, string, list<string>): void)|null test seam
     */
    public static $sender;

    /**
     * @param array<string, mixed> $user
     *
     * @return int number of nodes asked
     */
    public static function revokeEverywhere(array $user): int
    {
        $userId = (int) ($user['id'] ?? 0);
        $userUuid = (string) ($user['uuid'] ?? '');
        if ($userId <= 0 || $userUuid === '') {
            return 0;
        }

        try {
            $byNode = self::serversByNode($userId);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('Could not list servers to end sessions for user ' . $userUuid . ': ' . $e->getMessage());

            return 0;
        }

        $asked = 0;
        foreach ($byNode as $nodeId => $serverUuids) {
            $node = Node::getNodeById($nodeId);
            if (!$node) {
                continue;
            }
            ++$asked;
            try {
                if (self::$sender !== null) {
                    (self::$sender)($node, $userUuid, $serverUuids);
                    continue;
                }
                $response = Wings::fromNode($node, 10)->getServer()->deAuthUserFromServers($userUuid, $serverUuids, 0);
                if (!$response->isSuccessful()) {
                    App::getInstance(true)->getLogger()->warning(
                        'Ending sessions for user ' . $userUuid . ' on node ' . $nodeId . ' failed: ' . ($response->getError() ?? 'unknown')
                    );
                }
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning(
                    'Ending sessions for user ' . $userUuid . ' on node ' . $nodeId . ' failed: ' . $e->getMessage()
                );
            }
        }

        return $asked;
    }

    /**
     * @return array<int, list<string>> node id => server uuids
     */
    public static function serversByNode(int $userId): array
    {
        $servers = Server::getServersByOwnerId($userId);
        foreach (Subuser::getSubusersByUserId($userId) as $subuser) {
            $server = Server::getServerById((int) ($subuser['server_id'] ?? 0));
            if ($server) {
                $servers[] = $server;
            }
        }

        $byNode = [];
        foreach ($servers as $server) {
            $nodeId = (int) ($server['node_id'] ?? 0);
            $uuid = (string) ($server['uuid'] ?? '');
            if ($nodeId <= 0 || $uuid === '') {
                continue;
            }
            $byNode[$nodeId] ??= [];
            if (!in_array($uuid, $byNode[$nodeId], true)) {
                $byNode[$nodeId][] = $uuid;
            }
        }

        return $byNode;
    }
}
