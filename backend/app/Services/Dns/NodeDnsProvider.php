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

/**
 * DNS provider backed by FeatherQuilld PowerDNS on a web node.
 */
class NodeDnsProvider implements DnsProviderInterface, AcmeDnsCapableInterface
{
    /** @param array<string, mixed> $webNode */
    public function __construct(private array $webNode)
    {
    }

    public function listZones(): array
    {
        $result = \App\Helpers\FeatherQuilldClient::listDnsZones($this->webNode);
        if (!$result['ok']) {
            throw new \RuntimeException($result['error'] ?? 'Failed to list DNS zones');
        }
        $body = is_array($result['body']) ? $result['body'] : [];
        $zones = is_array($body['zones'] ?? null) ? $body['zones'] : [];

        return array_values(array_map(static function ($z): array {
            if (!is_array($z)) {
                return ['id' => '', 'name' => ''];
            }

            return [
                'id' => (string) ($z['id'] ?? $z['name'] ?? ''),
                'name' => (string) ($z['name'] ?? $z['id'] ?? ''),
                'status' => (string) ($z['status'] ?? 'active'),
            ];
        }, $zones));
    }

    public function resolveZoneId(string $zoneName): ?string
    {
        $zoneName = strtolower(trim($zoneName));
        foreach ($this->listZones() as $zone) {
            if (strtolower(trim((string) ($zone['name'] ?? ''))) === $zoneName) {
                return (string) ($zone['id'] ?? $zoneName);
            }
        }

        $created = \App\Helpers\FeatherQuilldClient::createDnsZone(
            $this->webNode,
            $zoneName,
            \App\Helpers\DnsProvisioner::resolveNodeIps($this->webNode)[0] ?? null,
        );
        if (!$created['ok']) {
            return null;
        }
        $body = is_array($created['body']) ? $created['body'] : [];

        return (string) ($body['id'] ?? $body['name'] ?? $zoneName);
    }

    public function listRecords(string $zoneId, ?string $type = null, ?string $name = null, int $page = 1, int $perPage = 100): array
    {
        $result = \App\Helpers\FeatherQuilldClient::listDnsRecords($this->webNode, $zoneId, $type, $name, $page, $perPage);
        if (!$result['ok']) {
            throw new \RuntimeException($result['error'] ?? 'Failed to list DNS records');
        }

        return is_array($result['body']) ? $result['body'] : ['records' => [], 'page' => $page, 'per_page' => $perPage, 'total_count' => 0];
    }

    public function createRecord(string $zoneId, array $payload): array
    {
        $result = \App\Helpers\FeatherQuilldClient::createDnsRecord($this->webNode, $zoneId, $payload);
        if (!$result['ok']) {
            throw new \RuntimeException($result['error'] ?? 'Failed to create DNS record');
        }

        return is_array($result['body']) ? $result['body'] : [];
    }

    public function updateRecord(string $zoneId, string $recordId, array $payload): array
    {
        $result = \App\Helpers\FeatherQuilldClient::updateDnsRecord($this->webNode, $zoneId, $recordId, $payload);
        if (!$result['ok']) {
            throw new \RuntimeException($result['error'] ?? 'Failed to update DNS record');
        }

        return is_array($result['body']) ? $result['body'] : [];
    }

    public function deleteRecord(string $zoneId, string $recordId): void
    {
        $result = \App\Helpers\FeatherQuilldClient::deleteDnsRecord($this->webNode, $zoneId, $recordId);
        if (!$result['ok']) {
            throw new \RuntimeException($result['error'] ?? 'Failed to delete DNS record');
        }
    }

    public function upsertARecord(string $zoneId, string $name, string $ip, int $ttl = 300, bool $proxied = false): array
    {
        $payload = [
            'type' => 'A',
            'name' => $name,
            'content' => $ip,
            'ttl' => max(60, $ttl),
        ];
        try {
            $existing = $this->listRecords($zoneId, 'A', $name, 1, 10);
            $records = is_array($existing['records'] ?? null) ? $existing['records'] : [];
            if ($records !== []) {
                $first = $records[0];
                if (is_array($first) && (string) ($first['content'] ?? '') === $ip) {
                    return ['ok' => true, 'action' => 'unchanged', 'record' => $first];
                }
                $updated = $this->updateRecord($zoneId, (string) ($first['id'] ?? ''), array_merge($payload, ['proxied' => false]));

                return ['ok' => true, 'action' => 'updated', 'record' => $updated];
            }

            $created = $this->createRecord($zoneId, $payload);

            return ['ok' => true, 'action' => 'created', 'record' => $created];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    public function createTxtRecord(string $zoneId, string $name, string $content, int $ttl = 120): array
    {
        $result = \App\Helpers\FeatherQuilldClient::upsertDnsTxt($this->webNode, $zoneId, $name, $content, $ttl);
        if (!$result['ok']) {
            return ['ok' => false, 'error' => $result['error'] ?? 'Failed to create TXT record'];
        }
        $body = is_array($result['body']) ? $result['body'] : [];

        return ['ok' => !empty($body['ok']), 'action' => $body['action'] ?? 'created', 'error' => $body['error'] ?? null];
    }

    public function upsertMxRecord(string $zoneId, string $name, string $target, int $priority = 10, int $ttl = 300): array
    {
        $target = rtrim(trim($target), '.') . '.';
        $payload = [
            'type' => 'MX',
            'name' => $name,
            'content' => $target,
            'priority' => $priority,
            'ttl' => max(60, $ttl),
        ];

        try {
            $existing = $this->listRecords($zoneId, 'MX', $name, 1, 10);
            $records = is_array($existing['records'] ?? null) ? $existing['records'] : [];
            if ($records !== []) {
                $first = $records[0];
                if (
                    is_array($first)
                    && (int) ($first['priority'] ?? 0) === $priority
                    && rtrim((string) ($first['content'] ?? ''), '.') . '.' === $target
                ) {
                    return ['ok' => true, 'action' => 'unchanged', 'record' => $first];
                }

                $updated = $this->updateRecord($zoneId, (string) ($first['id'] ?? ''), $payload);

                return ['ok' => true, 'action' => 'updated', 'record' => $updated];
            }

            $created = $this->createRecord($zoneId, $payload);

            return ['ok' => true, 'action' => 'created', 'record' => $created];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    public function deleteTxtRecords(string $zoneId, string $name, ?string $content = null): array
    {
        $result = \App\Helpers\FeatherQuilldClient::deleteDnsTxt($this->webNode, $zoneId, $name, $content);
        if (!$result['ok']) {
            return ['ok' => false, 'deleted' => 0, 'error' => $result['error'] ?? 'Failed to delete TXT records'];
        }
        $body = is_array($result['body']) ? $result['body'] : [];

        return [
            'ok' => !empty($body['ok']),
            'deleted' => (int) ($body['deleted'] ?? 0),
            'error' => $body['error'] ?? null,
        ];
    }
}
