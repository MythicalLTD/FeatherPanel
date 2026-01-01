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
 * TicketAttachment service/model for CRUD operations on the featherpanel_ticket_attachments table.
 */
class TicketAttachment
{
    private static string $table = 'featherpanel_ticket_attachments';

    /**
     * Get all attachments for a ticket.
     *
     * @param int|null $ticketId Ticket ID
     * @param int|null $messageId Message ID
     * @param int $limit Number of records per page
     * @param int $offset Offset for pagination
     *
     * @return array Array of attachments
     */
    public static function getAll(
        ?int $ticketId = null,
        ?int $messageId = null,
        int $limit = 100,
        int $offset = 0,
    ): array {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($ticketId !== null) {
            $where[] = 'ticket_id = :ticket_id';
            $params['ticket_id'] = $ticketId;
        }

        if ($messageId !== null) {
            $where[] = 'message_id = :message_id';
            $params['message_id'] = $messageId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);

        if (!empty($params)) {
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value, \PDO::PARAM_INT);
            }
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get attachment by ID.
     *
     * @param int $id Attachment ID
     *
     * @return array|null Attachment data or null if not found
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
     * Get count of attachments.
     *
     * @param int|null $ticketId Filter by ticket ID
     * @param int|null $messageId Filter by message ID
     *
     * @return int Count of attachments
     */
    public static function getCount(?int $ticketId = null, ?int $messageId = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($ticketId !== null) {
            $where[] = 'ticket_id = :ticket_id';
            $params['ticket_id'] = $ticketId;
        }

        if ($messageId !== null) {
            $where[] = 'message_id = :message_id';
            $params['message_id'] = $messageId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            $stmt->execute($params);
        } else {
            $stmt->execute();
        }

        return (int) $stmt->fetchColumn();
    }

    /**
     * Create a new attachment.
     *
     * @param array $data Attachment data
     *
     * @return int|false The new attachment's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $required = ['file_name', 'file_path', 'file_size', 'file_type'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // At least one of ticket_id or message_id must be provided
        if ((!isset($data['ticket_id']) || $data['ticket_id'] === null) && (!isset($data['message_id']) || $data['message_id'] === null)) {
            App::getInstance(true)->getLogger()->error('Either ticket_id or message_id must be provided');

            return false;
        }

        // Validate ticket exists if provided
        if (isset($data['ticket_id']) && $data['ticket_id'] !== null) {
            if (!Ticket::getById($data['ticket_id'])) {
                App::getInstance(true)->getLogger()->error('Invalid ticket_id: ' . $data['ticket_id']);

                return false;
            }
        }

        // Validate message exists if provided
        if (isset($data['message_id']) && $data['message_id'] !== null) {
            if (!TicketMessage::getById($data['message_id'])) {
                App::getInstance(true)->getLogger()->error('Invalid message_id: ' . $data['message_id']);

                return false;
            }
        }

        $fields = ['ticket_id', 'message_id', 'file_name', 'file_path', 'file_size', 'file_type', 'user_downloadable'];
        $insert = [];
        foreach ($fields as $field) {
            if ($field === 'user_downloadable') {
                $insert[$field] = isset($data[$field]) ? (int) filter_var($data[$field], FILTER_VALIDATE_BOOLEAN) : 1; // Default to 1
            } elseif (($field === 'ticket_id' || $field === 'message_id') && (!isset($data[$field]) || $data[$field] === null)) {
                $insert[$field] = null;
            } else {
                $insert[$field] = $data[$field] ?? null;
            }
        }

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Update an attachment by ID.
     *
     * @param int $id Attachment ID
     * @param array $data Fields to update
     *
     * @return bool True on success, false on failure
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }

        if (empty($data)) {
            return false;
        }

        // Prevent updating primary keys
        unset($data['id']);

        $fields = ['ticket_id', 'message_id', 'file_name', 'file_path', 'file_size', 'file_type', 'user_downloadable'];
        $set = [];
        $params = ['id' => $id];

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                if ($field === 'user_downloadable') {
                    $params[$field] = (int) filter_var($data[$field], FILTER_VALIDATE_BOOLEAN);
                } else {
                    $params[$field] = $data[$field];
                }
                $set[] = "`$field` = :$field";
            }
        }

        if (empty($set)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $set) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Delete an attachment by ID.
     * This method deletes both the database record and the associated file on disk.
     * File deletion happens first to prevent orphaned files if database deletion fails.
     *
     * @param int $id Attachment ID
     *
     * @return bool True on success, false on failure
     */
    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        // Fetch the attachment record first to get the file path
        $attachment = self::getById($id);
        if (!$attachment) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fileDeleted = false;
        $filePath = null;

