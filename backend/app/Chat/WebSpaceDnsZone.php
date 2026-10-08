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

namespace App\Chat;

class WebSpaceDnsZone
{
    private static string $table = 'featherpanel_webspace_dns_zones';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $webspaceId = (int) ($data['webspace_id'] ?? 0);
        $dnsHostId = (int) ($data['dns_host_id'] ?? 0);
        $zoneName = strtolower(trim((string) ($data['zone_name'] ?? '')));
        $providerZoneId = trim((string) ($data['provider_zone_id'] ?? ''));
        if ($webspaceId <= 0 || $dnsHostId <= 0 || $zoneName === '' || $providerZoneId === '') {
            return false;
        }

        $isPrimary = !empty($data['is_primary']) ? 1 : 0;
        $pdo = Database::getPdoConnection();

        if ($isPrimary === 1) {
            $clear = $pdo->prepare('UPDATE ' . self::$table . ' SET is_primary = 0 WHERE webspace_id = :webspace_id');
            $clear->execute(['webspace_id' => $webspaceId]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (webspace_id, dns_host_id, zone_name, provider_zone_id, is_primary, created_at, updated_at)
             VALUES (:webspace_id, :dns_host_id, :zone_name, :provider_zone_id, :is_primary, :created_at, :updated_at)'
        );
        $now = date('Y-m-d H:i:s');
        $ok = $stmt->execute([
            'webspace_id' => $webspaceId,
            'dns_host_id' => $dnsHostId,
            'zone_name' => $zoneName,
            'provider_zone_id' => $providerZoneId,
            'is_primary' => $isPrimary,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $ok ? (int) $pdo->lastInsertId() : false;
    }

    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::hydrate($row) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listByWebspaceId(int $webspaceId): array
    {
        if ($webspaceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE webspace_id = :webspace_id ORDER BY is_primary DESC, zone_name ASC');
        $stmt->execute(['webspace_id' => $webspaceId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map(static fn (array $row): array => self::hydrate($row), $rows);
    }

    public static function getPrimaryForWebspace(int $webspaceId): ?array
    {
        if ($webspaceId <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE webspace_id = :webspace_id ORDER BY is_primary DESC, id ASC LIMIT 1'
        );
        $stmt->execute(['webspace_id' => $webspaceId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::hydrate($row) : null;
    }

    public static function findOwnerWebspaceId(string $zoneName, ?int $excludeWebspaceId = null): ?int
    {
        $zoneName = strtolower(trim($zoneName));
        if ($zoneName === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT webspace_id FROM ' . self::$table . ' WHERE zone_name = :zone_name';
        $params = ['zone_name' => $zoneName];
        if ($excludeWebspaceId !== null && $excludeWebspaceId > 0) {
            $sql .= ' AND webspace_id != :exclude';
            $params['exclude'] = $excludeWebspaceId;
        }
        $sql .= ' LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? (int) ($row['webspace_id'] ?? 0) : null;
    }

    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    public static function belongsToWebspace(int $zoneId, int $webspaceId): bool
    {
        $zone = self::getById($zoneId);

        return $zone !== null && (int) ($zone['webspace_id'] ?? 0) === $webspaceId;
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function hydrate(array $row): array
    {
        $row['id'] = (int) ($row['id'] ?? 0);
        $row['webspace_id'] = (int) ($row['webspace_id'] ?? 0);
        $row['dns_host_id'] = (int) ($row['dns_host_id'] ?? 0);
        $row['zone_name'] = strtolower(trim((string) ($row['zone_name'] ?? '')));
        $row['provider_zone_id'] = (string) ($row['provider_zone_id'] ?? '');
        $row['is_primary'] = !empty($row['is_primary']);

        return $row;
    }
}
