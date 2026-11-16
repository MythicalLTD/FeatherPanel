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
 * DigitalOcean API v2 (https://docs.digitalocean.com/reference/api/), personal access token.
 */
class DigitalOceanDnsProvider extends AbstractRecordDnsProvider
{
    private const BASE = 'https://api.digitalocean.com/v2';

    public static function id(): string
    {
        return 'digitalocean';
    }

    public static function label(): string
    {
        return 'DigitalOcean';
    }

    public static function help(): string
    {
        return 'Create a personal access token (API > Tokens) with read and write scope.';
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    protected function fetchZones(): array
    {
        $zones = [];
        for ($page = 1; $page <= 20; ++$page) {
            $res = $this->call('GET', self::BASE . '/domains?per_page=200&page=' . $page);
            $body = is_array($res['body']) ? $res['body'] : [];
            foreach (is_array($body['domains'] ?? null) ? $body['domains'] : [] as $domain) {
                if (is_array($domain) && isset($domain['name'])) {
                    $zones[] = ['id' => (string) $domain['name'], 'name' => (string) $domain['name']];
                }
            }
            if (empty($body['links']['pages']['next'])) {
                break;
            }
        }

        return $zones;
    }

    protected function fetchRrset(string $zoneId, string $zoneName, string $type, string $fqdn): array
    {
        $res = $this->call('GET', self::BASE . '/domains/' . rawurlencode($zoneId) . '/records?per_page=200&type=' . rawurlencode($type) . '&name=' . rawurlencode($fqdn));
        $body = is_array($res['body']) ? $res['body'] : [];
        $records = [];
        $ttl = null;
        foreach (is_array($body['domain_records'] ?? null) ? $body['domain_records'] : [] as $row) {
            if (!is_array($row) || strtoupper((string) ($row['type'] ?? '')) !== $type) {
                continue;
            }
            // The name filter is a fully qualified name; double check, the API also accepts relative names.
            if ($this->fqdn((string) ($row['name'] ?? '@'), $zoneName) !== $fqdn) {
                continue;
            }
            $data = (string) ($row['data'] ?? '');
            $records[] = [
                'content' => $type === 'TXT' ? $this->unquoteTxt($data) : ($type === 'MX' ? strtolower(rtrim($data, '.')) : $data),
                'priority' => isset($row['priority']) ? (int) $row['priority'] : null,
                'id' => (string) ($row['id'] ?? ''),
            ];
            $ttl = isset($row['ttl']) ? (int) $row['ttl'] : $ttl;
        }

        return ['ttl' => $ttl, 'records' => $records];
    }

    protected function createOne(string $zoneId, string $zoneName, string $type, string $fqdn, string $content, ?int $priority, int $ttl): void
    {
        $payload = [
            'type' => $type,
            'name' => $this->relative($fqdn, $zoneName),
            'data' => $type === 'MX' ? rtrim($content, '.') . '.' : $content,
            'ttl' => max(30, $ttl),
        ];
        if ($type === 'MX') {
            $payload['priority'] = $priority ?? 10;
        }
        $this->call('POST', self::BASE . '/domains/' . rawurlencode($zoneId) . '/records', $payload);
    }

    protected function deleteOne(string $zoneId, string $zoneName, string $recordId): void
    {
        $this->call('DELETE', self::BASE . '/domains/' . rawurlencode($zoneId) . '/records/' . rawurlencode($recordId));
    }
}
