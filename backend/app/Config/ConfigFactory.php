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

namespace App\Config;

use App\App;

class ConfigFactory
{
    /** Long-running CLI processes never reset the cache, so it also expires. */
    private const REQUEST_CACHE_MAX_AGE = 5.0;
    private \PDO $db;
    private array $cache = [];

    private string $table_name = 'featherpanel_settings';

    /**
     * Settings of the current request, shared by every ConfigFactory instance
     * (App::getConfig() returns a new one per call). Loaded with one query on
     * first use; null marks a setting that does not exist, so a missing
     * setting does not cost a query per lookup either.
     *
     * @var array<string, string|null>
     */
    private static array $requestCache = [];

    private static bool $requestCacheLoaded = false;

    private static float $requestCacheLoadedAt = 0.0;

    /** @var array<string, string|null> decrypted values of */
    private static array $requestCacheDecrypted = [];

    public function __construct(\PDO $db)
    {
        try {
            $this->db = $db;
        } catch (\Exception $e) {
            throw new \Exception('Failed to connect to the MYSQL Server! ', $e->getMessage());
        }
    }

    /**
     * Forget the cached settings (called before every request, see RequestLifecycle).
     */
    public static function resetRequestCache(): void
    {
        self::$requestCache = [];
        self::$requestCacheLoaded = false;
        self::$requestCacheLoadedAt = 0.0;
        self::$requestCacheDecrypted = [];
    }

    /**
     * Get a setting from the database.
     *
     * @param string $name The name of the setting
     * @param mixed $fallback The fallback value if the setting is not found
     *
     * @return string|null The value of the setting
     */
    public function getSetting(string $name, ?string $fallback): ?string
    {
        // Check if the setting is in the cache
        if (isset($this->cache[$name])) {
            return $this->cache[$name];
        }

        if (self::$requestCacheLoaded && microtime(true) - self::$requestCacheLoadedAt > self::REQUEST_CACHE_MAX_AGE) {
            self::resetRequestCache();
        }
        if (!self::$requestCacheLoaded) {
            $this->loadRequestCache();
        }
        if (!array_key_exists($name, self::$requestCache)) {
            // The setting does not exist.
            return $fallback ?? null;
        }
        if (!array_key_exists($name, self::$requestCacheDecrypted)) {
            // Decrypt on first use only: most requests read a handful of settings.
            $raw = self::$requestCache[$name];
            self::$requestCacheDecrypted[$name] = $raw === null ? null : App::getInstance(true)->decryptValue($raw);
        }
        $value = self::$requestCacheDecrypted[$name];
        if ($value === null) {
            return $fallback ?? null;
        }
        $this->cache[$name] = $value;

        return $value;
    }

    public function getSettings(array $columns = []): array
    {
        $query = "SELECT name, value FROM {$this->table_name}";
        if (!empty($columns)) {
            $placeholders = array_fill(0, count($columns), '?');
            $query .= ' WHERE name IN (' . implode(',', $placeholders) . ')';
        }
        $query .= ' ORDER BY name ASC';
        $stmt = $this->db->prepare($query);
        if (!empty($columns)) {
            $stmt->execute($columns);
        } else {
            $stmt->execute();
        }
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $settings = [];
        foreach ($results as $result) {
            $decrypted = App::getInstance(true)->decryptValue($result['value']);
            $settings[$result['name']] = $decrypted;
            $this->cache[$result['name']] = $decrypted;
        }

        return $settings;
    }

    /**
     * Set a setting in the database.
     *
     * @param string $name The name of the setting
     * @param string|null $value The value of the setting (null to delete)
     *
     * @throws \Exception If the setting already exists
     *
     * @return bool True if the setting was set successfully
     */
    public function setSetting(string $name, ?string $value): bool
    {
        if (self::$requestCacheLoaded) {
            // Keep the plaintext: there is nothing to decrypt.
            self::$requestCache[$name] = $value;
            self::$requestCacheDecrypted[$name] = $value;
        }

        if ($value === null) {
            // Delete the setting from the database if value is null
            $stmt = $this->db->prepare("DELETE FROM {$this->table_name} WHERE name = :name");
            $result = $stmt->execute(['name' => $name]);
            // Remove from cache if present
            unset($this->cache[$name]);

            return $result;
        }

        $encryptedValue = App::getInstance(true)->encryptValue($value);
        $stmt = $this->db->prepare("INSERT INTO {$this->table_name} (name, value, date) VALUES (:name, :value, NOW()) ON DUPLICATE KEY UPDATE value = :value, date = NOW()");
        $result = $stmt->execute(['name' => $name, 'value' => $encryptedValue]);
        if ($result) {
            // Cache plaintext so getSetting() after setSetting() does not return ciphertext.
            $this->cache[$name] = $value;
        }

        return $result;
    }

    /**
     * ⚠️ DANGER ZONE - HANDLE WITH EXTREME CAUTION ⚠️.
     *
     * This function is used to dump all settings from the database.
     *
     * WARNING: This function will return ALL settings from the database in their decrypted form.
     * This includes potentially sensitive information like API keys, tokens, and credentials.
     *
     * Only use this function for debugging purposes in a secure environment.
     * Never expose this data publicly or log it to files that could be accessed by others.
     *
     * The settings are returned as a simple key-value array with no encryption.
     * Be extremely careful with how you handle and store this data.
     *
     * @return array All settings from database in plain text
     */
    public function dumpSettings(): array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table_name} ORDER BY name ASC");
        $stmt->execute();
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $settings = [];
        foreach ($results as $result) {
            $settings[$result['name']] = App::getInstance(true)->decryptValue($result['value']);
        }

        return $settings;
    }

    public static function getConfigurableSettings(): array
    {
        $ref = new \ReflectionClass(ConfigInterface::class);

        return $ref->getConstants();
    }

    /**
     * Load every setting with a single query.
     */
    private function loadRequestCache(): void
    {
        $cache = [];
        $stmt = $this->db->query("SELECT name, value FROM {$this->table_name}");
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $cache[(string) $row['name']] = $row['value'] === null ? null : (string) $row['value'];
        }
        self::$requestCache = $cache;
        self::$requestCacheDecrypted = [];
        self::$requestCacheLoaded = true;
        self::$requestCacheLoadedAt = microtime(true);
    }
}
