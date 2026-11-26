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

namespace App\Services\Webhooks;

use App\App;
use App\Chat\Database;

/**
 * Storage for admin webhooks and their delivery log. Secrets are stored encrypted.
 */
final class WebhookStore
{
    public const TABLE = 'featherpanel_webhooks';
    public const DELIVERIES = 'featherpanel_webhook_deliveries';

    public const STATUS_PENDING = 'pending';
    public const STATUS_SENDING = 'sending';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_FAILED = 'failed';

    /** @var array<int, array<string, mixed>>|null enabled webhooks, cached per process */
    private static ?array $enabledCache = null;

    public static function flushCache(): void
    {
        self::$enabledCache = null;
    }

    /** @return array<int, array<string, mixed>> */
    public static function all(): array
    {
        return Database::getPdoConnection()->query('SELECT * FROM ' . self::TABLE . ' ORDER BY id ASC')->fetchAll(\PDO::FETCH_ASSOC);
    }

    /** @return array<string, mixed>|null */
    public static function find(int $id): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::TABLE . ' WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    /**
     * @param array{url: string, secret: string, events: array<int, string>, format: string, enabled: bool, description: ?string, created_by_uuid?: ?string} $data
     */
    public static function create(array $data): int
    {
        $stmt = Database::getPdoConnection()->prepare(
            'INSERT INTO ' . self::TABLE . ' (url, secret, events, format, enabled, description, created_by_uuid)
             VALUES (:url, :secret, :events, :format, :enabled, :description, :created_by)'
        );
        $stmt->execute([
            'url' => $data['url'],
            'secret' => App::getInstance(true)->encryptValue($data['secret']),
            'events' => json_encode(array_values($data['events'])),
            'format' => $data['format'],
            'enabled' => $data['enabled'] ? 1 : 0,
            'description' => $data['description'],
            'created_by' => $data['created_by_uuid'] ?? null,
        ]);
        self::flushCache();

        return (int) Database::getPdoConnection()->lastInsertId();
    }

    /** @param array<string, mixed> $fields url, secret (plain), events (list), format, enabled, description */
    public static function update(int $id, array $fields): bool
    {
        $set = [];
        $params = ['id' => $id];
        foreach ($fields as $key => $value) {
            switch ($key) {
                case 'secret':
                    $value = App::getInstance(true)->encryptValue((string) $value);
                    break;
                case 'events':
                    $value = json_encode(array_values((array) $value));
                    break;
                case 'enabled':
                    $value = $value ? 1 : 0;
                    break;
                case 'url':
                case 'format':
                case 'description':
                    break;
                default:
                    continue 2;
            }
            $set[] = '`' . $key . '` = :' . $key;
            $params[$key] = $value;
        }
        if ($set === []) {
            return true;
        }
        $stmt = Database::getPdoConnection()->prepare('UPDATE ' . self::TABLE . ' SET ' . implode(', ', $set) . ' WHERE id = :id');
        $ok = $stmt->execute($params);
        self::flushCache();

        return $ok;
    }

    public static function delete(int $id): bool
    {
        $stmt = Database::getPdoConnection()->prepare('DELETE FROM ' . self::TABLE . ' WHERE id = :id');
        $stmt->execute(['id' => $id]);
        self::flushCache();

        return $stmt->rowCount() > 0;
    }

    /** @param array<string, mixed> $row */
    public static function secretOf(array $row): string
    {
        $stored = (string) ($row['secret'] ?? '');
        if ($stored === '') {
            return '';
        }
        try {
            return App::getInstance(true)->decryptValue($stored);
        } catch (\Throwable) {
            return '';
        }
    }

    /** @param array<string, mixed> $row */
    public static function eventsOf(array $row): array
    {
        $events = json_decode((string) ($row['events'] ?? '[]'), true);

        return is_array($events) ? array_values(array_filter($events, 'is_string')) : [];
    }

    /** @return array<int, array<string, mixed>> enabled webhooks subscribed to the event */
    public static function enabledFor(string $event): array
    {
        if (self::$enabledCache === null) {
            self::$enabledCache = Database::getPdoConnection()
                ->query('SELECT id, events FROM ' . self::TABLE . ' WHERE enabled = 1')
                ->fetchAll(\PDO::FETCH_ASSOC);
        }

        return array_values(array_filter(self::$enabledCache, static fn (array $row): bool => WebhookEvents::matches(self::eventsOf($row), $event)));
    }

