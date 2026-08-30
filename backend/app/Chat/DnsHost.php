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
use App\Services\Dns\NodeDnsProvider;
use App\Services\Dns\DnsProviderInterface;

class DnsHost
{
    private static string $table = 'featherpanel_dns_hosts';

    /** @var list<string> */
    private static array $allowedFields = [
        'name',
        'provider',
        'web_node_id',
    ];

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        if (!isset($data['name']) || trim((string) $data['name']) === '') {
            return false;
        }

        $data = self::normalize($data);
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');
        $data['credentials'] = self::encodeEmptyCredentials();

        $filtered = array_intersect_key($data, array_flip(array_merge(self::$allowedFields, ['created_at', 'updated_at', 'credentials'])));
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

        return $row ? self::hydrateRow($row) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listAll(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' ORDER BY name ASC');
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map(static fn (array $row): array => self::hydrateRow($row), $rows);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || $data === []) {
            return false;
        }

        unset($data['id'], $data['created_at'], $data['credentials'], $data['account_id']);
        $data = self::normalize($data);
        $data['updated_at'] = date('Y-m-d H:i:s');

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

    public static function createProvider(array $host): ?DnsProviderInterface
    {
        $webNodeId = (int) ($host['web_node_id'] ?? 0);
        if ($webNodeId <= 0) {
            return null;
        }

        $webNode = WebNode::getWebNodeById($webNodeId);
        if (!$webNode) {
            return null;
        }

        return new NodeDnsProvider($webNode);
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    public static function sanitizeForApi(array $row): array
    {
        unset($row['credentials']);

        return $row;
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    private static function normalize(array $data): array
    {
        $data['provider'] = 'node';

        if (array_key_exists('web_node_id', $data)) {
            $webNodeId = (int) $data['web_node_id'];
            $data['web_node_id'] = $webNodeId > 0 ? $webNodeId : null;
        }

        return $data;
    }

    private static function encodeEmptyCredentials(): string
    {
        return App::getInstance(true)->encryptValue('{}');
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function hydrateRow(array $row): array
    {
        $row['provider'] = 'node';
        unset($row['credentials'], $row['account_id']);

        return $row;
    }
}
