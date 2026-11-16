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
 * Hetzner DNS in the Cloud API (https://docs.hetzner.cloud/reference/cloud#zones), project API token.
 *
 * The API works on record sets: names are relative to the zone (`@` for the apex), MX values look like
 * "10 mail.example.com." and TXT values are quoted.
 */
class HetznerDnsProvider extends AbstractApiDnsProvider
{
    private const BASE = 'https://api.hetzner.cloud/v1';

    public static function id(): string
    {
        return 'hetzner';
    }

    public static function label(): string
    {
        return 'Hetzner DNS';
    }

    public static function help(): string
    {
        return 'Create an API token with read and write rights in the Hetzner Console (project > Security > API Tokens). The zone has to be in that project.';
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    protected function fetchZones(): array
    {
        $zones = [];
        for ($page = 1; $page <= 20; ++$page) {
            $res = $this->call('GET', self::BASE . '/zones?per_page=100&page=' . $page);
            $body = is_array($res['body']) ? $res['body'] : [];
            foreach (is_array($body['zones'] ?? null) ? $body['zones'] : [] as $zone) {
                if (is_array($zone) && isset($zone['id'], $zone['name'])) {
                    $zones[] = ['id' => (string) $zone['id'], 'name' => (string) $zone['name']];
                }
            }
            if (empty($body['meta']['pagination']['next_page'])) {
                break;
            }
        }

        return $zones;
    }

    protected function fetchRrset(string $zoneId, string $zoneName, string $type, string $fqdn): array
    {
        $res = $this->call('GET', $this->rrsetUrl($zoneId, $zoneName, $type, $fqdn), null, [404]);
        if ($res['status'] === 404) {
            return ['ttl' => null, 'records' => []];
        }
        $set = is_array($res['body']) && is_array($res['body']['rrset'] ?? null) ? $res['body']['rrset'] : [];
        $records = [];
        foreach (is_array($set['records'] ?? null) ? $set['records'] : [] as $row) {
            $value = (string) (is_array($row) ? ($row['value'] ?? '') : '');
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
            $values[] = ['value' => match ($type) {
                'MX' => (int) ($record['priority'] ?? 10) . ' ' . rtrim($record['content'], '.') . '.',
                'TXT' => $this->quoteTxt($record['content']),
                default => $record['content'],
            }];
        }

        $url = $this->rrsetUrl($zoneId, $zoneName, $type, $fqdn);
        if ($values === []) {
            $this->call('DELETE', $url);

            return;
        }
        if ($existing['records'] === []) {
            $this->call('POST', self::BASE . '/zones/' . rawurlencode($zoneId) . '/rrsets', [
                'name' => $this->relative($fqdn, $zoneName),
                'type' => $type,
                'ttl' => $ttl,
                'records' => $values,
            ]);

            return;
        }
        $this->call('POST', $url . '/actions/set_records', ['records' => $values]);
    }

    private function rrsetUrl(string $zoneId, string $zoneName, string $type, string $fqdn): string
    {
        $name = str_replace('%40', '@', rawurlencode($this->relative($fqdn, $zoneName)));

        return self::BASE . '/zones/' . rawurlencode($zoneId) . '/rrsets/' . $name . '/' . rawurlencode($type);
    }
}
