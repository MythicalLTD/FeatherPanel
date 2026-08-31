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

class WebSpaceMailingList
{
    private static string $table = 'featherpanel_webspace_mailing_lists';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = ['webspace_id', 'mail_host_id', 'list_local', 'domain', 'member'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim((string) $data[$field]) === '')) {
                return false;
            }
        }

        $data['list_local'] = strtolower(trim((string) $data['list_local']));
        $data['domain'] = strtolower(trim((string) $data['domain']));
        $data['member'] = strtolower(trim((string) $data['member']));
        $data['enabled'] = !empty($data['enabled']) ? 1 : 0;
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . '
            (webspace_id, mail_host_id, list_local, domain, member, enabled, created_at, updated_at)
            VALUES (:webspace_id, :mail_host_id, :list_local, :domain, :member, :enabled, :created_at, :updated_at)'
        );

        if (
            !$stmt->execute([
                'webspace_id' => (int) $data['webspace_id'],
                'mail_host_id' => (int) $data['mail_host_id'],
                'list_local' => (string) $data['list_local'],
                'domain' => (string) $data['domain'],
                'member' => (string) $data['member'],
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
            'SELECT * FROM ' . self::$table . ' WHERE webspace_id = :webspace_id ORDER BY list_local, domain, member'
        );
        $stmt->execute(['webspace_id' => $webspaceId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return is_array($rows) ? $rows : [];
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

    public static function deleteListMembers(int $webspaceId, string $listLocal, string $domain): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'DELETE FROM ' . self::$table . '
            WHERE webspace_id = :webspace_id AND list_local = :list_local AND domain = :domain'
        );

        return $stmt->execute([
            'webspace_id' => $webspaceId,
            'list_local' => strtolower(trim($listLocal)),
            'domain' => strtolower(trim($domain)),
        ]);
    }

    public static function listAddress(array $row): string
    {
        return strtolower(trim((string) ($row['list_local'] ?? ''))) . '@' . strtolower(trim((string) ($row['domain'] ?? '')));
    }
}
