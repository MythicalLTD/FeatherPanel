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

use App\App;
use App\Chat\Database;
use App\Chat\ServerResourceSample;
use App\Helpers\ServerUtilization;
use App\Cli\Utils\MinecraftColorCodeSupport;

/**
 * BServerResourceSampler - stores a CPU, memory and disk sample for every running server
 * every five minutes (one Wings call per node), and drops samples older than a day.
 * The dashboard sparklines, the trends card and the console header read from it.
 */
class BServerResourceSampler implements TimeTask
{
    private const WINGS_TIMEOUT = 5;

    private const INSERT_CHUNK = 500;

    /** Daemon states that count as "up" for the history. */
    private const SAMPLED_STATES = ['running', 'starting', 'stopping'];

    public function run()
    {
        $cron = new Cron('server-resource-sampler', '5M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $this->processTask();
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process ServerResourceSampler: ' . $e->getMessage());
        }
    }

    private function processTask(): void
    {
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing ServerResourceSampler...');

        $pruned = ServerResourceSample::prune();

        $pdo = Database::getPdoConnection();
        $servers = $pdo->query('SELECT id, uuid, node_id FROM featherpanel_servers WHERE suspended = 0 AND node_id IS NOT NULL')
            ->fetchAll(\PDO::FETCH_ASSOC);
        if ($servers === []) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&7No servers to sample');

            return;
        }

        $idByUuid = [];
        foreach ($servers as $server) {
            $idByUuid[(string) $server['uuid']] = (int) $server['id'];
        }

        $samples = [];
        foreach (ServerUtilization::collect($servers, self::WINGS_TIMEOUT) as $uuid => $stats) {
            if (!isset($idByUuid[$uuid]) || !in_array($stats['state'], self::SAMPLED_STATES, true)) {
                continue;
            }
            $samples[$idByUuid[$uuid]] = [
                'cpu' => $stats['cpu'],
                'memory_bytes' => $stats['memory_bytes'],
                'disk_bytes' => $stats['disk_bytes'],
            ];
        }

        $bucket = ServerResourceSample::bucket(time());
        $stored = 0;
        foreach (array_chunk($samples, self::INSERT_CHUNK, true) as $chunk) {
            $stored += ServerResourceSample::record($chunk, $bucket);
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aServerResourceSampler completed: stored ' . $stored . ' sample(s), pruned ' . $pruned);
    }
}
