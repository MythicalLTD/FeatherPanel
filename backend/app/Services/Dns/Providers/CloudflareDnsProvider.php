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
 * Cloudflare API v4, token authentication (https://developers.cloudflare.com/api/).
 */
class CloudflareDnsProvider extends AbstractRecordDnsProvider
{
    private const BASE = 'https://api.cloudflare.com/client/v4';

    public static function id(): string
    {
        return 'cloudflare';
    }

    public static function label(): string
    {
        return 'Cloudflare';
    }

    public static function help(): string
    {
        return 'Create an API token (My Profile > API Tokens) with the permissions Zone > Zone > Read and Zone > DNS > Edit for this zone only.';
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    protected function fetchZones(): array
    {
        $zones = [];
        for ($page = 1; $page <= 20; ++$page) {
            $res = $this->call('GET', self::BASE . '/zones?per_page=50&page=' . $page);
            $body = is_array($res['body']) ? $res['body'] : [];
            foreach (is_array($body['result'] ?? null) ? $body['result'] : [] as $zone) {
                if (is_array($zone) && isset($zone['id'], $zone['name'])) {
                    $zones[] = ['id' => (string) $zone['id'], 'name' => (string) $zone['name']];
                }
            }
            $pages = (int) ($body['result_info']['total_pages'] ?? 1);
            if ($page >= $pages) {
                break;
            }
        }

        return $zones;
    }

    protected function fetchRrset(string $zoneId, string $zoneName, string $type, string $fqdn): array
    {
        $records = [];
        $ttl = null;
        for ($page = 1; $page <= 20; ++$page) {
            $res = $this->call('GET', self::BASE . '/zones/' . rawurlencode($zoneId) . '/dns_records?per_page=100&page=' . $page . '&type=' . rawurlencode($type) . '&name=' . rawurlencode($fqdn));
            $body = is_array($res['body']) ? $res['body'] : [];
            foreach (is_array($body['result'] ?? null) ? $body['result'] : [] as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $content = (string) ($row['content'] ?? '');
                $records[] = [
                    'content' => $type === 'TXT' ? $this->unquoteTxt($content) : ($type === 'MX' ? strtolower(rtrim($content, '.')) : $content),
                    'priority' => isset($row['priority']) ? (int) $row['priority'] : null,
                    'id' => (string) ($row['id'] ?? ''),
                ];
                $ttl = isset($row['ttl']) ? (int) $row['ttl'] : $ttl;
            }
            if ($page >= (int) ($body['result_info']['total_pages'] ?? 1)) {
                break;
            }
        }

        return ['ttl' => $ttl, 'records' => $records];
    }

    protected function createOne(string $zoneId, string $zoneName, string $type, string $fqdn, string $content, ?int $priority, int $ttl): void
    {
        $payload = ['type' => $type, 'name' => $fqdn, 'content' => $content, 'ttl' => $ttl];
        if ($type === 'MX') {
            $payload['priority'] = $priority ?? 10;
        }
        if ($type === 'A' || $type === 'AAAA') {
            $payload['proxied'] = false;
        }
        $res = $this->call('POST', self::BASE . '/zones/' . rawurlencode($zoneId) . '/dns_records', $payload);
        if (is_array($res['body']) && ($res['body']['success'] ?? true) === false) {
            throw new \RuntimeException('Cloudflare rejected the record: ' . $this->errorText($res['body']));
        }
    }

    protected function deleteOne(string $zoneId, string $zoneName, string $recordId): void
    {
        $this->call('DELETE', self::BASE . '/zones/' . rawurlencode($zoneId) . '/dns_records/' . rawurlencode($recordId));
    }
}
