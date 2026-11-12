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

namespace App\Services\Server;

use App\App;
use App\Chat\Node;
use App\Services\Wings\Wings;

/**
 * Pushes the panel's current server configuration (including the suspended flag)
 * to Wings after the database is updated.
 *
 * Wings does not refresh server configuration on a timer. Without this, unsuspend
 * only updates the panel database and the daemon keeps treating the server as
 * suspended (console websockets close with "server is suspended") until something
 * else syncs — for example adding or removing a subuser. Suspend without a sync
 * also leaves Wings able to crash-auto-restart the process.
 */
class WingsSuspensionSync
{
    /**
     * Ask Wings to re-fetch this server's configuration from the panel.
     *
     * @param array<string, mixed> $server Must include uuid and node_id
     */
    public static function sync(array $server, int $timeout = 30): bool
    {
        $uuid = trim((string) ($server['uuid'] ?? ''));
        $nodeId = (int) ($server['node_id'] ?? 0);
        if ($uuid === '' || $nodeId < 1) {
            return false;
        }

        $node = Node::getNodeById($nodeId);
        if (!$node) {
            return false;
        }

        try {
            $response = Wings::fromNode($node, $timeout)->getServer()->syncServer($uuid);
            if ($response->isSuccessful()) {
                return true;
            }
            App::getInstance(true)->getLogger()->warning(
                'Failed to sync server suspension state to Wings: ' . $response->getError() . ' (server: ' . $uuid . ')'
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning(
                'Failed to sync server suspension state to Wings: ' . $e->getMessage() . ' (server: ' . $uuid . ')'
            );
        }

        return false;
    }

    /**
     * After the server is marked suspended in the database, sync that state to
     * Wings (which stops the process and closes websockets). If the sync fails,
     * a kill is attempted so the process still stops, but this still returns
     * false: a successful kill does not mean Wings has the suspended flag.
     *
     * @param array<string, mixed> $server Must include uuid and node_id
     */
    public static function afterSuspend(array $server, int $timeout = 30): bool
    {
        if (self::sync($server, $timeout)) {
            return true;
        }

        self::kill($server, $timeout);

        return false;
    }

    /**
     * After the suspended flag is cleared in the database, sync so Wings allows
     * consoles and starts again.
     *
     * @param array<string, mixed> $server Must include uuid and node_id
     */
    public static function afterUnsuspend(array $server, int $timeout = 30): bool
    {
        return self::sync($server, $timeout);
    }

    /**
     * @param array<string, mixed> $server Must include uuid and node_id
     */
    public static function kill(array $server, int $timeout = 30): bool
    {
        $uuid = trim((string) ($server['uuid'] ?? ''));
        $nodeId = (int) ($server['node_id'] ?? 0);
        if ($uuid === '' || $nodeId < 1) {
            return false;
        }

        $node = Node::getNodeById($nodeId);
        if (!$node) {
            return false;
        }

        try {
            $response = Wings::fromNode($node, $timeout)->getServer()->killServer($uuid);
            if ($response->isSuccessful()) {
                return true;
            }
            App::getInstance(true)->getLogger()->warning(
                'Failed to kill server on Wings after suspend: ' . $response->getError() . ' (server: ' . $uuid . ')'
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning(
                'Failed to kill server on Wings after suspend: ' . $e->getMessage() . ' (server: ' . $uuid . ')'
            );
        }

        return false;
    }
}
