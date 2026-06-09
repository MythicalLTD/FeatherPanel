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
 * Spell service/model for CRUD operations on the featherpanel_spells table.
 */
class Spell
{
    /**
     * @var string The spells table name
     */
    private static string $table = 'featherpanel_spells';

    /**
     * Create a new spell.
     *
     * @param array $data Associative array of spell fields
     *
     * @return int|false The new spell's ID or false on failure
     */
    public static function createSpell(array $data): int | false
    {
        // Required fields for spell creation
        $required = [
            'uuid',
            'realm_id',
            'author',
            'name',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for spell: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for spell: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if ($field === 'realm_id') {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid realm_id: ' . $data[$field] . ' for spell: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if (!is_string($data[$field]) || trim($data[$field]) === '') {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for spell: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // UUID validation (basic)
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid UUID: ' . $data['uuid'] . ' for spell: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate realm_id exists
        if (!Realm::getById($data['realm_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid realm_id: ' . $data['realm_id'] . ' for spell: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate JSON fields if provided
        if (!self::validateJsonFields($data, $data['name'])) {
            return false;
        }

        // Convert boolean values to integers for database compatibility
        $booleanFields = ['script_is_privileged', 'force_outgoing_ip'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = $data[$field] ? 1 : 0;
            }
        }

        // Convert empty JSON fields to NULL to satisfy CHECK constraints
        $jsonFields = ['features', 'docker_images', 'file_denylist'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && (empty($data[$field]) || trim($data[$field]) === '')) {
                $data[$field] = null;
            }
        }

        // Handle optional ID for migrations
        $hasId = isset($data['id']) && is_int($data['id']) && $data['id'] > 0;

        if (!isset($data['sort_order'])) {
            $data['sort_order'] = self::getNextSortOrderForRealm((int) $data['realm_id']);
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($data)) {
            return $hasId ? $data['id'] : (int) $pdo->lastInsertId();
        }

        $sanitizedData = self::sanitizeDataForLogging($data);
        App::getInstance(true)->getLogger()->error('Failed to create spell: ' . $sql . ' for spell: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData) . ' and error: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /**
     * Fetch a spell by ID.
     */
    public static function getSpellById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Fetch a spell by UUID.
     */
    public static function getSpellByUuid(string $uuid): ?array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Fetch spells by realm ID.
     */
    public static function getSpellsByRealmId(int $realmId): array
    {
        if ($realmId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE realm_id = :realm_id ORDER BY sort_order ASC, name ASC');
        $stmt->execute(['realm_id' => $realmId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Fetch all spells with optional filtering.
     */
    public static function getAllSpells(): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;

        $sql .= ' ORDER BY realm_id ASC, sort_order ASC, name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Next sort_order value for a new spell in a realm.
     */
    public static function getNextSortOrderForRealm(int $realmId): int
    {
        if ($realmId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT COALESCE(MAX(sort_order), -10) + 10 FROM ' . self::$table . ' WHERE realm_id = :realm_id'
        );
        $stmt->execute(['realm_id' => $realmId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Search spells with pagination and filtering.
     */
    public static function searchSpells(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = [],
        string $sortBy = 'sort_order',
        string $sortOrder = 'ASC',
        ?int $realmId = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

        $sql = 'SELECT s.*, r.name as realm_name FROM ' . self::$table . ' s';
        $sql .= ' LEFT JOIN featherpanel_realms r ON s.realm_id = r.id';
        $sql .= ' WHERE 1=1';

        if (!empty($search)) {
            $sql .= ' AND (s.name LIKE :search OR s.description LIKE :search OR s.author LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($realmId !== null) {
            $sql .= ' AND s.realm_id = :realm_id';
            $params['realm_id'] = $realmId;
        }

        $allowedSort = ['sort_order', 'name', 'created_at', 'id'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'sort_order';
        }
        $sortOrder = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

        $sql .= ' ORDER BY s.' . $sortBy . ' ' . $sortOrder;
        if ($sortBy !== 'name') {
            $sql .= ', s.name ASC';
        }
        $sql .= ' LIMIT :limit OFFSET :offset';

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
     * Get total count of spells with optional filtering.
     */
    public static function getSpellsCount(
        string $search = '',
        ?int $realmId = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $params = [];

        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' WHERE 1=1';

        if (!empty($search)) {
            $sql .= ' AND (name LIKE :search OR description LIKE :search OR author LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($realmId !== null) {
            $sql .= ' AND realm_id = :realm_id';
            $params['realm_id'] = $realmId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Update a spell by UUID.
     */
    public static function updateSpell(string $uuid, array $data): bool
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return false;
        }

        // Validate realm_id if provided
        if (isset($data['realm_id']) && !Realm::getById($data['realm_id'])) {
            return false;
        }

        // Validate JSON fields if provided
        if (!self::validateJsonFields($data)) {
            return false;
        }

        // Convert boolean values to integers for database compatibility
        $booleanFields = ['script_is_privileged', 'force_outgoing_ip'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = $data[$field] ? 1 : 0;
            }
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $set = array_map(fn ($f) => "`$f` = :$f", $fields);
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(',', $set) . ' WHERE uuid = :uuid';

        $params = $data;
        $params['uuid'] = $uuid;

        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Update a spell by ID.
     */
    public static function updateSpellById(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }

        // Validate realm_id if provided
        if (isset($data['realm_id']) && !Realm::getById($data['realm_id'])) {
            return false;
        }

        // Validate JSON fields if provided
        if (!self::validateJsonFields($data)) {
            return false;
        }

        // Convert boolean values to integers for database compatibility
        $booleanFields = ['script_is_privileged', 'force_outgoing_ip'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = $data[$field] ? 1 : 0;
            }
        }

        // Convert empty JSON fields to NULL to satisfy CHECK constraints
        $jsonFields = ['features', 'docker_images', 'file_denylist'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && (empty($data[$field]) || trim($data[$field]) === '')) {
                $data[$field] = null;
            }
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $set = array_map(fn ($f) => "`$f` = :$f", $fields);
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(',', $set) . ' WHERE id = :id';

        $params = $data;
        $params['id'] = $id;

        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Hard delete a spell by ID.
     */
    public static function hardDeleteSpell(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        Mount::deletePivotLinksForMountable(Mount::MOUNTABLE_SPELL, $id);
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get spells by author.
     */
    public static function getSpellsByAuthor(string $author): array
    {
        if (empty($author)) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE author = :author ORDER BY name ASC');
        $stmt->execute(['author' => $author]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get spells that inherit from another spell.
     */
    public static function getSpellsByConfigFrom(int $configFromId): array
    {
        if ($configFromId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE config_from = :config_from ORDER BY name ASC');
        $stmt->execute(['config_from' => $configFromId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get spells that are copied from another spell.
     */
    public static function getSpellsByCopyScriptFrom(int $copyScriptFromId): array
    {
        if ($copyScriptFromId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE copy_script_from = :copy_script_from ORDER BY name ASC');
        $stmt->execute(['copy_script_from' => $copyScriptFromId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get table columns information.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DESCRIBE ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Generate a cryptographically secure version 4 UUID for spells.
     */
    public static function generateUuid(): string
    {
        // Generate 16 random bytes
        $bytes = random_bytes(16);

        // Set version (4) and variant bits according to RFC 4122
        $bytes[6] = chr(ord($bytes[6]) & 0x0F | 0x40); // Version 4
        $bytes[8] = chr(ord($bytes[8]) & 0x3F | 0x80); // Variant bits

        // Convert to hex and format as UUID
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
     * Validate if a string is valid JSON.
     */
    public static function isValidJson(string $string): bool
    {
        json_decode($string);

        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * Get spell with realm information.
     */
    public static function getSpellWithRealm(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT s.*, r.name as realm_name, r.description as realm_description 
            FROM ' . self::$table . ' s 
            LEFT JOIN featherpanel_realms r ON s.realm_id = r.id 
            WHERE s.id = :id LIMIT 1
        ');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all spells with realm information.
     */
    public static function getAllSpellsWithRealm(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT s.*, r.name as realm_name, r.description as realm_description 
            FROM ' . self::$table . ' s 
            LEFT JOIN featherpanel_realms r ON s.realm_id = r.id 
            ORDER BY s.sort_order ASC, s.name ASC
        ');
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Update sort order for multiple spells (batch reorder within a realm).
     *
     * @param array $spells Array of ['id' => int, 'sort_order' => int]
     * @param int|null $realmId When set, every spell must belong to this realm
     */
    public static function updateSortOrders(array $spells, ?int $realmId = null): bool
    {
        if (empty($spells)) {
            return false;
        }

        $pdo = Database::getPdoConnection();

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET sort_order = :sort_order WHERE id = :id');

            foreach ($spells as $spell) {
                if (!isset($spell['id']) || !isset($spell['sort_order'])) {
                    continue;
                }

                $id = (int) $spell['id'];
                $sortOrder = (int) $spell['sort_order'];

                if ($id <= 0) {
                    continue;
                }

                if ($realmId !== null) {
                    $row = self::getSpellById($id);
                    if (!$row || (int) $row['realm_id'] !== $realmId) {
                        $pdo->rollBack();

                        return false;
                    }
                }

                $stmt->execute([
                    'id' => $id,
                    'sort_order' => $sortOrder,
                ]);
            }

            $pdo->commit();

            return true;
        } catch (\PDOException $e) {
            $pdo->rollBack();
            App::getInstance(true)->getLogger()->error('Failed to update spell sort orders: ' . $e->getMessage());

            return false;
        }
    }

    public static function count(array $conditions): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE ' . implode(' AND ', array_map(fn ($k) => "$k = :$k", array_keys($conditions))));
        $stmt->execute($conditions);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Parse docker_images JSON into a list of image tags.
     *
     * @return list<string>
     */
    public static function parseDockerImages(?string $dockerImagesJson): array
    {
        if ($dockerImagesJson === null || trim($dockerImagesJson) === '') {
            return [];
        }

        try {
            $dockerImages = json_decode($dockerImagesJson, true);
            if (!is_array($dockerImages) || $dockerImages === []) {
                return [];
            }

            return array_values(array_filter(
                $dockerImages,
                static fn ($value) => is_string($value) && trim($value) !== ''
            ));
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Resolve the default Docker image for a spell.
     * Uses default_docker_image when set and valid, otherwise the first docker_images entry.
     */
    public static function resolveDefaultDockerImage(array $spell): ?string
    {
        $dockerImages = self::parseDockerImages($spell['docker_images'] ?? null);

        if (!empty($spell['default_docker_image']) && is_string($spell['default_docker_image'])) {
            $default = trim($spell['default_docker_image']);
            if ($default !== '' && ($dockerImages === [] || in_array($default, $dockerImages, true))) {
                return $default;
            }
        }

        return $dockerImages[0] ?? null;
    }

    /**
     * Ensure default_docker_image references a value from docker_images when possible.
     */
    public static function sanitizeDefaultDockerImage(?string $defaultDockerImage, ?string $dockerImagesJson): ?string
    {
        $images = self::parseDockerImages($dockerImagesJson);
        if ($images === []) {
            return null;
        }

        if ($defaultDockerImage === null || trim($defaultDockerImage) === '') {
            return $images[0];
        }

        $defaultDockerImage = trim($defaultDockerImage);

        if (!in_array($defaultDockerImage, $images, true)) {
            return $images[0];
        }

        return $defaultDockerImage;
    }

    /**
     * Sanitize data for logging by excluding sensitive fields.
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = [
            'script_install',
            'config_files',
            'config_startup',
            'config_logs',
            'config_stop',
            'startup',
            'docker_images',
            'features',
            'file_denylist',
            'update_url',
        ];

        $sanitized = $data;
        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }

    /**
     * Validate JSON fields in spell data.
     *
     * @param array $data The spell data array
     * @param string|null $spellName Optional spell name for error logging
     *
     * @return bool True if all JSON fields are valid, false otherwise
     */
    private static function validateJsonFields(array $data, ?string $spellName = null): bool
    {
        $jsonFields = ['features', 'docker_images', 'file_denylist'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                if (!self::isValidJson($data[$field])) {
                    if ($spellName) {
                        $sanitizedData = self::sanitizeDataForLogging($data);
                        App::getInstance(true)->getLogger()->error('Invalid JSON field: ' . $field . ' for spell: ' . $spellName . ' with data: ' . json_encode($sanitizedData));
                    }

                    return false;
                }
            }
        }

        return true;
    }
}
