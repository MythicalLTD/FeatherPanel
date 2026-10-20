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
 * Per user notification inbox (ticket replies, backups, crashes). Rows store a kind and
 * a small data payload; the frontend builds the translated text from them.
 *
 * Read state for admin announcements lives in featherpanel_announcement_reads.
 */
class UserNotification
{
    public const KIND_TICKET_REPLY = 'ticket_reply';
    public const KIND_BACKUP_COMPLETED = 'backup_completed';
    public const KIND_BACKUP_FAILED = 'backup_failed';
    public const KIND_SERVER_CRASHED = 'server_crashed';
    public const KIND_FILE_TRANSFER_COMPLETED = 'file_transfer_completed';
    public const KIND_FILE_TRANSFER_FAILED = 'file_transfer_failed';

    public const KINDS = [
        self::KIND_TICKET_REPLY,
        self::KIND_BACKUP_COMPLETED,
        self::KIND_BACKUP_FAILED,
        self::KIND_SERVER_CRASHED,
        self::KIND_FILE_TRANSFER_COMPLETED,
        self::KIND_FILE_TRANSFER_FAILED,
    ];

    /** Read items are kept this long, unread ones three times as long. */
    public const READ_RETENTION_DAYS = 30;

    private static string $table = 'featherpanel_user_notifications';

    private static string $readsTable = 'featherpanel_announcement_reads';

    /**
     * Add a notification. With a group key, an unread item with the same key is bumped
     * (newer data, count + 1, moved to the top) instead of adding another row.
     */
    public static function notify(int $userId, string $kind, array $data, ?string $link = null, ?string $groupKey = null): int | false
    {
        if ($userId <= 0 || !in_array($kind, self::KINDS, true)) {
            return false;
        }
        $payload = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            return false;
        }
        $link = $link !== null ? mb_substr($link, 0, 255) : null;
        $groupKey = $groupKey !== null ? mb_substr($groupKey, 0, 191) : null;

        try {
            $pdo = Database::getPdoConnection();
            if ($groupKey !== null) {
                $stmt = $pdo->prepare(
                    'SELECT id FROM ' . self::$table . ' WHERE user_id = :user_id AND group_key = :group_key AND read_at IS NULL ORDER BY id DESC LIMIT 1'
                );
                $stmt->execute(['user_id' => $userId, 'group_key' => $groupKey]);
                $existing = $stmt->fetchColumn();
                if ($existing !== false) {
                    $update = $pdo->prepare(
                        'UPDATE ' . self::$table . ' SET kind = :kind, data = :data, link = :link, count = count + 1, created_at = CURRENT_TIMESTAMP WHERE id = :id'
                    );
                    $update->execute(['kind' => $kind, 'data' => $payload, 'link' => $link, 'id' => (int) $existing]);

                    return (int) $existing;
                }
            }

            $stmt = $pdo->prepare(
                'INSERT INTO ' . self::$table . ' (user_id, kind, data, link, group_key) VALUES (:user_id, :kind, :data, :link, :group_key)'
            );
            $stmt->execute([
                'user_id' => $userId,
                'kind' => $kind,
                'data' => $payload,
                'link' => $link,
                'group_key' => $groupKey,
            ]);

            return (int) $pdo->lastInsertId();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to add user notification: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Newest first.
     *
     * @return array<int, array{id: int, kind: string, data: array, link: ?string, count: int, read: bool, created_at: string}>
     */
    public static function listForUser(int $userId, int $limit = 30): array
    {
        if ($userId <= 0) {
            return [];
        }
        $limit = max(1, min(100, $limit));

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'SELECT id, kind, data, link, count, read_at, UNIX_TIMESTAMP(created_at) AS created_ts FROM ' . self::$table
                . ' WHERE user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT :limit'
            );
            $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
            $stmt->execute();

            $out = [];
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                $data = json_decode((string) $row['data'], true);
                $out[] = [
                    'id' => (int) $row['id'],
                    'kind' => (string) $row['kind'],
                    'data' => is_array($data) ? $data : [],
                    'link' => $row['link'] !== null ? (string) $row['link'] : null,
                    'count' => (int) $row['count'],
                    'read' => $row['read_at'] !== null,
                    'created_at' => gmdate('Y-m-d\\TH:i:s\\Z', (int) $row['created_ts']),
                ];
            }

            return $out;
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to list user notifications: ' . $e->getMessage());

