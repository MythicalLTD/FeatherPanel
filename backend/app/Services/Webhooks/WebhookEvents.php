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
 * Events an admin webhook can subscribe to. The names are part of the public payload,
 * so they must never be renamed; add new ones instead.
 */
final class WebhookEvents
{
    public const TEST = 'webhook.test';

    /** @var array<string, string> event => group */
    public const EVENTS = [
        'server.created' => 'servers',
        'server.updated' => 'servers',
        'server.suspended' => 'servers',
        'server.unsuspended' => 'servers',
        'server.reinstalled' => 'servers',
        'server.deleted' => 'servers',
        'user.created' => 'users',
        'user.updated' => 'users',
        'user.deleted' => 'users',
        'backup.completed' => 'backups',
        'backup.failed' => 'backups',
        'vds.created' => 'vds',
        'vds.suspended' => 'vds',
        'vds.unsuspended' => 'vds',
        'vds.deleted' => 'vds',
        'webspace.created' => 'webspaces',
        'webspace.suspended' => 'webspaces',
        'webspace.unsuspended' => 'webspaces',
        'webspace.deleted' => 'webspaces',
    ];

    public static function isKnown(string $event): bool
    {
        return isset(self::EVENTS[$event]);
    }

    /**
     * Keep known events only, without duplicates, in catalogue order. "*" means every event.
     *
     * @return array<int, string>
     */
    public static function normalize(mixed $events): array
    {
        if (!is_array($events)) {
            return [];
        }
        $wanted = [];
        foreach ($events as $event) {
            if (is_string($event)) {
                $wanted[$event] = true;
            }
        }
        if (isset($wanted['*'])) {
            return ['*'];
        }

        return array_values(array_filter(array_keys(self::EVENTS), static fn (string $e): bool => isset($wanted[$e])));
    }

    /** @param array<int, string> $subscribed */
    public static function matches(array $subscribed, string $event): bool
    {
        return in_array('*', $subscribed, true) || in_array($event, $subscribed, true);
    }

    /** @return array<int, array{event: string, group: string}> */
    public static function catalogue(): array
    {
        $out = [];
        foreach (self::EVENTS as $event => $group) {
            $out[] = ['event' => $event, 'group' => $group];
        }

        return $out;
    }
}
