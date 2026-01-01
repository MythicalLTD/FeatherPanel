<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Chat;

use App\App;

/**
 * UserPreference service/model for CRUD operations on the featherpanel_user_preferences table.
 * Stores entire localStorage as JSON for simplicity and future-proofing.
 */
class UserPreference
{
    /**
     * @var string The user preferences table name
     */
    private static string $table = 'featherpanel_user_preferences';

    /**
     * Get all preferences for a specific user as a JSON object.
     *
     * @param string $userUuid the UUID of the user
     *
     * @return array the preferences as an associative array (decoded from JSON)
     */
    public static function getPreferences(string $userUuid): array
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
            $existing = self::getPreferences($userUuid);

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
}
