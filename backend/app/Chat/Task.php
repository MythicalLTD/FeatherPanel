<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
 * Task service/model for CRUD operations on the featherpanel_server_schedules_tasks table.
 */
class Task
{
    /**
     * @var string The tasks table name
     */
    private static string $table = 'featherpanel_server_schedules_tasks';

    /**
     * Create a new task.
     *
     * @param array $data Associative array of task fields
     *
     * @return int|false The new task's ID or false on failure
     */
    public static function createTask(array $data): int | false
    {
        // Required fields for task creation
        $required = [
            'schedule_id',
            'sequence_id',
            'action',
            'payload',
            'time_offset',
            'is_queued',
            'continue_on_failure',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for task: ' . $data['action'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for task: ' . $data['action'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if (in_array($field, ['schedule_id', 'sequence_id'])) {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for task: ' . $data['action'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } elseif ($field === 'time_offset') {
                if (!is_numeric($data[$field]) || (int) $data[$field] < 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for task: ' . $data['action'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } elseif (in_array($field, ['is_queued', 'continue_on_failure'])) {
                if (!is_numeric($data[$field]) || !in_array((int) $data[$field], [0, 1])) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for task: ' . $data['action'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if ($field === 'payload') {
                    if (!is_string($data[$field])) {
                        $sanitizedData = self::sanitizeDataForLogging($data);
                        App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for task: ' . $data['action'] . ' with data: ' . json_encode($sanitizedData));

                        return false;
                    }
                } else {
                    if (!is_string($data[$field]) || trim($data[$field]) === '') {
                        $sanitizedData = self::sanitizeDataForLogging($data);
                        App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for task: ' . $data['action'] . ' with data: ' . json_encode($sanitizedData));

                        return false;
                    }
                }
            }
        }

        // Validate schedule_id exists
        if (!ServerSchedule::getScheduleById($data['schedule_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid schedule_id: ' . $data['schedule_id'] . ' for task: ' . $data['action'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Set default values for optional fields
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

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
     * Fetch a task by ID.
     */
    public static function getTaskById(int $id): ?array
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
     * Get all tasks.
     */
    public static function getAllTasks(): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table . ' ORDER BY schedule_id, sequence_id';
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get tasks by schedule ID.
     */
    public static function getTasksByScheduleId(int $scheduleId): array
    {
        if ($scheduleId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE schedule_id = :schedule_id ORDER BY sequence_id ASC');
        $stmt->execute(['schedule_id' => $scheduleId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get tasks by action type.
     */
    public static function getTasksByAction(string $action): array
    {
        if (empty($action)) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE action = :action ORDER BY schedule_id, sequence_id');
        $stmt->execute(['action' => $action]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get queued tasks.
     */
    public static function getQueuedTasks(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE is_queued = 1 ORDER BY schedule_id, sequence_id');
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get tasks that are ready to execute (not queued and due).
     */
    public static function getReadyTasks(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE is_queued = 0 ORDER BY schedule_id, sequence_id');
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Search tasks with pagination, filtering, and field selection.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for action or payload (optional)
     * @param array $fields Fields to select (e.g. ['action', 'is_queued']) (default: all)
     * @param string $sortBy Field to sort by (default: 'id')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'ASC')
     * @param int|null $scheduleId Filter by schedule ID (optional)
     * @param string|null $action Filter by action type (optional)
     * @param bool|null $isQueued Filter by queued status (optional)
     */
    public static function searchTasks(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = [],
        string $sortBy = 'id',
        string $sortOrder = 'ASC',
        ?int $scheduleId = null,
        ?string $action = null,
        ?bool $isQueued = null,
    ): array {
        $pdo = Database::getPdoConnection();

        if (empty($fields)) {
            $selectFields = '*';
        } else {
            $selectFields = implode(', ', $fields);
        }

        $sql = "SELECT $selectFields FROM " . self::$table;
        $where = [];
        $params = [];

        if (!empty($search)) {
            $where[] = '(action LIKE :search OR payload LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($scheduleId !== null) {
            $where[] = 'schedule_id = :schedule_id';
            $params['schedule_id'] = $scheduleId;
        }

        if ($action !== null) {
            $where[] = 'action = :action';
            $params['action'] = $action;
        }

        if ($isQueued !== null) {
            $where[] = 'is_queued = :is_queued';
            $params['is_queued'] = $isQueued ? 1 : 0;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= " ORDER BY $sortBy $sortOrder";
        $offset = max(0, ($page - 1) * $limit);
        $sql .= ' LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value, \PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', (int) $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int) $offset, \PDO::PARAM_INT);

        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Update a task by ID.
     */
    public static function updateTask(int $id, array $data): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update');

                return false;
            }
            // Prevent updating primary key/id
            if (isset($data['id'])) {
                unset($data['id']);
            }
            $columns = self::getColumns();
            $columns = array_map(fn ($c) => $c['Field'], $columns);
            $missing = array_diff(array_keys($data), $columns);
            if (!empty($missing)) {
                App::getInstance(true)->getLogger()->error('Missing fields: ' . implode(', ', $missing));

                return false;
            }
            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            if (empty($fields)) {
                App::getInstance(true)->getLogger()->error('No fields to update');

                return false;
            }
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $data['id'] = $id;

            return $stmt->execute($data);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to update task: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update a task's queued status.
     */
    public static function updateQueuedStatus(int $id, bool $isQueued): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET is_queued = :is_queued, updated_at = NOW() WHERE id = :id');
            $stmt->bindValue(':is_queued', $isQueued ? 1 : 0, \PDO::PARAM_INT);
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);

            return $stmt->execute();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update task queued status: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update task sequence order with automatic reordering of other tasks.
     */
    public static function updateSequenceOrder(int $id, int $newSequenceId): bool
    {
        try {
            if ($id <= 0 || $newSequenceId <= 0) {
                return false;
            }

            $pdo = Database::getPdoConnection();
            $pdo->beginTransaction();

            // Get the current task and its schedule_id
            $stmt = $pdo->prepare('SELECT schedule_id, sequence_id FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $id]);
            $currentTask = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$currentTask) {
                $pdo->rollBack();

                return false;
            }

            $scheduleId = $currentTask['schedule_id'];
            $oldSequenceId = $currentTask['sequence_id'];

            // If moving to the same position, no need to reorder
            if ($oldSequenceId === $newSequenceId) {
                $pdo->commit();

                return true;
            }

            // Update the current task to the new sequence_id
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET sequence_id = :sequence_id, updated_at = NOW() WHERE id = :id');
            $stmt->bindValue(':sequence_id', $newSequenceId, \PDO::PARAM_INT);
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);

            if (!$stmt->execute()) {
                $pdo->rollBack();

                return false;
            }

            // Reorder other tasks based on the direction of movement
            if ($oldSequenceId < $newSequenceId) {
                // Moving down: shift tasks between old and new position up by 1
                $stmt = $pdo->prepare('
					UPDATE ' . self::$table . ' 
					SET sequence_id = sequence_id - 1, updated_at = NOW() 
					WHERE schedule_id = :schedule_id 
					AND sequence_id > :old_sequence 
					AND sequence_id <= :new_sequence 
					AND id != :task_id
				');
                $stmt->bindValue(':schedule_id', $scheduleId, \PDO::PARAM_INT);
                $stmt->bindValue(':old_sequence', $oldSequenceId, \PDO::PARAM_INT);
                $stmt->bindValue(':new_sequence', $newSequenceId, \PDO::PARAM_INT);
                $stmt->bindValue(':task_id', $id, \PDO::PARAM_INT);
            } else {
                // Moving up: shift tasks between new and old position down by 1
                $stmt = $pdo->prepare('
					UPDATE ' . self::$table . ' 
					SET sequence_id = sequence_id + 1, updated_at = NOW() 
					WHERE schedule_id = :schedule_id 
					AND sequence_id >= :new_sequence 
					AND sequence_id < :old_sequence 
					AND id != :task_id
				');
                $stmt->bindValue(':schedule_id', $scheduleId, \PDO::PARAM_INT);
                $stmt->bindValue(':new_sequence', $newSequenceId, \PDO::PARAM_INT);
                $stmt->bindValue(':old_sequence', $oldSequenceId, \PDO::PARAM_INT);
                $stmt->bindValue(':task_id', $id, \PDO::PARAM_INT);
            }

            if (!$stmt->execute()) {
                $pdo->rollBack();

                return false;
            }

            $pdo->commit();

            return true;
        } catch (\Exception $e) {
            if (isset($pdo)) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('Failed to update task sequence order: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Delete a task.
     */
    public static function deleteTask(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Delete all tasks for a schedule.
     */
    public static function deleteTasksByScheduleId(int $scheduleId): bool
    {
        if ($scheduleId <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE schedule_id = :schedule_id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['schedule_id' => $scheduleId]);
    }

    /**
     * Get task with related schedule data.
     */
    public static function getTaskWithSchedule(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT t.*, s.name as schedule_name, s.cron_minute, s.cron_hour, s.cron_day_of_month, s.cron_month, s.cron_day_of_week 
                FROM ' . self::$table . ' t 
                LEFT JOIN featherpanel_server_schedules s ON t.schedule_id = s.id 
                WHERE t.id = :id LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get tasks with related schedule data for a specific schedule.
     */
    public static function getTasksWithScheduleByScheduleId(int $scheduleId): array
    {
        if ($scheduleId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT t.*, s.name as schedule_name, s.cron_minute, s.cron_hour, s.cron_day_of_month, s.cron_month, s.cron_day_of_week 
                FROM ' . self::$table . ' t 
                LEFT JOIN featherpanel_server_schedules s ON t.schedule_id = s.id 
                WHERE t.schedule_id = :schedule_id 
                ORDER BY t.sequence_id ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['schedule_id' => $scheduleId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get table columns.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Validate task action.
     */
    public static function validateAction(string $action): bool
    {
        $validActions = ['power', 'backup', 'command', 'restart', 'kill', 'install', 'update'];

        return in_array($action, $validActions);
    }

    /**
     * Get next sequence ID for a schedule.
     */
    public static function getNextSequenceId(int $scheduleId): int
    {
        if ($scheduleId <= 0) {
            return 1;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT MAX(sequence_id) as max_sequence FROM ' . self::$table . ' WHERE schedule_id = :schedule_id');
        $stmt->execute(['schedule_id' => $scheduleId]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return ($result['max_sequence'] ?? 0) + 1;
    }

    /**
     * Get maximum sequence ID for a schedule.
     */
    public static function getMaxSequenceId(int $scheduleId): int
    {
        if ($scheduleId <= 0) {
            return 0;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT MAX(sequence_id) as max_sequence FROM ' . self::$table . ' WHERE schedule_id = :schedule_id');
        $stmt->execute(['schedule_id' => $scheduleId]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return (int) ($result['max_sequence'] ?? 0);
    }

    /**
     * Reorder tasks for a schedule after deletion.
     */
    public static function reorderTasks(int $scheduleId): bool
    {
        try {
            $tasks = self::getTasksByScheduleId($scheduleId);
            if (empty($tasks)) {
                return true;
            }

            $pdo = Database::getPdoConnection();
            $pdo->beginTransaction();

            foreach ($tasks as $index => $task) {
                $newSequenceId = $index + 1;
                if ($task['sequence_id'] != $newSequenceId) {
                    $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET sequence_id = :sequence_id, updated_at = NOW() WHERE id = :id');
                    $stmt->bindValue(':sequence_id', $newSequenceId, \PDO::PARAM_INT);
                    $stmt->bindValue(':id', $task['id'], \PDO::PARAM_INT);
                    if (!$stmt->execute()) {
                        $pdo->rollBack();

                        return false;
                    }
                }
            }

            $pdo->commit();

            return true;
        } catch (\Exception $e) {
            if (isset($pdo)) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('Failed to reorder tasks: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Sanitize data for logging (remove sensitive fields).
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = ['password', 'remember_token', 'two_fa_key', 'payload'];
        $sanitized = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }
}
