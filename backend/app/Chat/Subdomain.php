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
 * Subdomain model for CRUD operations on the featherpanel_subdomain_manager_subdomains table.
 */
class Subdomain
{
    private static string $table = 'featherpanel_subdomain_manager_subdomains';

    /**
     * Fetch all subdomains for a server.
     */
    public static function getByServerId(int $serverId, int $limit = 999): array
    {
        if ($serverId <= 0) {
            return [];
        }

        // Validate and sanitize limit
        $limit = max(1, (int) $limit);

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC LIMIT ' . $limit);
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Fetch subdomains by domain.
     */
    public static function getByDomainId(int $domainId): array
    {
        if ($domainId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE domain_id = :domain_id ORDER BY created_at DESC');
        $stmt->execute(['domain_id' => $domainId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Find subdomain by UUID.
     */
    public static function getByUuid(string $uuid): ?array
    {
        if (!self::isValidUuid($uuid)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public static function existsByServerId(int $serverId): bool
    {
        if ($serverId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE server_id = :server_id LIMIT 1');
        $stmt->execute(['server_id' => $serverId]);

        return (int) $stmt->fetchColumn() > 0;
    }

    /**
     * Find subdomain by UUID within a server scope.
     */
    public static function getByUuidAndServer(string $uuid, int $serverId): ?array
    {
        if (!self::isValidUuid($uuid) || $serverId <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid AND server_id = :server_id LIMIT 1
        ');

        $stmt->execute([
            'uuid' => $uuid,
            'server_id' => $serverId,
        ]);

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /**
     * Find subdomain by domain + name combination.
     */
    public static function getByDomainAndLabel(int $domainId, string $subdomain): ?array
    {
        if ($domainId <= 0 || trim($subdomain) === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT * FROM ' . self::$table . ' WHERE domain_id = :domain_id AND subdomain = :subdomain LIMIT 1
        ');
        $stmt->execute(['domain_id' => $domainId, 'subdomain' => trim($subdomain)]);

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /**
     * Count subdomains created by a server.
     */
    public static function countByServer(int $serverId): int
    {
        if ($serverId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE server_id = :server_id');
        $stmt->execute(['server_id' => $serverId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Create new subdomain record.
     */
    public static function create(array $data): int | false
    {
        $required = ['server_id', 'domain_id', 'spell_id', 'subdomain', 'record_type'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                App::getInstance(true)->getLogger()->error('Missing required subdomain field: ' . $field);

                return false;
            }
        }

        $serverId = (int) $data['server_id'];
        $domainId = (int) $data['domain_id'];
        $spellId = (int) $data['spell_id'];
        $label = trim((string) $data['subdomain']);
        $recordType = strtoupper((string) $data['record_type']);

        if ($serverId <= 0 || $domainId <= 0 || $spellId <= 0 || $label === '') {
            return false;
        }

        if (!in_array($recordType, ['CNAME', 'SRV'], true)) {
            $recordType = 'CNAME';
        }

        $payload = [
            'uuid' => self::generateUuid(),
            'server_id' => $serverId,
            'domain_id' => $domainId,
            'spell_id' => $spellId,
            'subdomain' => $label,
            'record_type' => $recordType,
            'port' => isset($data['port']) ? (int) $data['port'] : null,
            'cloudflare_record_id' => $data['cloudflare_record_id'] ?? null,
        ];

        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            INSERT INTO ' . self::$table . ' (uuid, server_id, domain_id, spell_id, subdomain, record_type, port, cloudflare_record_id)
            VALUES (:uuid, :server_id, :domain_id, :spell_id, :subdomain, :record_type, :port, :cloudflare_record_id)
        ');

        if ($stmt->execute($payload)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Update Cloudflare record ID for an existing subdomain.
     */
    public static function updateCloudflareRecord(string $uuid, ?string $recordId): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            UPDATE ' . self::$table . ' SET cloudflare_record_id = :record_id WHERE uuid = :uuid
        ');

        return $stmt->execute([
            'record_id' => $recordId,
            'uuid' => $uuid,
        ]);
    }

    /**
     * Delete a subdomain by UUID.
     */
    public static function deleteByUuid(string $uuid): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE uuid = :uuid');

        return $stmt->execute(['uuid' => $uuid]);
    }

    /**
     * Delete all subdomains for server.
     */
    public static function deleteByServerId(int $serverId): bool
    {
        if ($serverId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE server_id = :server_id');

        return $stmt->execute(['server_id' => $serverId]);
    }

    /**
     * Get table columns metadata.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DESCRIBE ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Count subdomains by arbitrary conditions.
     */
    public static function count(array $conditions): int
    {
        $pdo = Database::getPdoConnection();

        if (empty($conditions)) {
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table);
            $stmt->execute();

            return (int) $stmt->fetchColumn();
        }

        $where = implode(' AND ', array_map(static fn ($key) => $key . ' = :' . $key, array_keys($conditions)));
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE ' . $where);
        $stmt->execute($conditions);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Generate UUID v4.
     */
    public static function generateUuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0F | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3F | 0x80);
        $hex = bin2hex($bytes);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12)
        );
    }

    /**
     * Basic UUID validation helper.
     */
    private static function isValidUuid(string $uuid): bool
    {
        return (bool) preg_match('/^[a-f0-9\-]{36}$/i', $uuid);
    }
}