            return [];
        }
    }

    public static function unreadCount(int $userId): int
    {
        if ($userId <= 0) {
            return 0;
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE user_id = :user_id AND read_at IS NULL');
            $stmt->execute(['user_id' => $userId]);

            return (int) $stmt->fetchColumn();
        } catch (\PDOException $e) {
            return 0;
        }
    }

    /**
     * Mark the given ids (or every item when $ids is null) as read. Only touches the user's own rows.
     *
     * @param int[]|null $ids
     */
    public static function markRead(int $userId, ?array $ids): int
    {
        if ($userId <= 0) {
            return 0;
        }

        try {
            $pdo = Database::getPdoConnection();
            if ($ids === null) {
                $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL');
                $stmt->execute([$userId]);

                return $stmt->rowCount();
            }
            $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn (int $id): bool => $id > 0)));
            if ($ids === []) {
                return 0;
            }
            $placeholders = implode(', ', array_fill(0, count($ids), '?'));
            $stmt = $pdo->prepare(
                'UPDATE ' . self::$table . ' SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL AND id IN (' . $placeholders . ')'
            );
            $stmt->execute([$userId, ...$ids]);

            return $stmt->rowCount();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to mark user notifications read: ' . $e->getMessage());

            return 0;
        }
    }

    /**
     * Admin announcements visible to the user (global or targeted), newest first, with read state.
     *
     * @return array<int, array{id: int, title: string, message: string, type: string, read: bool, created_at: string}>
     */
    public static function announcementsForUser(int $userId, int $limit = 20): array
    {
        if ($userId <= 0) {
            return [];
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'SELECT n.id, n.title, n.message_markdown, n.type, UNIX_TIMESTAMP(n.created_at) AS created_ts, r.read_at'
                . ' FROM featherpanel_notifications n'
                . ' LEFT JOIN ' . self::$readsTable . ' r ON r.notification_id = n.id AND r.user_id = :reader'
                . ' WHERE n.user_id IS NULL OR n.user_id = :user_id'
                . ' ORDER BY n.created_at DESC, n.id DESC LIMIT :limit'
            );
            $stmt->bindValue(':reader', $userId, \PDO::PARAM_INT);
            $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
            $stmt->bindValue(':limit', max(1, min(50, $limit)), \PDO::PARAM_INT);
            $stmt->execute();

            $out = [];
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                $out[] = [
                    'id' => (int) $row['id'],
                    'title' => (string) $row['title'],
                    'message' => (string) $row['message_markdown'],
                    'type' => (string) $row['type'],
                    'read' => $row['read_at'] !== null,
                    'created_at' => gmdate('Y-m-d\\TH:i:s\\Z', (int) $row['created_ts']),
                ];
            }

            return $out;
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to list announcements: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Record announcements as read. Callers pass only ids the user can see.
     *
     * @param int[] $announcementIds
     */
    public static function markAnnouncementsRead(int $userId, array $announcementIds): int
    {
        $announcementIds = array_values(array_unique(array_filter(array_map('intval', $announcementIds), static fn (int $id): bool => $id > 0)));
        if ($userId <= 0 || $announcementIds === []) {
            return 0;
        }

        try {
            $pdo = Database::getPdoConnection();
            $values = implode(', ', array_fill(0, count($announcementIds), '(?, ?)'));
            $params = [];
            foreach ($announcementIds as $id) {
                $params[] = $userId;
                $params[] = $id;
            }
            $stmt = $pdo->prepare('INSERT IGNORE INTO ' . self::$readsTable . ' (user_id, notification_id) VALUES ' . $values);
            $stmt->execute($params);

            return $stmt->rowCount();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to mark announcements read: ' . $e->getMessage());

            return 0;
        }
    }

    /** Drop read items after READ_RETENTION_DAYS and anything after three times that. */
    public static function prune(): int
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'DELETE FROM ' . self::$table . ' WHERE (read_at IS NOT NULL AND read_at < CURRENT_TIMESTAMP - INTERVAL :read_days DAY)'
                . ' OR created_at < CURRENT_TIMESTAMP - INTERVAL :days DAY'
            );
            $stmt->bindValue(':read_days', self::READ_RETENTION_DAYS, \PDO::PARAM_INT);
            $stmt->bindValue(':days', self::READ_RETENTION_DAYS * 3, \PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->rowCount();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to prune user notifications: ' . $e->getMessage());

            return 0;
        }
    }
}