        // Delete the physical file first to prevent orphaned files
        if (isset($attachment['file_path']) && is_string($attachment['file_path']) && $attachment['file_path'] !== '') {
            $filePath = self::sanitizeAndResolveFilePath($attachment['file_path']);
            if ($filePath !== null && file_exists($filePath)) {
                if (@unlink($filePath)) {
                    $fileDeleted = true;
                } else {
                    // File deletion failed - log error and return false
                    App::getInstance(true)->getLogger()->error(
                        'Failed to delete attachment file: ' . $filePath . ' (ID: ' . $id . ')'
                    );

                    return false;
                }
            } elseif ($filePath === null) {
                // Invalid file path - log warning but continue with DB deletion
                App::getInstance(true)->getLogger()->warning(
                    'Invalid attachment file path for ID ' . $id . ': ' . $attachment['file_path']
                );
            }
            // If file doesn't exist, continue with DB deletion (file may have been manually deleted)
        }

        // Start transaction to delete database record
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');
            if (!$stmt->execute(['id' => $id])) {
                $pdo->rollBack();

                // If we deleted the file but DB deletion failed, log error
                if ($fileDeleted) {
                    App::getInstance(true)->getLogger()->error(
                        'Database deletion failed after file deletion for attachment ID: ' . $id
                    );
                }

                return false;
            }

            // Commit transaction
            $pdo->commit();

            return true;
        } catch (\Exception $e) {
            // Rollback transaction on any error
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            // If we deleted the file but DB deletion failed, log error
            if ($fileDeleted) {
                App::getInstance(true)->getLogger()->error(
                    'Database deletion failed after file deletion for attachment ID: ' . $id . ' - ' . $e->getMessage()
                );
            } else {
                App::getInstance(true)->getLogger()->error(
                    'Failed to delete attachment (ID: ' . $id . '): ' . $e->getMessage()
                );
            }

            return false;
        }
    }

    /**
     * Sanitize and resolve the file path to prevent directory traversal attacks.
     *
     * @param string $filePath The file path from the database (e.g., '/attachments/filename.ext')
     *
     * @return string|null The resolved absolute file path, or null if invalid
     */
    public static function sanitizeAndResolveFilePath(string $filePath): ?string
    {
        if (empty($filePath)) {
            return null;
        }

        // Normalize the path by removing leading slashes
        $normalizedPath = ltrim($filePath, '/\\');

        // Check if path starts with 'attachments/' - it should be stored as '/attachments/filename.ext'
        if (strpos($normalizedPath, 'attachments/') !== 0) {
            App::getInstance(true)->getLogger()->warning(
                'Invalid attachment file path format: ' . $filePath
            );

            return null;
        }

        // Check for path traversal attempts (even after normalization)
        if (strpos($normalizedPath, '..') !== false || strpos($normalizedPath, '../') !== false) {
            App::getInstance(true)->getLogger()->warning(
                'Path traversal detected in attachment file path: ' . $filePath
            );

            return null;
        }

        // Construct the full path
        $fullPath = APP_PUBLIC . '/' . $normalizedPath;

        // Resolve the real path to handle symlinks, normalize separators, and resolve '..' components
        $resolvedPath = realpath($fullPath);
        if ($resolvedPath === false) {
            // File doesn't exist, but path format is valid - return null
            return null;
        }

        // Ensure the resolved path is within the attachments directory
        // Use realpath to normalize the attachments directory path as well
        $attachmentsDirPath = APP_PUBLIC . '/attachments/';
        $realAttachmentsDir = realpath($attachmentsDirPath);
        if ($realAttachmentsDir === false) {
            // Attachments directory doesn't exist - this is an error condition
            App::getInstance(true)->getLogger()->warning(
                'Attachments directory does not exist: ' . $attachmentsDirPath
            );

            return null;
        }

        // Normalize directory path for comparison (ensure it ends with directory separator)
        $realAttachmentsDir = rtrim($realAttachmentsDir, '/\\') . DIRECTORY_SEPARATOR;

        // Check if the resolved path is within the attachments directory
        $normalizedResolved = $resolvedPath . (is_dir($resolvedPath) ? DIRECTORY_SEPARATOR : '');
        if (strpos($normalizedResolved, $realAttachmentsDir) !== 0) {
            App::getInstance(true)->getLogger()->warning(
                'Attachment file path outside allowed directory. Resolved: ' . $resolvedPath . ', Allowed: ' . $realAttachmentsDir
            );

            return null;
        }

        return $resolvedPath;
    }
}
