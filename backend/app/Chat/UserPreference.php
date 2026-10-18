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
 * UserPreference service/model for CRUD operations on the featherpanel_user_preferences table.
 * Stores entire localStorage as JSON for simplicity and future-proofing.
 */
class UserPreference
{
    /** Preference key holding the synced browser UI state (see getUiState / mergeUiState). */
    public const UI_STATE_KEY = 'ui_state';

    /** Format version of the ui_state document. */
    public const UI_STATE_VERSION = 1;
    /**
     * @var string The user preferences table name
     */
    private static string $table = 'featherpanel_user_preferences';

    /**
     * Get all preferences for a specific user as a JSON object.
     *
     * @param string $userUuid the UUID of the user
     * @param bool $includeUiState include the synced browser UI state (large, only for merges)
     *
     * @return array the preferences as an associative array (decoded from JSON)
     */
    public static function getPreferences(string $userUuid, bool $includeUiState = false): array
    {
        $preferences = self::readPreferences($userUuid);
        if (!$includeUiState) {
            // Synced UI state is served by its own endpoint; keep it out of sessions and prompts.
            unset($preferences[self::UI_STATE_KEY]);
        }

        return $preferences;
    }

    /**
     * Save/update all preferences for a user (replaces existing preferences).
     *
     * @param string $userUuid the UUID of the user
     * @param array $preferences the preferences as an associative array (will be encoded to JSON)
     *
     * @return bool true on success, false on failure
     */
    public static function savePreferences(string $userUuid, array $preferences): bool
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            App::getInstance(true)->getLogger()->error('Invalid user UUID provided to savePreferences: ' . $userUuid);

            return false;
        }

        try {
            $pdo = Database::getPdoConnection();
            $json = json_encode($preferences);

            if ($json === false) {
                App::getInstance(true)->getLogger()->error('Failed to encode preferences to JSON for user: ' . $userUuid);

                return false;
            }

            $stmt = $pdo->prepare('
                INSERT INTO ' . self::$table . ' (user_uuid, preferences)
                VALUES (:user_uuid, :preferences)
                ON DUPLICATE KEY UPDATE preferences = :preferences, updated_at = CURRENT_TIMESTAMP
            ');

            return $stmt->execute([
                'user_uuid' => $userUuid,
                'preferences' => $json,
            ]);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to save user preferences: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update specific preferences (merge with existing).
     *
     * @param string $userUuid the UUID of the user
     * @param array $updates the preferences to update (will be merged with existing)
     *
     * @return bool true on success, false on failure
     */
    public static function updatePreferences(string $userUuid, array $updates): bool
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            App::getInstance(true)->getLogger()->error('Invalid user UUID provided to updatePreferences: ' . $userUuid);

            return false;
        }

        try {
            // Get existing preferences
            $existing = self::getPreferences($userUuid, true);

            // Merge with updates
            $merged = array_merge($existing, $updates);

            // Save merged preferences
            return self::savePreferences($userUuid, $merged);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update user preferences: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Delete all preferences for a user.
     *
     * @param string $userUuid the UUID of the user
     *
     * @return bool true on success, false on failure
     */
    public static function deletePreferences(string $userUuid): bool
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            App::getInstance(true)->getLogger()->error('Invalid user UUID provided to deletePreferences: ' . $userUuid);

            return false;
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_uuid = :user_uuid');

            return $stmt->execute(['user_uuid' => $userUuid]);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete user preferences: ' . $e->getMessage());

            return false;
        }
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
     * Synced UI state: entries keyed by the browser storage key, each with its value
     * (null = removed) and the server time in milliseconds it was last written.
     *
     * @return array{version: int, entries: array<string, array{v: ?string, t: int}>}
     */
    public static function getUiState(string $userUuid): array
    {
        return self::normalizeUiState(self::getPreferences($userUuid, true)[self::UI_STATE_KEY] ?? null);
    }

    /**
     * Merge changed entries into the stored UI state. The row is locked for the
     * read-modify-write so two devices saving at once cannot drop each other's keys.
     *
     * @param array<string, ?string> $changes storage key => new value (null removes it)
     *
     * @return array{version: int, entries: array<string, array{v: ?string, t: int}>}|null null on failure
     */
    public static function mergeUiState(string $userUuid, array $changes): ?array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('SELECT preferences FROM ' . self::$table . ' WHERE user_uuid = :user_uuid FOR UPDATE');
            $stmt->execute(['user_uuid' => $userUuid]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            $preferences = $row && isset($row['preferences']) ? json_decode((string) $row['preferences'], true) : [];
            if (!is_array($preferences)) {
                $preferences = [];
            }

            $state = self::normalizeUiState($preferences[self::UI_STATE_KEY] ?? null);
            $now = (int) floor(microtime(true) * 1000);
            foreach ($changes as $key => $value) {
                $state['entries'][(string) $key] = ['v' => $value, 't' => $now];
            }
            $preferences[self::UI_STATE_KEY] = $state;

            $json = json_encode($preferences);
            if ($json === false) {
                $pdo->rollBack();

                return null;
            }
            $save = $pdo->prepare('
                INSERT INTO ' . self::$table . ' (user_uuid, preferences)
                VALUES (:user_uuid, :preferences)
                ON DUPLICATE KEY UPDATE preferences = :preferences, updated_at = CURRENT_TIMESTAMP
            ');
            $save->execute(['user_uuid' => $userUuid, 'preferences' => $json]);
            $pdo->commit();

            return $state;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('Failed to merge UI state: ' . $e->getMessage());

            return null;
        }
    }

    private static function readPreferences(string $userUuid): array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            App::getInstance(true)->getLogger()->error('Invalid user UUID provided to getPreferences: ' . $userUuid);

            return [];
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('SELECT preferences FROM ' . self::$table . ' WHERE user_uuid = :user_uuid');
            $stmt->execute(['user_uuid' => $userUuid]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($result && isset($result['preferences'])) {
                $decoded = json_decode($result['preferences'], true);

                return is_array($decoded) ? $decoded : [];
            }

            return [];
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to get user preferences: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * @return array{version: int, entries: array<string, array{v: ?string, t: int}>}
     */
    private static function normalizeUiState(mixed $raw): array
    {
        $entries = [];
        if (is_array($raw) && isset($raw['entries']) && is_array($raw['entries'])) {
            foreach ($raw['entries'] as $key => $entry) {
                if (!is_array($entry) || !array_key_exists('v', $entry)) {
                    continue;
                }
                $value = $entry['v'];
                if ($value !== null && !is_string($value)) {
                    continue;
                }
                $entries[(string) $key] = ['v' => $value, 't' => (int) ($entry['t'] ?? 0)];
            }
        }

        return ['version' => self::UI_STATE_VERSION, 'entries' => $entries];
    }
}
