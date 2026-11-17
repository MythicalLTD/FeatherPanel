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
 * deSEC (https://desec.readthedocs.io/), token authentication.
 *
 * Record sets again: subname "" is the apex in JSON bodies and "@" in URL paths, MX values look like
 * "10 mail.example.com." and TXT values are quoted. The zone has a minimum TTL that a set must respect.
 */
class DesecDnsProvider extends AbstractApiDnsProvider
{
    private const BASE = 'https://desec.io/api/v1';

    /** @var array<string, int> */
    private array $minimumTtl = [];

    public static function id(): string
    {
        return 'desec';
    }

    public static function label(): string
    {
        return 'deSEC';
    }

    public static function help(): string
    {
        return 'Create a token under "Token Management" in your deSEC account (the default token rights are enough).';
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Token ' . $this->token];
    }

    protected function fetchZones(): array
    {
        $res = $this->call('GET', self::BASE . '/domains/');
        $zones = [];
        foreach (is_array($res['body']) ? $res['body'] : [] as $domain) {
            if (is_array($domain) && isset($domain['name'])) {
                $name = strtolower((string) $domain['name']);
                $zones[] = ['id' => $name, 'name' => $name];
                $this->minimumTtl[$name] = max(60, (int) ($domain['minimum_ttl'] ?? 3600));
            }
        }

        return $zones;
    }

    protected function fetchRrset(string $zoneId, string $zoneName, string $type, string $fqdn): array
    {
        $sub = $this->relative($fqdn, $zoneName);
        $res = $this->call('GET', self::BASE . '/domains/' . rawurlencode($zoneName) . '/rrsets/' . str_replace('%40', '@', rawurlencode($sub)) . '/' . rawurlencode($type) . '/', null, [404]);
        if ($res['status'] === 404) {
            return ['ttl' => null, 'records' => []];
        }
        $set = is_array($res['body']) ? $res['body'] : [];
        $records = [];
        foreach (is_array($set['records'] ?? null) ? $set['records'] : [] as $value) {
            $value = (string) $value;
            $priority = null;
            if ($type === 'MX' && preg_match('/^\s*(\d+)\s+(\S+)\s*$/', $value, $m) === 1) {
                $priority = (int) $m[1];
                $value = strtolower(rtrim($m[2], '.'));
            } elseif ($type === 'TXT') {
                $value = $this->unquoteTxt($value);
            }
            $records[] = ['content' => $value, 'priority' => $priority, 'id' => null];
        }

        return ['ttl' => isset($set['ttl']) ? (int) $set['ttl'] : null, 'records' => $records];
    }

    protected function storeRrset(string $zoneId, string $zoneName, string $type, string $fqdn, array $desired, int $ttl, array $existing): void
    {
        $values = [];
        foreach ($desired as $record) {
            $values[] = match ($type) {
                'MX' => (int) ($record['priority'] ?? 10) . ' ' . rtrim($record['content'], '.') . '.',
                'TXT' => $this->quoteTxt($record['content']),
                default => $record['content'],
            };
        }
        $sub = $this->relative($fqdn, $zoneName);
        $this->zones();
        $this->call('PUT', self::BASE . '/domains/' . rawurlencode($zoneName) . '/rrsets/', [[
            'subname' => $sub === '@' ? '' : $sub,
            'type' => $type,
            'ttl' => max($ttl, $this->minimumTtl[$zoneName] ?? 3600),
            'records' => $values,
        ]]);
    }
}
