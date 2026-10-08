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
 * WebSpace schedule rows for FeatherQuilld daemon config and panel CRUD.
 */
class WebSpaceSchedule
{
    private static string $table = 'featherpanel_webspace_schedules';
    private static string $tasksTable = 'featherpanel_webspace_schedule_tasks';

    /**
     * @return list<array<string, mixed>>
     */
    public static function getActiveByWebspaceId(int $webspaceId): array
    {
        if ($webspaceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE webspace_id = :wid AND is_active = 1 ORDER BY id ASC',
        );
        $stmt->execute(['wid' => $webspaceId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $scheduleId = (int) ($row['id'] ?? 0);
            if ($scheduleId <= 0) {
                continue;
            }
            $out[] = self::toDaemonPayload($row, self::listTasks($scheduleId));
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listByWebspaceId(int $webspaceId): array
    {
        if ($webspaceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE webspace_id = :wid ORDER BY created_at DESC',
        );
        $stmt->execute(['wid' => $webspaceId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array<string, mixed>|null
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
     * @param array<string, mixed>|null $schedule
     */
    public static function isLocked(?array $schedule): bool
    {
        if ($schedule === null) {
            return false;
        }

        $value = $schedule['is_locked'] ?? 0;

        return $value === true || $value === 1 || $value === '1';
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = [
            'webspace_id',
            'name',
            'cron_day_of_week',
            'cron_month',
            'cron_day_of_month',
            'cron_hour',
            'cron_minute',
        ];

        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                return false;
            }
        }

        if ((int) $data['webspace_id'] <= 0 || !WebSpace::getById((int) $data['webspace_id'])) {
            return false;
        }

        $data['timezone'] = isset($data['timezone']) && is_string($data['timezone']) && $data['timezone'] !== ''
            ? $data['timezone']
            : 'UTC';
        $data['is_active'] = isset($data['is_active']) ? (int) (bool) $data['is_active'] : 1;
        $data['is_locked'] = isset($data['is_locked']) ? (int) (bool) $data['is_locked'] : 0;
        $data['is_processing'] = 0;
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

        $columns = array_map(static fn ($c) => $c['Field'], self::getColumns());
        $data = array_intersect_key($data, array_flip($columns));
        if ($data === []) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(static fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if (!$stmt->execute($data)) {
            return false;
        }

        return (int) $pdo->lastInsertId();
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || $data === []) {
            return false;
        }

        unset($data['id'], $data['webspace_id'], $data['is_locked']);

        $columns = array_map(static fn ($c) => $c['Field'], self::getColumns());
        $data = array_intersect_key($data, array_flip($columns));
        if ($data === []) {
            return false;
        }

        $data['updated_at'] = date('Y-m-d H:i:s');
        $pdo = Database::getPdoConnection();
        $set = implode(', ', array_map(static fn ($f) => "$f = :$f", array_keys($data)));
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id');
        $data['id'] = $id;

        return $stmt->execute($data);
    }

    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    public static function toggleActive(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET is_active = NOT is_active, updated_at = NOW() WHERE id = :id',
        );

        return $stmt->execute(['id' => $id]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listTasks(int $scheduleId): array
    {
        if ($scheduleId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$tasksTable . ' WHERE schedule_id = :sid ORDER BY sequence_id ASC',
        );
        $stmt->execute(['sid' => $scheduleId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function createTask(array $data): int | false
    {
        $required = ['schedule_id', 'sequence_id', 'action', 'payload'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return false;
            }
        }

        if ((int) $data['schedule_id'] <= 0 || !self::getById((int) $data['schedule_id'])) {
            return false;
        }

        $data['time_offset'] = isset($data['time_offset']) ? (int) $data['time_offset'] : 0;
        $data['continue_on_failure'] = isset($data['continue_on_failure']) ? (int) (bool) $data['continue_on_failure'] : 0;
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(static fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$tasksTable . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if (!$stmt->execute($data)) {
            return false;
        }

        return (int) $pdo->lastInsertId();
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function updateTask(int $id, array $data): bool
    {
        if ($id <= 0 || $data === []) {
            return false;
        }

        unset($data['id'], $data['schedule_id']);

        $columns = array_map(static fn ($c) => $c['Field'], self::getTaskColumns());
        $data = array_intersect_key($data, array_flip($columns));
        if ($data === []) {
            return false;
        }

        $data['updated_at'] = date('Y-m-d H:i:s');
        $pdo = Database::getPdoConnection();
        $set = implode(', ', array_map(static fn ($f) => "$f = :$f", array_keys($data)));
        $stmt = $pdo->prepare('UPDATE ' . self::$tasksTable . ' SET ' . $set . ' WHERE id = :id');
        $data['id'] = $id;

        return $stmt->execute($data);
    }

    public static function deleteTask(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$tasksTable . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function getTaskById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$tasksTable . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * @param array<string, mixed> $row
     * @param list<array<string, mixed>> $tasks
     *
     * @return array<string, mixed>
     */
    public static function toDaemonPayload(array $row, array $tasks): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'name' => (string) ($row['name'] ?? ''),
            'cron_minute' => (string) ($row['cron_minute'] ?? '*'),
            'cron_hour' => (string) ($row['cron_hour'] ?? '*'),
            'cron_day_of_month' => (string) ($row['cron_day_of_month'] ?? '*'),
            'cron_month' => (string) ($row['cron_month'] ?? '*'),
            'cron_day_of_week' => (string) ($row['cron_day_of_week'] ?? '*'),
            'timezone' => (string) ($row['timezone'] ?? 'UTC'),
            'is_active' => !empty($row['is_active']),
            'tasks' => array_map(static fn (array $t): array => [
                'id' => (int) ($t['id'] ?? 0),
                'sequence_id' => (int) ($t['sequence_id'] ?? 0),
                'action' => (string) ($t['action'] ?? ''),
                'payload' => (string) ($t['payload'] ?? ''),
                'time_offset' => (int) ($t['time_offset'] ?? 0),
                'continue_on_failure' => !empty($t['continue_on_failure']),
            ], $tasks),
        ];
    }

    /**
     * Clone WebPlate default schedules onto a newly created WebSpace.
     *
     * @param list<array<string, mixed>> $defaults
     *
     * @return int Number of schedules created
     */
    public static function seedFromDefaults(int $webspaceId, array $defaults): int
    {
        if ($webspaceId <= 0 || $defaults === []) {
            return 0;
        }

        $created = 0;
        foreach ($defaults as $schedule) {
            if (!is_array($schedule)) {
                continue;
            }

            $scheduleId = self::create([
                'webspace_id' => $webspaceId,
                'name' => (string) ($schedule['name'] ?? 'Schedule'),
                'cron_minute' => (string) ($schedule['cron_minute'] ?? '*'),
                'cron_hour' => (string) ($schedule['cron_hour'] ?? '*'),
                'cron_day_of_month' => (string) ($schedule['cron_day_of_month'] ?? '*'),
                'cron_month' => (string) ($schedule['cron_month'] ?? '*'),
                'cron_day_of_week' => (string) ($schedule['cron_day_of_week'] ?? '*'),
                'timezone' => (string) ($schedule['timezone'] ?? 'UTC'),
                'is_active' => array_key_exists('is_active', $schedule) ? (int) (bool) $schedule['is_active'] : 1,
                'is_locked' => array_key_exists('is_locked', $schedule) ? (int) (bool) $schedule['is_locked'] : 1,
            ]);

            if ($scheduleId === false) {
                App::getInstance(true)->getLogger()->warning(
                    'Failed to seed WebSpace schedule from WebPlate for webspace ' . $webspaceId,
                );
                continue;
            }

            $tasks = $schedule['tasks'] ?? [];
            if (is_array($tasks) && $tasks !== []) {
                if (!self::replaceTasks($scheduleId, $tasks)) {
                    self::delete($scheduleId);
                    App::getInstance(true)->getLogger()->warning(
                        'Failed to seed WebSpace schedule tasks for schedule ' . $scheduleId,
                    );
                    continue;
                }
            }

            ++$created;
        }

        return $created;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param list<array<string, mixed>> $tasks
     */
    public static function replaceTasks(int $scheduleId, array $tasks): bool
    {
        if ($scheduleId <= 0) {
            return false;
        }

        // Must use one PDO for the whole transaction — createTask() used to open a
        // second connection and deadlock on the DELETE row locks (lock wait timeout).
        $pdo = Database::getPdoConnection();
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$tasksTable . ' WHERE schedule_id = :sid');
            $stmt->execute(['sid' => $scheduleId]);

            $insert = $pdo->prepare(
                'INSERT INTO ' . self::$tasksTable .
                ' (schedule_id, sequence_id, action, payload, time_offset, continue_on_failure, created_at, updated_at)' .
                ' VALUES (:schedule_id, :sequence_id, :action, :payload, :time_offset, :continue_on_failure, :created_at, :updated_at)',
            );
            $now = date('Y-m-d H:i:s');

            foreach ($tasks as $index => $task) {
                if (!is_array($task)) {
                    continue;
                }
                $action = trim((string) ($task['action'] ?? ''));
                if ($action === '') {
                    continue;
                }
                $insert->execute([
                    'schedule_id' => $scheduleId,
                    'sequence_id' => isset($task['sequence_id']) ? (int) $task['sequence_id'] : ($index + 1),
                    'action' => $action,
                    'payload' => (string) ($task['payload'] ?? ''),
                    'time_offset' => (int) ($task['time_offset'] ?? 0),
                    'continue_on_failure' => (int) (bool) ($task['continue_on_failure'] ?? false),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $pdo->commit();

            return true;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('Failed to replace WebSpace schedule tasks: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function getTaskColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$tasksTable);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }
}
