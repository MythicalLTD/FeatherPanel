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

namespace App\Services\Dns;

interface DnsProviderInterface
{
    /**
     * @return list<array{id: string, name: string, status?: string}>
     */
    public function listZones(): array;

    public function resolveZoneId(string $zoneName): ?string;

    /**
     * @return array{records: list<array<string, mixed>>, page: int, per_page: int, total_count: int}
     */
    public function listRecords(string $zoneId, ?string $type = null, ?string $name = null, int $page = 1, int $perPage = 100): array;

    /**
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    public function createRecord(string $zoneId, array $payload): array;

    /**
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    public function updateRecord(string $zoneId, string $recordId, array $payload): array;

    public function deleteRecord(string $zoneId, string $recordId): void;

    /**
     * @return array{ok: bool, action?: string, record?: array<string, mixed>, error?: string}
     */
    public function upsertARecord(string $zoneId, string $name, string $ip, int $ttl = 300, bool $proxied = false): array;
}