    public static function queue(int $webhookId, string $eventId, string $event, string $payloadJson, int $maxAttempts = 5, ?int $redeliveryOf = null): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::DELIVERIES . ' (webhook_id, event_id, event, payload, status, attempts, max_attempts, next_retry_at, redelivery_of)
             VALUES (:webhook_id, :event_id, :event, :payload, :status, 0, :max_attempts, NOW(), :redelivery_of)'
        );
        $stmt->execute([
            'webhook_id' => $webhookId,
            'event_id' => $eventId,
            'event' => $event,
            'payload' => $payloadJson,
            'status' => self::STATUS_PENDING,
            'max_attempts' => max(1, $maxAttempts),
            'redelivery_of' => $redeliveryOf,
        ]);

        return (int) $pdo->lastInsertId();
    }

    /**
     * Ids of deliveries that are due now (and ones stuck in "sending" after a crash).
     *
     * @return array<int, int>
     */
    public static function due(int $limit): array
    {
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT id FROM ' . self::DELIVERIES . "
             WHERE (status = 'pending' AND next_retry_at <= NOW())
                OR (status = 'sending' AND last_attempt_at < (NOW() - INTERVAL 10 MINUTE))
             ORDER BY next_retry_at ASC, id ASC LIMIT " . max(1, min(500, $limit))
        );
        $stmt->execute();

        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    /** Take a delivery for sending. Returns false when another worker already has it. */
    public static function claim(int $deliveryId): bool
    {
        $stmt = Database::getPdoConnection()->prepare(
            'UPDATE ' . self::DELIVERIES . " SET status = 'sending', last_attempt_at = NOW()
             WHERE id = :id AND (status = 'pending' OR (status = 'sending' AND last_attempt_at < (NOW() - INTERVAL 10 MINUTE)))"
        );
        $stmt->execute(['id' => $deliveryId]);

        return $stmt->rowCount() === 1;
    }

    /** @return array<string, mixed>|null */
    public static function findDelivery(int $id): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::DELIVERIES . ' WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    /**
     * Store the outcome of one attempt.
     *
     * @param array{ok: bool, status_code: int|null, response: string|null, error: string|null, duration_ms: int} $result
     */
    public static function recordAttempt(int $deliveryId, int $webhookId, int $attempts, string $status, array $result, ?int $retryInSeconds): void
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::DELIVERIES . ' SET status = :status, attempts = :attempts, status_code = :code,
                response_snippet = :response, error = :error, duration_ms = :duration, last_attempt_at = NOW(),
                next_retry_at = ' . ($retryInSeconds !== null ? '(NOW() + INTERVAL ' . (int) $retryInSeconds . ' SECOND)' : 'NULL') . ',
                delivered_at = ' . ($status === self::STATUS_DELIVERED ? 'NOW()' : 'delivered_at') . '
             WHERE id = :id'
        );
        $stmt->execute([
            'status' => $status,
            'attempts' => $attempts,
            'code' => $result['status_code'],
            'response' => $result['response'],
            'error' => $result['error'],
            'duration' => $result['duration_ms'],
            'id' => $deliveryId,
        ]);
        $hook = $pdo->prepare('UPDATE ' . self::TABLE . ' SET last_delivery_at = NOW(), last_delivery_status = :status, updated_at = updated_at WHERE id = :id');
        $hook->execute(['status' => $result['ok'] ? self::STATUS_DELIVERED : self::STATUS_FAILED, 'id' => $webhookId]);
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public static function deliveries(int $webhookId, int $page, int $limit, ?string $status = null, ?string $event = null): array
    {
        $where = ['webhook_id = :webhook_id'];
        $params = ['webhook_id' => $webhookId];
        if ($status !== null) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        if ($event !== null) {
            $where[] = 'event = :event';
            $params['event'] = $event;
        }
        $sql = ' WHERE ' . implode(' AND ', $where);
        $pdo = Database::getPdoConnection();
        $count = $pdo->prepare('SELECT COUNT(*) FROM ' . self::DELIVERIES . $sql);
        $count->execute($params);
        $stmt = $pdo->prepare(
            'SELECT id, webhook_id, event_id, event, status, attempts, max_attempts, status_code, error, duration_ms,
                    next_retry_at, last_attempt_at, delivered_at, redelivery_of, created_at
             FROM ' . self::DELIVERIES . $sql . ' ORDER BY id DESC LIMIT ' . $limit . ' OFFSET ' . (($page - 1) * $limit)
        );
        $stmt->execute($params);

        return ['items' => $stmt->fetchAll(\PDO::FETCH_ASSOC), 'total' => (int) $count->fetchColumn()];
    }

    /** @return array<string, int> delivery counts by status over the last 24 hours */
    public static function stats(int $webhookId): array
    {
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT status, COUNT(*) AS c FROM ' . self::DELIVERIES . ' WHERE webhook_id = :id AND created_at >= (NOW() - INTERVAL 1 DAY) GROUP BY status'
        );
        $stmt->execute(['id' => $webhookId]);
        $out = [self::STATUS_PENDING => 0, self::STATUS_DELIVERED => 0, self::STATUS_FAILED => 0];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $key = $row['status'] === self::STATUS_SENDING ? self::STATUS_PENDING : (string) $row['status'];
            $out[$key] = ($out[$key] ?? 0) + (int) $row['c'];
        }

        return $out;
    }

    /** Drop finished deliveries older than the given number of days. */
    public static function prune(int $days): int
    {
        $stmt = Database::getPdoConnection()->prepare(
            'DELETE FROM ' . self::DELIVERIES . " WHERE status IN ('delivered', 'failed') AND created_at < (NOW() - INTERVAL " . max(1, $days) . ' DAY)'
        );
        $stmt->execute();

        return $stmt->rowCount();
    }
}
