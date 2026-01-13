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
 * SubdomainDomain service/model for CRUD operations on the featherpanel_subdomain_manager_domains table.
 *
 * This class provides helpers to manage domains allowed for automatic subdomain provisioning
 * along with their related spell configuration.
 */
class SubdomainDomain
{
    private static string $table = 'featherpanel_subdomain_manager_domains';
    private static string $pivotTable = 'featherpanel_subdomain_manager_domain_spells';

    /**
     * Fetch paginated list of domains with optional search.
     */
    public static function getDomains(int $page = 1, int $limit = 25, string $search = '', bool $includeInactive = true): array
    {
        $page = max($page, 1);
        $limit = max($limit, 1);
        $offset = ($page - 1) * $limit;

        $pdo = Database::getPdoConnection();
        $conditions = [];
        $params = [];

        if ($search !== '') {
            $conditions[] = '(domain LIKE :search OR description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if (!$includeInactive) {
            $conditions[] = 'is_active = 1';
        }

        $sql = 'SELECT * FROM ' . self::$table;
        if (!empty($conditions)) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Count domains for pagination.
     */
    public static function getDomainsCount(string $search = '', bool $includeInactive = true): int
    {
        $pdo = Database::getPdoConnection();
        $conditions = [];
        $params = [];

        if ($search !== '') {
            $conditions[] = '(domain LIKE :search OR description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if (!$includeInactive) {
            $conditions[] = 'is_active = 1';
        }

        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        if (!empty($conditions)) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Retrieve a domain by UUID.
     */
    public static function getDomainByUuid(string $uuid): ?array
    {
        if (!self::isValidUuid($uuid)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        $domain = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $domain ?: null;
    }

    /**
     * Retrieve a domain by ID.
     */
    public static function getDomainById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        $domain = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $domain ?: null;
    }

    /**
     * Retrieve a domain and its related spell configuration.
     */
    public static function getDomainWithSpellsByUuid(string $uuid): ?array
    {
        $domain = self::getDomainByUuid($uuid);
        if (!$domain) {
            return null;
        }

        $domain['spells'] = self::getSpellMappings((int) $domain['id']);

        return $domain;
    }

    /**
     * Retrieve all spell bindings for a domain.
     */
    public static function getSpellMappings(int $domainId): array
    {
        if ($domainId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$pivotTable . ' WHERE domain_id = :domain_id ORDER BY spell_id ASC');
        $stmt->execute(['domain_id' => $domainId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Retrieve all active domains assigned to a spell.
     */
    public static function getActiveDomainsForSpell(int $spellId): array
    {
        if ($spellId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT d.*, ds.protocol_service, ds.protocol_type, ds.priority, ds.weight, ds.ttl
            FROM ' . self::$table . ' d
            INNER JOIN ' . self::$pivotTable . ' ds ON ds.domain_id = d.id
            WHERE ds.spell_id = :spell_id AND d.is_active = 1
            ORDER BY d.domain ASC
        ');
        $stmt->execute(['spell_id' => $spellId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Create a new domain with spell mappings.
     */
    public static function createDomain(array $data, array $spellConfigs): int | false
    {
        $required = ['domain', 'cloudflare_account_id'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                App::getInstance(true)->getLogger()->error('Missing required domain field: ' . $field);

                return false;
            }
        }

        $pdo = Database::getPdoConnection();

        try {
            $pdo->beginTransaction();

            $domainData = [
                'uuid' => self::generateUuid(),
                'domain' => trim((string) $data['domain']),
                'description' => isset($data['description']) ? trim((string) $data['description']) : null,
                'is_active' => isset($data['is_active']) && (int) $data['is_active'] === 0 ? 0 : 1,
                'cloudflare_zone_id' => isset($data['cloudflare_zone_id']) ? trim((string) $data['cloudflare_zone_id']) : null,
                'cloudflare_account_id' => trim((string) $data['cloudflare_account_id']),
            ];

            $stmt = $pdo->prepare('
                INSERT INTO ' . self::$table . ' (uuid, domain, description, is_active, cloudflare_zone_id, cloudflare_account_id)
                VALUES (:uuid, :domain, :description, :is_active, :cloudflare_zone_id, :cloudflare_account_id)
            ');
            $stmt->execute($domainData);

            $domainId = (int) $pdo->lastInsertId();
            self::syncSpellMappings($domainId, $spellConfigs, $pdo);

            $pdo->commit();

            return $domainId;
        } catch (\PDOException $exception) {
            $pdo->rollBack();
            $logger = App::getInstance(true)->getLogger();
            $logger->error('Failed to create subdomain domain: ' . $exception->getMessage());

            return false;
        }
    }

    /**
     * Update a domain and its spell mappings by UUID.
     */
    public static function updateDomainByUuid(string $uuid, array $data, ?array $spellConfigs = null): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $domain = self::getDomainByUuid($uuid);
        if (!$domain) {
            return false;
        }

        $pdo = Database::getPdoConnection();

        try {
            $pdo->beginTransaction();

            $fields = [];
            $params = ['uuid' => $uuid];

            if (isset($data['domain']) && trim((string) $data['domain']) !== '') {
                $fields[] = 'domain = :domain';
                $params['domain'] = trim((string) $data['domain']);
            }

            if (array_key_exists('description', $data)) {
                $fields[] = 'description = :description';
                $params['description'] = $data['description'] !== null ? trim((string) $data['description']) : null;
            }

            if (isset($data['is_active'])) {
                $fields[] = 'is_active = :is_active';
                $params['is_active'] = (int) $data['is_active'] === 0 ? 0 : 1;
            }

            if (array_key_exists('cloudflare_zone_id', $data)) {
                $fields[] = 'cloudflare_zone_id = :cloudflare_zone_id';
                $params['cloudflare_zone_id'] = $data['cloudflare_zone_id'] !== null ? trim((string) $data['cloudflare_zone_id']) : null;
            }

            if (array_key_exists('cloudflare_account_id', $data) && trim((string) $data['cloudflare_account_id']) !== '') {
                $fields[] = 'cloudflare_account_id = :cloudflare_account_id';
                $params['cloudflare_account_id'] = trim((string) $data['cloudflare_account_id']);
            }

            if (!empty($fields)) {
                $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $fields) . ' WHERE uuid = :uuid';
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }

            if ($spellConfigs !== null) {
                self::syncSpellMappings((int) $domain['id'], $spellConfigs, $pdo);
            }

            $pdo->commit();

            return true;
        } catch (\PDOException $exception) {
            $pdo->rollBack();
            App::getInstance(true)->getLogger()->error('Failed to update subdomain domain: ' . $exception->getMessage());

            return false;
        }
    }

    /**
     * Remove a domain by UUID (cascades to spell mappings and subdomains).
     */
    public static function deleteDomainByUuid(string $uuid): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE uuid = :uuid');

        return $stmt->execute(['uuid' => $uuid]);
    }

    /**
     * Update the cached Cloudflare zone ID for a domain.
     */
    public static function updateCloudflareZoneId(int $domainId, ?string $zoneId): bool
    {
        if ($domainId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET cloudflare_zone_id = :zone_id WHERE id = :id');

        return $stmt->execute([
            'zone_id' => $zoneId,
            'id' => $domainId,
        ]);
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
     * Count records by conditions.
     */
    public static function count(array $conditions): int
    {
        if (empty($conditions)) {
            return self::getDomainsCount();
        }

        $pdo = Database::getPdoConnection();
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
     * Synchronise spell mapping records for a domain inside an existing transaction.
     */
    private static function syncSpellMappings(int $domainId, array $spellConfigs, \PDO $pdo): void
    {
        $normalized = self::normalizeSpellConfigs($spellConfigs);

        $existingStmt = $pdo->prepare('SELECT spell_id FROM ' . self::$pivotTable . ' WHERE domain_id = :domain_id');
        $existingStmt->execute(['domain_id' => $domainId]);
        $existing = $existingStmt->fetchAll(\PDO::FETCH_COLUMN);

        $existingIds = array_map('intval', $existing ?: []);
        $incomingIds = array_map(static fn (array $config) => (int) $config['spell_id'], $normalized);

        $toDelete = array_diff($existingIds, $incomingIds);
        if (!empty($toDelete)) {
            $placeholders = implode(', ', array_fill(0, count($toDelete), '?'));
            $deleteStmt = $pdo->prepare('DELETE FROM ' . self::$pivotTable . ' WHERE domain_id = ? AND spell_id IN (' . $placeholders . ')');
            $deleteStmt->execute(array_merge([$domainId], array_values($toDelete)));
        }

        $upsertSql = '
            INSERT INTO ' . self::$pivotTable . ' (domain_id, spell_id, protocol_service, protocol_type, priority, weight, ttl)
            VALUES (:domain_id, :spell_id, :protocol_service, :protocol_type, :priority, :weight, :ttl)
            ON DUPLICATE KEY UPDATE
                protocol_service = VALUES(protocol_service),
                protocol_type = VALUES(protocol_type),
                priority = VALUES(priority),
                weight = VALUES(weight),
                ttl = VALUES(ttl)
        ';
        $upsertStmt = $pdo->prepare($upsertSql);

        foreach ($normalized as $config) {
            $upsertStmt->execute([
                'domain_id' => $domainId,
                'spell_id' => (int) $config['spell_id'],
                'protocol_service' => $config['protocol_service'],
                'protocol_type' => $config['protocol_type'],
                'priority' => $config['priority'],
                'weight' => $config['weight'],
                'ttl' => $config['ttl'],
            ]);
        }
    }

    /**
     * Normalise spell configuration payload and validate values.
     */
    private static function normalizeSpellConfigs(array $spellConfigs): array
    {
        $normalized = [];

        foreach ($spellConfigs as $config) {
            if (!isset($config['spell_id'])) {
                continue;
            }

            $spellId = (int) $config['spell_id'];
            if ($spellId <= 0) {
                continue;
            }

            $protocolService = null;
            if (isset($config['protocol_service']) && trim((string) $config['protocol_service']) !== '') {
                $protocolService = trim((string) $config['protocol_service']);
            }

            $protocolType = isset($config['protocol_type']) ? strtolower((string) $config['protocol_type']) : 'tcp';
            if (!in_array($protocolType, ['tcp', 'udp', 'tls'], true)) {
                $protocolType = 'tcp';
            }

            $priority = isset($config['priority']) ? max(0, (int) $config['priority']) : 1;
            $weight = isset($config['weight']) ? max(0, (int) $config['weight']) : 1;
            $ttl = isset($config['ttl']) ? max(60, (int) $config['ttl']) : 120;

            $normalized[] = [
                'spell_id' => $spellId,
                'protocol_service' => $protocolService,
                'protocol_type' => $protocolType,
                'priority' => $priority,
                'weight' => $weight,
                'ttl' => $ttl,
            ];
        }

        return $normalized;
    }

    /**
     * Basic UUID format validation.
     */
    private static function isValidUuid(string $uuid): bool
    {
        return (bool) preg_match('/^[a-f0-9\-]{36}$/i', $uuid);
    }
}
