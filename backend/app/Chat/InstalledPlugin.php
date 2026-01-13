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
 * InstalledPlugin service/model for CRUD operations on the featherpanel_installed_plugins table.
 *
 * This class provides static methods for tracking plugin installations and uninstallations
 * to help users restore their plugins after FeatherPanel updates.
 */
class InstalledPlugin
{
    private static string $table = 'featherpanel_installed_plugins';

    /**
     * Create a new installed plugin record.
     *
     * @param array $data Associative array of plugin fields
     *
     * @return int|false The new record's ID or false on failure
     */
    public static function createInstalledPlugin(array $data): int | false
    {
        $required = ['name', 'identifier'];

        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // Validate identifier format
        if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $data['identifier'])) {
            App::getInstance(true)->getLogger()->error('Invalid plugin identifier format: ' . $data['identifier']);

            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($data)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Get installed plugin by identifier.
     *
     * @param string $identifier Plugin identifier
     *
     * @return array|null Plugin data or null if not found
     */
    public static function getInstalledPluginByIdentifier(string $identifier): ?array
    {
        if (empty($identifier)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE identifier = :identifier LIMIT 1');
        $stmt->execute(['identifier' => $identifier]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get installed plugin by ID.
     *
     * @param int $id Plugin record ID
     *
     * @return array|null Plugin data or null if not found
     */
    public static function getInstalledPluginById(int $id): ?array
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
     * Get all installed plugins (not uninstalled).
     *
     * @return array Array of installed plugins
     */
    public static function getAllInstalledPlugins(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' WHERE uninstalled_at IS NULL ORDER BY installed_at DESC');

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get all previously installed plugins (including uninstalled ones).
     *
     * @return array Array of all plugin records
     */
    public static function getAllPreviouslyInstalledPlugins(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' ORDER BY installed_at DESC');

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get uninstalled plugins (for restoration suggestions).
     *
     * @return array Array of uninstalled plugins
     */
    public static function getUninstalledPlugins(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' WHERE uninstalled_at IS NOT NULL ORDER BY uninstalled_at DESC');

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Mark plugin as uninstalled.
     *
     * @param string $identifier Plugin identifier
     *
     * @return bool True on success, false on failure
     */
    public static function markAsUninstalled(string $identifier): bool
    {
        if (empty($identifier)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET uninstalled_at = NOW() WHERE identifier = :identifier AND uninstalled_at IS NULL');

        return $stmt->execute(['identifier' => $identifier]);
    }

    /**
     * Mark plugin as reinstalled (clear uninstalled_at).
     *
     * @param string $identifier Plugin identifier
     *
     * @return bool True on success, false on failure
     */
    public static function markAsReinstalled(string $identifier): bool
    {
        if (empty($identifier)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET uninstalled_at = NULL, installed_at = NOW() WHERE identifier = :identifier');

        return $stmt->execute(['identifier' => $identifier]);
    }

    /**
     * Update installed plugin.
     *
     * @param string $identifier Plugin identifier
     * @param array $data Fields to update
     *
     * @return bool True on success, false on failure
     */
    public static function updateInstalledPlugin(string $identifier, array $data): bool
    {
        try {
            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update');

                return false;
            }

            // Prevent updating primary keys
            unset($data['id'], $data['identifier']);

            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE identifier = :identifier';

            $params = $data;
            $params['identifier'] = $identifier;
            $stmt = $pdo->prepare($sql);

            return $stmt->execute($params);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to update installed plugin: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Delete installed plugin record.
     *
     * @param int $id Plugin record ID
     *
     * @return bool True on success, false on failure
     */
    public static function hardDeleteInstalledPlugin(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get count of installed plugins.
     *
     * @return int Count of installed plugins
     */
    public static function getInstalledPluginsCount(): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT COUNT(*) FROM ' . self::$table . ' WHERE uninstalled_at IS NULL');

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get count of uninstalled plugins.
     *
     * @return int Count of uninstalled plugins
     */
    public static function getUninstalledPluginsCount(): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT COUNT(*) FROM ' . self::$table . ' WHERE uninstalled_at IS NOT NULL');

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get table columns information.
     *
     * @return array Array of column information
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DESCRIBE ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
