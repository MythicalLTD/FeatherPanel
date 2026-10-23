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
use App\Chat\Database;
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Services\Server\ServerAutoStartService;
use App\Services\Notifications\InboxNotifier;

/**
 * Remembers whether a server was running when a transfer started and starts it
 * again on the new node once the transfer succeeds.
 *
 * Flow: the state is stored on the transfer row when the transfer begins. On the
 * success callback the row is claimed (power_restore_status = pending) and a start
 * is sent right away. If Wings is not ready yet (older Wings still reports the
 * server as transferring at that moment) the cron retries every minute. After
 * MAX_ATTEMPTS the restore is marked failed and the server's users are notified.
 * Every transfer row is handled on its own, so one failing server in a mass
 * transfer never blocks the others.
 */
class TransferPowerRestorer
{
    public const MAX_ATTEMPTS = 5;

    private const RUNNING_STATES = ['running', 'starting'];

    private static string $table = 'featherpanel_server_transfers';

    /**
     * Power state at transfer start: Wings first, the panel's last known status as fallback.
     */
    public static function captureState(array $server, array $sourceNode): string
    {
        try {
            $response = Wings::fromNode($sourceNode, 8)->getServer()->getServer((string) $server['uuid']);
            if ($response->isSuccessful()) {
                $data = $response->getData();
                $state = is_array($data) ? ($data['state'] ?? ($data['utilization']['state'] ?? null)) : null;
                if (is_string($state) && $state !== '') {
                    return strtolower($state);
                }
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('Transfer power state: Wings lookup failed for ' . $server['uuid'] . ': ' . $e->getMessage());
        }

        $status = strtolower((string) ($server['status'] ?? ''));

        return $status !== '' ? $status : 'offline';
    }

    public static function wasRunning(?string $state): bool
    {
        return in_array(strtolower((string) $state), self::RUNNING_STATES, true);
    }

    /**
     * Called from the transfer success callbacks. Safe to call more than once:
     * only the first call claims the row.
     */
    public static function onTransferSucceeded(int $transferId): void
    {
        if ($transferId <= 0) {
            return;
        }
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'UPDATE ' . self::$table . " SET power_restore_status = 'pending', power_restore_next_at = :now
                 WHERE id = :id AND power_restore_status IS NULL AND restore_power_state = 1 AND power_state_before IN ('running', 'starting')"
            );
            $stmt->execute(['id' => $transferId, 'now' => date('Y-m-d H:i:s')]);
            if ($stmt->rowCount() !== 1) {
                return;
            }
            self::attempt($transferId);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Transfer power restore failed to run for transfer ' . $transferId . ': ' . $e->getMessage());
        }
    }

    /**
     * Retry pending restores (cron, every minute).
     *
     * @return array{processed: int, started: int, failed: int}
     */
    public static function processPending(int $limit = 25): array
    {
        $stats = ['processed' => 0, 'started' => 0, 'failed' => 0];
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT id FROM ' . self::$table . " WHERE power_restore_status = 'pending' AND power_restore_next_at <= :now ORDER BY id ASC LIMIT " . max(1, $limit)
        );
        $stmt->execute(['now' => date('Y-m-d H:i:s')]);
        foreach ($stmt->fetchAll(\PDO::FETCH_COLUMN) as $id) {
            ++$stats['processed'];
            try {
                $result = self::attempt((int) $id);
                if ($result === 'started') {
                    ++$stats['started'];
                } elseif ($result === 'failed') {
                    ++$stats['failed'];
                }
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error('Transfer power restore retry failed for transfer ' . $id . ': ' . $e->getMessage());
            }
        }

        return $stats;
    }

    /** @return string started, retry, failed or skipped */
    private static function attempt(int $transferId): string
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . " WHERE id = :id AND power_restore_status = 'pending'");
        $stmt->execute(['id' => $transferId]);
        $transfer = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$transfer) {
            return 'skipped';
        }

        $server = Server::getServerById((int) $transfer['server_id']);
        if (!$server) {
            self::finish($transferId, 'skipped', 'Server no longer exists');

            return 'skipped';
        }
        if (!empty($server['suspended'])) {
            self::finish($transferId, 'skipped', 'Server is suspended');
            self::log($server, 'skipped', (int) $transfer['power_restore_attempts'], 'Server is suspended');

            return 'skipped';
        }

        $attempts = (int) $transfer['power_restore_attempts'] + 1;
        $error = null;
        try {
            $node = Node::getNodeById((int) $server['node_id']);
            if (!$node) {
                throw new \RuntimeException('Node not found');
            }
            $response = Wings::fromNode($node, 15)->getServer()->startServer((string) $server['uuid']);
            if (!$response->isSuccessful()) {
                $error = (string) ($response->getError() ?: 'Wings returned HTTP ' . $response->getStatusCode());
            }
        } catch (\Throwable $e) {
            $error = $e->getMessage();
        }

        if ($error === null) {
            ServerAutoStartService::markPowerIntent((int) $server['id'], 'start');
            self::finish($transferId, 'started', null, $attempts);
            self::log($server, 'started', $attempts, null);

            return 'started';
        }

        if ($attempts < self::MAX_ATTEMPTS) {
            $update = $pdo->prepare(
                'UPDATE ' . self::$table . ' SET power_restore_attempts = :attempts, power_restore_error = :error, power_restore_next_at = :next WHERE id = :id'
            );
            $update->execute([
                'attempts' => $attempts,
                'error' => mb_substr($error, 0, 1000),
                'next' => date('Y-m-d H:i:s', time() + 60),
                'id' => $transferId,
            ]);

            return 'retry';
        }

        self::finish($transferId, 'failed', $error, $attempts);
        self::log($server, 'failed', $attempts, $error);
        InboxNotifier::transferPowerRestoreFailed($server);
        App::getInstance(true)->getLogger()->warning('Could not start server ' . $server['uuid'] . ' after transfer: ' . $error);

        return 'failed';
    }

    private static function finish(int $transferId, string $status, ?string $error, ?int $attempts = null): void
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET power_restore_status = :status, power_restore_error = :error, power_restore_next_at = NULL'
            . ($attempts !== null ? ', power_restore_attempts = :attempts' : '') . ' WHERE id = :id'
        );
        $params = ['status' => $status, 'error' => $error !== null ? mb_substr($error, 0, 1000) : null, 'id' => $transferId];
        if ($attempts !== null) {
            $params['attempts'] = $attempts;
        }
        $stmt->execute($params);
    }

    private static function log(array $server, string $result, int $attempts, ?string $error): void
    {
        ServerActivity::createActivity([
            'server_id' => (int) $server['id'],
            'node_id' => (int) $server['node_id'],
            'event' => 'server:transfer.power-restore',
            'metadata' => json_encode([
                'result' => $result,
                'attempts' => $attempts,
                'error' => $error !== null ? mb_substr($error, 0, 300) : null,
                'source' => 'panel',
            ]),
        ]);
    }
}
