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
 * UserDataExport service/model for queued personal data exports.
 */
class UserDataExport
{
    private static string $table = 'featherpanel_user_data_exports';

    /**
     * Create a pending export request.
     */
    public static function create(array $data): int | false
    {
        $required = ['uuid', 'user_uuid', 'ticket_id'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        if (!preg_match('/^[a-f0-9\-]{36}$/i', (string) $data['uuid'])) {
            App::getInstance(true)->getLogger()->error('Invalid data export UUID: ' . $data['uuid']);

            return false;
        }

        if (!preg_match('/^[a-f0-9\-]{36}$/i', (string) $data['user_uuid'])) {
            App::getInstance(true)->getLogger()->error('Invalid user UUID for data export: ' . $data['user_uuid']);

            return false;
        }

        if (!Ticket::getById((int) $data['ticket_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid ticket ID for data export: ' . $data['ticket_id']);

            return false;
        }

        $insert = [
            'uuid' => $data['uuid'],
            'user_uuid' => $data['user_uuid'],
            'ticket_id' => (int) $data['ticket_id'],
            'status' => $data['status'] ?? 'pending',
        ];

        $pdo = Database::getPdoConnection();
        $fields = array_keys($insert);
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $stmt = $pdo->prepare('INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')');

        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Generate a cryptographically secure version 4 UUID.
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
     * Get an export request by ID.
     */
    public static function getById(int $id): ?array
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
     * Check whether a user already requested an export in the cooldown window.
     */
    public static function hasRecentRequestForUser(string $userUuid, int $hours = 24): bool
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid) || $hours < 1) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM ' . self::$table . '
             WHERE user_uuid = :user_uuid
               AND requested_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL :hours HOUR)'
        );
        $stmt->bindValue('user_uuid', $userUuid);
        $stmt->bindValue('hours', $hours, \PDO::PARAM_INT);
        $stmt->execute();

        return (int) $stmt->fetchColumn() > 0;
    }

    /**
     * Atomically claim the next pending or retryable failed export.
     */
    public static function claimNextPending(int $maxAttempts = 3): ?array
    {
        $pdo = Database::getPdoConnection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare(
                'SELECT * FROM ' . self::$table . '
                 WHERE (status = "pending" OR (status = "failed" AND attempts < :max_attempts))
                 ORDER BY requested_at ASC, id ASC
                 LIMIT 1
                 FOR UPDATE'
            );
            $stmt->bindValue('max_attempts', $maxAttempts, \PDO::PARAM_INT);
            $stmt->execute();
            $export = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

            if ($export === null) {
                $pdo->commit();

                return null;
            }

            $update = $pdo->prepare(
                'UPDATE ' . self::$table . '
                 SET status = "processing",
                     attempts = attempts + 1,
                     processing_started_at = UTC_TIMESTAMP(),
                     error_message = NULL
                 WHERE id = :id'
            );
            $update->execute(['id' => (int) $export['id']]);

            $pdo->commit();

            return self::getById((int) $export['id']);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            App::getInstance(true)->getLogger()->error('Failed to claim user data export: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * Mark an export as completed.
     */
    public static function markCompleted(int $id, string $filePath): bool
    {
        if ($id <= 0 || trim($filePath) === '') {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . '
             SET status = "completed",
                 file_path = :file_path,
                 error_message = NULL,
                 processed_at = UTC_TIMESTAMP()
             WHERE id = :id'
        );

        return $stmt->execute([
            'id' => $id,
            'file_path' => $filePath,
        ]);
    }

    /**
     * Mark an export as failed.
     */
    public static function markFailed(int $id, string $errorMessage): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . '
             SET status = "failed",
                 error_message = :error_message,
                 processed_at = UTC_TIMESTAMP()
             WHERE id = :id'
        );

        return $stmt->execute([
            'id' => $id,
            'error_message' => substr($errorMessage, 0, 2000),
        ]);
    }

    /**
     * Get completed or failed exports that are past their retention window.
     */
    public static function getExpiredForCleanup(int $hours = 24, int $limit = 25): array
    {
        if ($hours < 1 || $limit < 1) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . '
             WHERE status IN ("completed", "failed")
               AND COALESCE(processed_at, requested_at) < DATE_SUB(UTC_TIMESTAMP(), INTERVAL :hours HOUR)
             ORDER BY COALESCE(processed_at, requested_at) ASC, id ASC
             LIMIT :limit'
        );
        $stmt->bindValue('hours', $hours, \PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Delete an export queue row.
     */
    public static function deleteById(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }
}
