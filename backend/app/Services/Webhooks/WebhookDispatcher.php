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

/**
 * Queues an event for every enabled webhook subscribed to it. Delivery happens later in
 * the cron runner, so this only writes rows; any failure is logged and swallowed so the
 * request that caused the event is never slowed down or broken by webhooks.
 */
final class WebhookDispatcher
{
    /**
     * @param array<string, mixed>|callable(): array<string, mixed> $data event data, or a closure
     *                                                                    building it (only called when a webhook listens)
     *
     * @return int number of deliveries queued
     */
    public static function dispatch(string $event, array | callable $data): int
    {
        try {
            if (!WebhookEvents::isKnown($event)) {
                return 0;
            }
            $hooks = WebhookStore::enabledFor($event);
            if ($hooks === []) {
                return 0;
            }
            if (is_callable($data)) {
                $data = $data();
            }
            $payload = self::envelope($event, $data);
            $json = self::encode($payload);
            $queued = 0;
            foreach ($hooks as $hook) {
                WebhookStore::queue((int) $hook['id'], (string) $payload['id'], $event, $json);
                ++$queued;
            }

            return $queued;
        } catch (\Throwable $e) {
            try {
                App::getInstance(true)->getLogger()->warning('Webhook event ' . $event . ' could not be queued: ' . $e->getMessage());
            } catch (\Throwable) {
            }

            return 0;
        }
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array{id: string, event: string, timestamp: string, data: array<string, mixed>}
     */
    public static function envelope(string $event, array $data): array
    {
        return [
            'id' => self::uuid(),
            'event' => $event,
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'data' => $data,
        ];
    }

    /** @param array<string, mixed> $payload */
    public static function encode(array $payload): string
    {
        return (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public static function uuid(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0F) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }
}
