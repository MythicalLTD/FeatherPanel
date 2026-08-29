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

use App\App;

/**
 * WebSpace mailbox records (featherpanel_webspace_mailboxes).
 */
class WebSpaceMailbox
{
    private static string $table = 'featherpanel_webspace_mailboxes';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = ['webspace_id', 'mail_host_id', 'local_part', 'domain', 'password'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim((string) $data[$field]) === '')) {
                return false;
            }
        }

        $data['quota_mb'] = max(0, (int) ($data['quota_mb'] ?? 1024));
        $data['enabled'] = !empty($data['enabled']) ? 1 : 0;
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');
        $data['password'] = self::encryptPassword((string) $data['password']);
        $data['local_part'] = strtolower(trim((string) $data['local_part']));
        $data['domain'] = strtolower(trim((string) $data['domain']));

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . '
            (webspace_id, mail_host_id, local_part, domain, password, quota_mb, enabled, created_at, updated_at)
            VALUES (:webspace_id, :mail_host_id, :local_part, :domain, :password, :quota_mb, :enabled, :created_at, :updated_at)'
        );

        if (
            !$stmt->execute([
                'webspace_id' => (int) $data['webspace_id'],
                'mail_host_id' => (int) $data['mail_host_id'],
                'local_part' => (string) $data['local_part'],
                'domain' => (string) $data['domain'],
                'password' => (string) $data['password'],
                'quota_mb' => (int) $data['quota_mb'],
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

        return $row ? self::decryptSensitiveFields($row) : null;
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
        $sql = 'SELECT m.*, h.name as mail_host_name, h.hostname, h.imap_host, h.imap_port, h.imap_encryption,
                       h.smtp_host, h.smtp_port, h.smtp_encryption, h.pop_host, h.pop_port,
                       h.mx_host, h.spf_record, h.dkim_selector
                FROM ' . self::$table . ' m
                LEFT JOIN featherpanel_mail_hosts h ON m.mail_host_id = h.id
                WHERE m.webspace_id = :webspace_id
                ORDER BY m.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['webspace_id' => $webspaceId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(static fn (array $row): array => self::decryptSensitiveFields($row), $rows);
    }

    public static function countByWebSpaceId(int $webspaceId): int
    {
        if ($webspaceId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE webspace_id = :webspace_id');
        $stmt->execute(['webspace_id' => $webspaceId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || $data === []) {
            return false;
        }

        unset($data['id'], $data['created_at'], $data['webspace_id']);
        $data['updated_at'] = date('Y-m-d H:i:s');

        if (isset($data['password']) && is_string($data['password']) && $data['password'] !== '') {
            $data['password'] = self::encryptPassword($data['password']);
        }

        if (isset($data['enabled'])) {
            $data['enabled'] = !empty($data['enabled']) ? 1 : 0;
        }

        if (isset($data['quota_mb'])) {
            $data['quota_mb'] = max(0, (int) $data['quota_mb']);
        }

        if (isset($data['autorespond_enabled'])) {
            $data['autorespond_enabled'] = !empty($data['autorespond_enabled']) ? 1 : 0;
        }

        if (array_key_exists('autorespond_subject', $data) && $data['autorespond_subject'] !== null) {
            $data['autorespond_subject'] = trim((string) $data['autorespond_subject']);
            if ($data['autorespond_subject'] === '') {
                $data['autorespond_subject'] = null;
            }
        }

        if (array_key_exists('autorespond_body', $data) && $data['autorespond_body'] !== null) {
            $data['autorespond_body'] = (string) $data['autorespond_body'];
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $setClause = implode(', ', array_map(static fn ($f) => '`' . str_replace('`', '``', $f) . '` = :' . $f, $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $setClause . ' WHERE id = :id';
        $data['id'] = $id;
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($data);
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

    public static function emailAddress(array $row): string
    {
        return strtolower(trim((string) ($row['local_part'] ?? ''))) . '@' . strtolower(trim((string) ($row['domain'] ?? '')));
    }

    private static function encryptPassword(string $password): string
    {
        return App::getInstance(true)->encryptValue($password);
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function decryptSensitiveFields(array $row): array
    {
        try {
            if (isset($row['password']) && is_string($row['password']) && $row['password'] !== '') {
                $row['password'] = App::getInstance(true)->decryptValue($row['password']);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to decrypt webspace mailbox password: ' . $e->getMessage());
        }

        $row['email'] = self::emailAddress($row);

        return $row;
    }
}
