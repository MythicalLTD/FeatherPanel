<?php

namespace App\Services\Dns;

interface AcmeDnsCapableInterface
{
    /**
     * @return array{ok: bool, action?: string, record?: array<string, mixed>, error?: string}
     */
    public function createTxtRecord(string $zoneId, string $name, string $content, int $ttl = 120): array;

    /**
     * @return array{ok: bool, deleted: int, error?: string}
     */
    public function deleteTxtRecords(string $zoneId, string $name, ?string $content = null): array;
}
