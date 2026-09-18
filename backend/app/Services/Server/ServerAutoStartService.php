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
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Config\ConfigInterface;
use App\Helpers\WingsUrlHelper;
use App\Chat\ServerAutoStartQueue;

/**
 * Queues and processes per-server auto-start after a FeatherWings node reconnects.
 */
class ServerAutoStartService
{
    /**
     * Queue eligible servers on a node after Wings calls /api/remote/servers/reset.
     *
     * @param array<string, mixed> $node
     *
     * @return int Number of servers queued
     */
    public function queueForNodeReconnect(array $node): int
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::SERVER_AUTO_START_ON_NODE_RECONNECT, 'true') === 'false') {
            return 0;
        }

        $nodeId = (int) ($node['id'] ?? 0);
        if ($nodeId <= 0) {
            return 0;
        }

        ServerAutoStartQueue::cancelPendingForNode($nodeId);

        $servers = Server::getServersByNodeId($nodeId);
        if ($servers === []) {
            return 0;
        }

        $stagger = max(0, (int) $config->getSetting(ConfigInterface::SERVER_AUTO_START_STAGGER_SECONDS, '5'));
        $baseOffset = max(0, (int) $config->getSetting(ConfigInterface::SERVER_AUTO_START_INITIAL_DELAY_SECONDS, '15'));

        $eligible = [];
        foreach ($servers as $server) {
            if (!$this->isEligibleForAutoStart($server)) {
                continue;
            }
            $eligible[] = $server;
        }

        // Stable order by id so restarts are predictable
        usort($eligible, static fn (array $a, array $b): int => ((int) $a['id']) <=> ((int) $b['id']));

        $queued = 0;
        $index = 0;
        foreach ($eligible as $server) {
            $extraDelay = max(0, (int) ($server['auto_start_delay'] ?? 0));
            $delaySeconds = $baseOffset + ($index * $stagger) + $extraDelay;
            $scheduledAt = gmdate('Y-m-d H:i:s', time() + $delaySeconds);

            if (ServerAutoStartQueue::enqueue((int) $server['id'], $nodeId, $scheduledAt) !== false) {
                ++$queued;
                ++$index;
            }
        }

        if ($queued > 0) {
            App::getInstance(true)->getLogger()->info(
                "Queued {$queued} auto-start job(s) for node {$nodeId} after reconnect"
            );
        }

        return $queued;
    }

    /**
     * Process due auto-start queue jobs.
     *
     * @return array{processed: int, started: int, skipped: int, failed: int}
     */
    public function processDueJobs(int $limit = 20): array
    {
        $stats = ['processed' => 0, 'started' => 0, 'skipped' => 0, 'failed' => 0];
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::SERVER_AUTO_START_ON_NODE_RECONNECT, 'true') === 'false') {
            return $stats;
        }

        $jobs = ServerAutoStartQueue::getDueJobs($limit);
        foreach ($jobs as $job) {
            if (!ServerAutoStartQueue::claimJob((int) $job['id'])) {
                continue;
            }

            ++$stats['processed'];
            $result = $this->processJob($job);
            ++$stats[$result];
        }

        return $stats;
    }

    /**
     * Mark intentional stop/kill vs clear on start/restart.
     */
    public static function markPowerIntent(int $serverId, string $action): void
    {
        if ($serverId <= 0) {
            return;
        }

        if ($action === 'stop' || $action === 'kill') {
            Server::updateServerById($serverId, ['manually_stopped' => 1]);
        } elseif ($action === 'start' || $action === 'restart') {
            Server::updateServerById($serverId, ['manually_stopped' => 0]);
        }
    }

    /**
     * @param array<string, mixed> $server
     */
    public function isEligibleForAutoStart(array $server): bool
    {
        if (empty($server['auto_start'])) {
            return false;
        }

        if (!empty($server['manually_stopped'])) {
            return false;
        }

        if (!empty($server['suspended'])) {
            return false;
        }

        $status = strtolower((string) ($server['status'] ?? ''));
        if (in_array($status, ['suspended', 'installing', 'install_failed', 'restoring_backup', 'transferring'], true)) {
            return false;
        }

        return true;
    }

    /**
     * @param array<string, mixed> $job
     *
     * @return 'started'|'skipped'|'failed'
     */
    private function processJob(array $job): string
    {
        $jobId = (int) $job['id'];
        $server = Server::getServerById((int) $job['server_id']);
        if (!$server) {
            ServerAutoStartQueue::markSkipped($jobId, 'Server no longer exists');

            return 'skipped';
        }

        if (!$this->isEligibleForAutoStart($server)) {
            ServerAutoStartQueue::markSkipped($jobId, 'Server no longer eligible for auto-start');

            return 'skipped';
        }

        $runtimeStatus = strtolower((string) ($server['status'] ?? ''));
        if (in_array($runtimeStatus, ['running', 'starting'], true)) {
            ServerAutoStartQueue::markSkipped($jobId, 'Server already running or starting');

            return 'skipped';
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            ServerAutoStartQueue::markFailed($jobId, 'Node not found');

            return 'failed';
        }

        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30,
                WingsUrlHelper::isBehindProxy($node)
            );

            $response = $wings->getServer()->startServer($server['uuid']);
            if (!$response->isSuccessful()) {
                $error = (string) $response->getError();
                ServerAutoStartQueue::markFailed($jobId, $error);
                App::getInstance(true)->getLogger()->warning(
                    "Auto-start failed for server {$server['uuid']}: {$error}"
                );

                return 'failed';
            }

            Server::updateServerById((int) $server['id'], ['manually_stopped' => 0]);

            ServerActivity::createActivity([
                'server_id' => (int) $server['id'],
                'node_id' => (int) $server['node_id'],
                'event' => 'server:power.autostart',
                'metadata' => json_encode([
                    'reason' => 'node_reconnect',
                    'queue_id' => $jobId,
                    'source' => 'panel',
                ]),
            ]);

            ServerAutoStartQueue::markCompleted($jobId);

            return 'started';
        } catch (\Exception $e) {
            ServerAutoStartQueue::markFailed($jobId, $e->getMessage());
            App::getInstance(true)->getLogger()->error(
                'Auto-start exception for server ' . $server['uuid'] . ': ' . $e->getMessage()
            );

            return 'failed';
        }
    }
}
