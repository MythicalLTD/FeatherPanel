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

/**
 * Sends queued deliveries. Each failed attempt is retried with backoff until
 * max_attempts (5 by default): after 1 min, 5 min, 30 min and 2 h.
 */
final class WebhookDeliveryProcessor
{
    /** Seconds to wait after attempt N fails (index N-1). */
    public const BACKOFF = [60, 300, 1800, 7200, 21600];

    public static function backoffFor(int $attempts): int
    {
        return self::BACKOFF[max(0, min(count(self::BACKOFF) - 1, $attempts - 1))];
    }

    /**
     * @return array{processed: int, delivered: int, retrying: int, failed: int}
     */
    public static function processDue(int $limit = 100, int $budgetSeconds = 45): array
    {
        $stats = ['processed' => 0, 'delivered' => 0, 'retrying' => 0, 'failed' => 0];
        $deadline = microtime(true) + $budgetSeconds;
        foreach (WebhookStore::due($limit) as $deliveryId) {
            if (microtime(true) > $deadline) {
                break;
            }
            $outcome = self::attempt($deliveryId);
            if ($outcome === null) {
                continue;
            }
            ++$stats['processed'];
            if ($outcome['status'] === WebhookStore::STATUS_DELIVERED) {
                ++$stats['delivered'];
            } elseif ($outcome['status'] === WebhookStore::STATUS_FAILED) {
                ++$stats['failed'];
            } else {
                ++$stats['retrying'];
            }
        }

        return $stats;
    }

    /**
     * Claim and send one delivery. Returns null when it is not sendable (gone or taken).
     * $ignoreDisabled lets an admin test or redeliver to a webhook that is switched off.
     *
     * @return array{status: string, attempts: int, result: array{ok: bool, status_code: int|null, response: string|null, error: string|null, duration_ms: int}}|null
     */
    public static function attempt(int $deliveryId, bool $ignoreDisabled = false): ?array
    {
        if (!WebhookStore::claim($deliveryId)) {
            return null;
        }
        $delivery = WebhookStore::findDelivery($deliveryId);
        if ($delivery === null) {
            return null;
        }
        $webhookId = (int) $delivery['webhook_id'];
        $webhook = WebhookStore::find($webhookId);
        $attempts = (int) $delivery['attempts'] + 1;
        $max = max(1, (int) $delivery['max_attempts']);

        if ($webhook === null || (!$ignoreDisabled && (int) $webhook['enabled'] !== 1)) {
            $result = ['ok' => false, 'status_code' => null, 'response' => null, 'error' => 'The webhook is disabled', 'duration_ms' => 0];
            WebhookStore::recordAttempt($deliveryId, $webhookId, $attempts - 1, WebhookStore::STATUS_FAILED, $result, null);

            return ['status' => WebhookStore::STATUS_FAILED, 'attempts' => $attempts - 1, 'result' => $result];
        }

        $payload = json_decode((string) $delivery['payload'], true);
        if (!is_array($payload)) {
            $result = ['ok' => false, 'status_code' => null, 'response' => null, 'error' => 'Stored payload is not valid JSON', 'duration_ms' => 0];
            WebhookStore::recordAttempt($deliveryId, $webhookId, $attempts, WebhookStore::STATUS_FAILED, $result, null);

            return ['status' => WebhookStore::STATUS_FAILED, 'attempts' => $attempts, 'result' => $result];
        }

        $webhook['secret_plain'] = WebhookStore::secretOf($webhook);
        $result = WebhookSender::send($webhook, $payload, (string) $delivery['event_id']);

        if ($result['ok']) {
            $status = WebhookStore::STATUS_DELIVERED;
            $retry = null;
        } elseif ($attempts >= $max) {
            $status = WebhookStore::STATUS_FAILED;
            $retry = null;
        } else {
            $status = WebhookStore::STATUS_PENDING;
            $retry = self::backoffFor($attempts);
        }
        WebhookStore::recordAttempt($deliveryId, $webhookId, $attempts, $status, $result, $retry);

        return ['status' => $status, 'attempts' => $attempts, 'result' => $result];
    }
}
