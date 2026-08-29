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

/**
 * WebSpace mail forwarders / catch-all (source_local=* ).
 */
class WebSpaceMailForwarder
{
    private static string $table = 'featherpanel_webspace_mail_forwarders';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = ['webspace_id', 'mail_host_id', 'source_local', 'domain', 'destination'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim((string) $data[$field]) === '')) {
                return false;
            }
        }

        $data['source_local'] = strtolower(trim((string) $data['source_local']));
        $data['domain'] = strtolower(trim((string) $data['domain']));
        $data['destination'] = trim((string) $data['destination']);
        $data['enabled'] = !empty($data['enabled']) ? 1 : 0;
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . '
            (webspace_id, mail_host_id, source_local, domain, destination, enabled, created_at, updated_at)
            VALUES (:webspace_id, :mail_host_id, :source_local, :domain, :destination, :enabled, :created_at, :updated_at)'
        );

        if (
            !$stmt->execute([
                'webspace_id' => (int) $data['webspace_id'],
                'mail_host_id' => (int) $data['mail_host_id'],
                'source_local' => (string) $data['source_local'],
                'domain' => (string) $data['domain'],
                'destination' => (string) $data['destination'],
                'enabled' => (int) $data['enabled'],
                'created_at' => (string) $data['created_at'],
                'updated_at' => (string) $data['updated_at'],
            ])
        ) {
            return false;
        }

        return (int) $pdo->lastInsertId();
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

        return $row ?: null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listByWebSpaceId(int $webspaceId): array
    {
        if ($webspaceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT f.*, h.name as mail_host_name
             FROM ' . self::$table . ' f
             LEFT JOIN featherpanel_mail_hosts h ON f.mail_host_id = h.id
             WHERE f.webspace_id = :webspace_id
             ORDER BY f.created_at DESC'
        );
        $stmt->execute(['webspace_id' => $webspaceId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
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

    public static function sourceAddress(array $row): string
    {
        $local = strtolower(trim((string) ($row['source_local'] ?? '')));
        $domain = strtolower(trim((string) ($row['domain'] ?? '')));

        return $local . '@' . $domain;
    }
}
