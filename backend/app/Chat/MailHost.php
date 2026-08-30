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
 * External mail hosts used for WebSpace mailboxes (featherpanel_mail_hosts).
 */
class MailHost
{
    private static string $table = 'featherpanel_mail_hosts';

    /** @var list<string> */
    private static array $allowedFields = [
        'name',
        'web_node_id',
        'hostname',
        'imap_host',
        'imap_port',
        'imap_encryption',
        'smtp_host',
        'smtp_port',
        'smtp_encryption',
        'pop_host',
        'pop_port',
        'provision_mode',
        'provision_url',
        'provision_api_key',
        'mx_host',
        'spf_record',
        'dkim_selector',
        'dkim_record',
    ];

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = ['name', 'hostname', 'imap_host', 'smtp_host'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                return false;
            }
        }

        $data = self::normalize($data);
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

        if (!empty($data['provision_api_key'])) {
            $data['provision_api_key'] = App::getInstance(true)->encryptValue((string) $data['provision_api_key']);
        }

        $filtered = array_intersect_key($data, array_flip(array_merge(self::$allowedFields, ['created_at', 'updated_at'])));
        $pdo = Database::getPdoConnection();
        $fields = array_keys($filtered);
        $placeholders = array_map(static fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if (!$stmt->execute($filtered)) {
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
    public static function listAll(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' ORDER BY name ASC');
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(static fn (array $row): array => self::decryptSensitiveFields($row), $rows);
    }

    /**
     * Hosts available for a web node (unscoped + matching web_node_id).
     *
     * @return list<array<string, mixed>>
     */
    public static function listForWebNode(int $webNodeId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . '
             WHERE web_node_id IS NULL OR web_node_id = 0 OR web_node_id = :web_node_id
             ORDER BY name ASC'
        );
        $stmt->execute(['web_node_id' => $webNodeId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(static fn (array $row): array => self::decryptSensitiveFields($row), $rows);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || $data === []) {
            return false;
        }

        unset($data['id'], $data['created_at']);
        $data = self::normalize($data);
        $data['updated_at'] = date('Y-m-d H:i:s');

        if (array_key_exists('provision_api_key', $data)) {
            $key = trim((string) ($data['provision_api_key'] ?? ''));
            if ($key === '') {
                unset($data['provision_api_key']);
            } else {
                $data['provision_api_key'] = App::getInstance(true)->encryptValue($key);
            }
        }

        $filtered = array_intersect_key($data, array_flip(array_merge(self::$allowedFields, ['updated_at'])));
        if ($filtered === []) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filtered);
        $setClause = implode(', ', array_map(static fn ($f) => '`' . str_replace('`', '``', $f) . '` = :' . $f, $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $setClause . ' WHERE id = :id';
        $filtered['id'] = $id;
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($filtered);
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

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    private static function normalize(array $data): array
    {
        if (isset($data['web_node_id'])) {
            $webNodeId = (int) $data['web_node_id'];
            $data['web_node_id'] = $webNodeId > 0 ? $webNodeId : null;
        }

        $data['imap_port'] = max(1, (int) ($data['imap_port'] ?? 993));
        $data['smtp_port'] = max(1, (int) ($data['smtp_port'] ?? 587));
        $data['pop_port'] = max(1, (int) ($data['pop_port'] ?? 995));

        $mode = strtolower(trim((string) ($data['provision_mode'] ?? 'inventory')));
        $data['provision_mode'] = in_array($mode, ['inventory', 'webhook', 'node'], true) ? $mode : 'inventory';

        foreach (['imap_encryption', 'smtp_encryption'] as $encField) {
            if (isset($data[$encField])) {
                $enc = strtolower(trim((string) $data[$encField]));
                $data[$encField] = in_array($enc, ['ssl', 'tls', 'starttls', 'none'], true) ? $enc : 'ssl';
            }
        }

        return $data;
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function decryptSensitiveFields(array $row): array
    {
        try {
            if (isset($row['provision_api_key']) && is_string($row['provision_api_key']) && $row['provision_api_key'] !== '') {
                $row['provision_api_key'] = App::getInstance(true)->decryptValue($row['provision_api_key']);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to decrypt mail host API key: ' . $e->getMessage());
        }

        return $row;
    }

    /**
     * Whether this web node has a built-in (node-mode) mail host.
     */
    public static function webNodeHasNodeMailHost(int $webNodeId): bool
    {
        if ($webNodeId <= 0) {
            return false;
        }

        foreach (self::listForWebNode($webNodeId) as $host) {
            if ((int) ($host['web_node_id'] ?? 0) === $webNodeId
                && strtolower(trim((string) ($host['provision_mode'] ?? ''))) === 'node') {
                return true;
            }
        }

        return false;
    }

    /**
     * Create a node-mode mail host for a web node after mailserver package install.
     *
     * @param array<string, mixed> $webNode
     */
    public static function ensureNodeMailHost(int $webNodeId, array $webNode): ?int
    {
        if ($webNodeId <= 0) {
            return null;
        }

        foreach (self::listForWebNode($webNodeId) as $host) {
            if ((int) ($host['web_node_id'] ?? 0) === $webNodeId
                && strtolower(trim((string) ($host['provision_mode'] ?? ''))) === 'node') {
                return (int) $host['id'];
            }
        }

        $fqdn = trim((string) ($webNode['fqdn'] ?? ''));
        if ($fqdn === '') {
            return null;
        }

        $name = trim((string) ($webNode['name'] ?? $fqdn));
        if ($name === '') {
            $name = $fqdn;
        }

        $id = self::create([
            'name' => $name . ' mail',
            'web_node_id' => $webNodeId,
            'hostname' => $fqdn,
            'imap_host' => $fqdn,
            'imap_port' => 993,
            'imap_encryption' => 'ssl',
            'smtp_host' => $fqdn,
            'smtp_port' => 587,
            'smtp_encryption' => 'starttls',
            'provision_mode' => 'node',
            'mx_host' => $fqdn,
        ]);

        return $id === false ? null : $id;
    }
}
