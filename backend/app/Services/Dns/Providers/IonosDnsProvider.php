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
 * IONOS DNS API (https://developer.hosting.ionos.com/docs/dns). The key is sent as "<public prefix>.<secret>".
 */
class IonosDnsProvider extends AbstractRecordDnsProvider
{
    private const BASE = 'https://api.hosting.ionos.com/dns/v1';

    /** @var array<string, string> disabled records seen by fetchRrset: "type|fqdn|content" => record id */
    private array $disabled = [];

    public static function id(): string
    {
        return 'ionos';
    }

    public static function label(): string
    {
        return 'IONOS';
    }

    public static function help(): string
    {
        return 'Create an API key in the IONOS Developer Portal (DNS) and paste it as "publicprefix.secret".';
    }

    protected function authHeaders(): array
    {
        return ['X-API-Key' => $this->token];
    }

    protected function fetchZones(): array
    {
        $res = $this->call('GET', self::BASE . '/zones');
        $zones = [];
        foreach (is_array($res['body']) ? $res['body'] : [] as $zone) {
            if (is_array($zone) && isset($zone['id'], $zone['name'])) {
                $zones[] = ['id' => (string) $zone['id'], 'name' => (string) $zone['name']];
            }
        }

        return $zones;
    }

    protected function fetchRrset(string $zoneId, string $zoneName, string $type, string $fqdn): array
    {
        $res = $this->call('GET', self::BASE . '/zones/' . rawurlencode($zoneId));
        $body = is_array($res['body']) ? $res['body'] : [];
        $records = [];
        $ttl = null;
        foreach (is_array($body['records'] ?? null) ? $body['records'] : [] as $row) {
            if (!is_array($row) || strtoupper((string) ($row['type'] ?? '')) !== $type || strtolower(rtrim((string) ($row['name'] ?? ''), '.')) !== $fqdn) {
                continue;
            }
            // A disabled record is not published: it neither counts as present nor as a conflict. createOne()
            // enables it again instead of adding a second record with the same value.
            if (!empty($row['disabled'])) {
                $this->disabled[$type . '|' . $fqdn . '|' . ($type === 'TXT' ? $this->unquoteTxt((string) ($row['content'] ?? '')) : strtolower(rtrim((string) ($row['content'] ?? ''), '.')))] = (string) ($row['id'] ?? '');
                continue;
            }
            $content = (string) ($row['content'] ?? '');
            $records[] = [
                'content' => $type === 'TXT' ? $this->unquoteTxt($content) : ($type === 'MX' ? strtolower(rtrim($content, '.')) : $content),
                'priority' => isset($row['prio']) ? (int) $row['prio'] : null,
                'id' => (string) ($row['id'] ?? ''),
            ];
            $ttl = isset($row['ttl']) ? (int) $row['ttl'] : $ttl;
        }

        return ['ttl' => $ttl, 'records' => $records];
    }

    protected function createOne(string $zoneId, string $zoneName, string $type, string $fqdn, string $content, ?int $priority, int $ttl): void
    {
        $disabledId = $this->disabled[$type . '|' . $fqdn . '|' . ($type === 'MX' ? strtolower(rtrim($content, '.')) : $content)] ?? '';
        if ($disabledId !== '') {
            $update = ['content' => $content, 'ttl' => max(60, $ttl), 'disabled' => false];
            if ($type === 'MX') {
                $update['prio'] = $priority ?? 10;
            }
            $this->call('PUT', self::BASE . '/zones/' . rawurlencode($zoneId) . '/records/' . rawurlencode($disabledId), $update);
            $this->disabled = array_filter($this->disabled, static fn (string $id): bool => $id !== $disabledId);

            return;
        }
        $record = ['name' => $fqdn, 'type' => $type, 'content' => $content, 'ttl' => max(60, $ttl), 'disabled' => false];
        if ($type === 'MX') {
            $record['prio'] = $priority ?? 10;
        }
        $this->call('POST', self::BASE . '/zones/' . rawurlencode($zoneId) . '/records', [$record]);
    }

    protected function deleteOne(string $zoneId, string $zoneName, string $recordId): void
    {
        $this->call('DELETE', self::BASE . '/zones/' . rawurlencode($zoneId) . '/records/' . rawurlencode($recordId));
    }
}
