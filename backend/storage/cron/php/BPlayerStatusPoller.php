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

namespace App\Cron;

/**
 * BPlayerStatusPoller - Cron task for polling game servers for player status.
 *
 * This cron job runs every 30 seconds and queries all running game servers
 * for player count and player names using the PlayerStatusService.
 * Results are cached in Redis for the frontend API to serve.
 */

use App\App;
use App\Chat\Database;
use App\Helpers\GameTypeResolver;
use App\Helpers\PlayerStatusService;
use App\Cli\Utils\MinecraftColorCodeSupport;

class BPlayerStatusPoller implements TimeTask
{
    /**
     * Entry point for the cron PlayerStatusPoller.
     */
    public function run()
    {
        $cron = new Cron('player-status-poller', '30S');
        try {
            $cron->runIfDue(function () {
                $this->processTask();
            });
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process PlayerStatusPoller: ' . $e->getMessage());
        }
    }

    /**
     * Process the main task logic.
     *
     * Queries all running servers, resolves game types, and polls each
     * supported server for player status data.
     */
    private function processTask(): void
    {
        $app = App::getInstance(false, true);
        $logger = $app->getLogger();
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing PlayerStatusPoller...');

        $servers = $this->getRunningServers();

        if (empty($servers)) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&7No running servers found for player status polling');

            return;
        }

        $queriedCount = 0;
        $skippedCount = 0;

        foreach ($servers as $row) {
            $server = [
                'uuid_short' => $row['uuid_short'],
                'uuid' => $row['uuid'],
                'name' => $row['name'],
                'status' => $row['status'],
                'ip' => $row['ip'],
                'port' => $row['port'],
                'spell' => [
                    'name' => $row['spell_name'],
                    'gamedig_type' => $row['gamedig_type'],
                ],
                'realm' => [
                    'name' => $row['realm_name'],
                ],
            ];

            // Skip servers where player status is disabled (Requirement 5.5)
            if (!empty($row['player_status_disabled'])) {
                ++$skippedCount;

                continue;
            }

            // Resolve game type and skip unsupported servers (Requirement 4.5)
            $gameType = GameTypeResolver::resolve($server);

            if ($gameType === null) {
                $logger->warning('PlayerStatusPoller: Unsupported game type for server "' . $row['name'] . '" (uuid_short: ' . $row['uuid_short'] . ', spell: ' . ($row['spell_name'] ?? 'unknown') . ')');
                ++$skippedCount;

                continue;
            }

            // Query the server for player status
            try {
                PlayerStatusService::queryServer($server);
                ++$queriedCount;
            } catch (\Exception $e) {
                $logger->error('PlayerStatusPoller: Failed to query server "' . $row['name'] . '": ' . $e->getMessage());
            }
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aPlayerStatusPoller completed: queried ' . $queriedCount . ' server(s), skipped ' . $skippedCount);
    }

    /**
     * Get all running servers with their allocation, spell, and realm data.
     *
     * @return array Array of server rows with joined data
     */
    private function getRunningServers(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT
                s.uuidShort AS uuid_short,
                s.uuid,
                s.name,
                s.status,
                a.ip,
                a.port,
                sp.name AS spell_name,
                sp.gamedig_type,
                r.name AS realm_name
            FROM featherpanel_servers s
            INNER JOIN featherpanel_allocations a ON a.id = s.allocation_id
            INNER JOIN featherpanel_spells sp ON sp.id = s.spell_id
            INNER JOIN featherpanel_realms r ON r.id = s.realms_id
            WHERE s.status = :status
        ');
        $stmt->execute(['status' => 'running']);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
