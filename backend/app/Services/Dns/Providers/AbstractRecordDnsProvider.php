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

namespace App\Services\Dns\Providers;

/**
 * Providers whose API works on single records (create one, delete one).
 *
 * A record set is changed by creating the missing records first and deleting the surplus ones afterwards, so a
 * name never goes without an answer in between.
 */
abstract class AbstractRecordDnsProvider extends AbstractApiDnsProvider
{
    abstract protected function createOne(string $zoneId, string $zoneName, string $type, string $fqdn, string $content, ?int $priority, int $ttl): void;

    abstract protected function deleteOne(string $zoneId, string $zoneName, string $recordId): void;

    protected function storeRrset(string $zoneId, string $zoneName, string $type, string $fqdn, array $desired, int $ttl, array $existing): void
    {
        $keep = [];
        foreach ($existing['records'] as $record) {
            $keep[$record['id'] ?? ''] = false;
        }

        foreach ($desired as $want) {
            $matched = false;
            foreach ($existing['records'] as $record) {
                $id = $record['id'] ?? '';
                if (
                    ($keep[$id] ?? false) === false
                    && $record['content'] === $want['content']
                    && ($want['priority'] === null || (int) $record['priority'] === (int) $want['priority'])
                ) {
                    $keep[$id] = true;
                    $matched = true;
                    break;
                }
            }
            if (!$matched) {
                $this->createOne($zoneId, $zoneName, $type, $fqdn, $want['content'], $want['priority'], $ttl);
            }
        }

        foreach ($existing['records'] as $record) {
            $id = $record['id'] ?? '';
            if ($id !== '' && ($keep[$id] ?? false) === false) {
                $this->deleteOne($zoneId, $zoneName, $id);
            }
        }
    }
}
