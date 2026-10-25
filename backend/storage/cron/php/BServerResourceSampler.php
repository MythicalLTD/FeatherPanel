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
use App\Services\Notifications\InboxNotifier;

/**
 * BServerResourceSampler - stores a CPU, memory and disk sample for every running server
 * every five minutes (one Wings call per node), and drops samples older than seven days.
 * Servers that stay near a CPU, memory or disk limit get an alert in the notifications centre.
 * The dashboard sparklines, the trends card and the console header read from it.
 */
class BServerResourceSampler implements TimeTask
{
    private const WINGS_TIMEOUT = 5;

    private const INSERT_CHUNK = 500;

    /** Alert when a server stays at or above this share of a limit... */
    private const ALERT_THRESHOLD = 0.9;

    /** ...for this many consecutive samples (15 minutes), so short spikes stay quiet. */
    private const ALERT_SAMPLES = 3;

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
        $servers = $pdo->query('SELECT id, uuid, uuidShort, name, owner_id, node_id, memory, disk, cpu FROM featherpanel_servers WHERE suspended = 0 AND node_id IS NOT NULL')
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

        $alerts = 0;
        foreach ($servers as $server) {
            if (isset($samples[(int) $server['id']])) {
                $alerts += $this->checkLimits($server);
            }
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aServerResourceSampler completed: stored ' . $stored . ' sample(s), pruned ' . $pruned . ', limit alerts ' . $alerts);
    }

    /** Notify when the last samples all sit at or above the threshold of a limit (0 means unlimited). */
    private function checkLimits(array $server): int
    {
        $limits = [
            'cpu' => (float) ($server['cpu'] ?? 0),
            'memory' => (float) ($server['memory'] ?? 0) * 1024 * 1024,
            'disk' => (float) ($server['disk'] ?? 0) * 1024 * 1024,
        ];
        if (max($limits) <= 0) {
            return 0;
        }
        $recent = ServerResourceSample::latest((int) $server['id'], self::ALERT_SAMPLES);
        if (count($recent) < self::ALERT_SAMPLES) {
            return 0;
        }
        $fields = ['cpu' => 'cpu', 'memory' => 'memory_bytes', 'disk' => 'disk_bytes'];
        $sent = 0;
        foreach ($limits as $metric => $limit) {
            if ($limit <= 0) {
                continue;
            }
            $lowest = min(array_map(static fn (array $s): float => (float) $s[$fields[$metric]], $recent));
            if ($lowest >= $limit * self::ALERT_THRESHOLD) {
                InboxNotifier::resourceLimit($server, $metric, (int) min(999, round($lowest / $limit * 100)));
                ++$sent;
            }
        }

        return $sent;
    }
}
