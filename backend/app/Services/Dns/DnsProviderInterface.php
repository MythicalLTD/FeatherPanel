<?php

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
