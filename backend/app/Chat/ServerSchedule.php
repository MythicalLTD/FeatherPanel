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
 * ServerSchedule service/model for CRUD operations on the featherpanel_server_schedules table.
 */
class ServerSchedule
{
    /**
     * @var string The server_schedules table name
     */
    private static string $table = 'featherpanel_server_schedules';

    /**
     * Create a new server schedule.
     *
     * @param array $data Associative array of schedule fields
     *
     * @return int|false The new schedule's ID or false on failure
     */
    public static function createSchedule(array $data): int|false
    {
        // Required fields for schedule creation
        $required = [
            'server_id',
            'name',
            'cron_day_of_week',
            'cron_month',
            'cron_day_of_month',
            'cron_hour',
            'cron_minute',
            'is_active',
            'is_processing',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for schedule: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for schedule: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if (in_array($field, ['server_id'])) {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for schedule: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } elseif (in_array($field, ['is_active', 'is_processing'])) {
                if (!is_numeric($data[$field]) || !in_array((int) $data[$field], [0, 1])) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for schedule: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if (!is_string($data[$field]) || trim($data[$field]) === '') {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for schedule: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // Validate server_id exists
        if (!Server::getServerById($data['server_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id'] . ' for schedule: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Set default values for optional fields
        $data['only_when_online'] = $data['only_when_online'] ?? 0;
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
     * Fetch a schedule by ID.
     */
    public static function getScheduleById(int $id): ?array
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
     * Get all schedules.
     */
    public static function getAllSchedules(): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get schedules by server ID.
     */
    public static function getSchedulesByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get active schedules by server ID.
     */
    public static function getActiveSchedulesByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND is_active = 1 ORDER BY created_at DESC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get schedules that are currently processing.
     */
    public static function getProcessingSchedules(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE is_processing = 1');
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get schedules that are due to run.
     */
    public static function getDueSchedules(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE is_active = 1 AND next_run_at <= NOW() AND is_processing = 0');
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Search schedules with pagination, filtering, and field selection.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for name (optional)
     * @param array $fields Fields to select (e.g. ['name', 'is_active']) (default: all)
     * @param string $sortBy Field to sort by (default: 'id')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'DESC')
     * @param int|null $serverId Filter by server ID (optional)
     * @param bool|null $isActive Filter by active status (optional)
     * @param bool|null $isProcessing Filter by processing status (optional)
     */
    public static function searchSchedules(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = [],
        string $sortBy = 'id',
        string $sortOrder = 'DESC',
        ?int $serverId = null,
        ?bool $isActive = null,
        ?bool $isProcessing = null,
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
            $where[] = 'name LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        if ($serverId !== null) {
            $where[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if ($isActive !== null) {
            $where[] = 'is_active = :is_active';
            $params['is_active'] = $isActive ? 1 : 0;
        }

        if ($isProcessing !== null) {
            $where[] = 'is_processing = :is_processing';
            $params['is_processing'] = $isProcessing ? 1 : 0;
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
     * Update a schedule by ID.
     */
    public static function updateSchedule(int $id, array $data): bool
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
            App::getInstance(true)->getLogger()->error('Failed to update schedule: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update a schedule's processing status.
     */
    public static function updateProcessingStatus(int $id, bool $isProcessing): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET is_processing = :is_processing, updated_at = NOW() WHERE id = :id');
            $stmt->bindValue(':is_processing', $isProcessing ? 1 : 0, \PDO::PARAM_INT);
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);

            return $stmt->execute();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update schedule processing status: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update a schedule's last run time.
     */
    public static function updateLastRunTime(int $id, ?string $lastRunAt = null): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            $pdo = Database::getPdoConnection();
            $timestamp = $lastRunAt ?: date('Y-m-d H:i:s');
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET last_run_at = :last_run_at, updated_at = NOW() WHERE id = :id');
            $stmt->bindValue(':last_run_at', $timestamp, \PDO::PARAM_STR);
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);

            return $stmt->execute();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update schedule last run time: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update a schedule's next run time.
     */
    public static function updateNextRunTime(int $id, ?string $nextRunAt = null): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            $pdo = Database::getPdoConnection();
            $timestamp = $nextRunAt ?: date('Y-m-d H:i:s');
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET next_run_at = :next_run_at, updated_at = NOW() WHERE id = :id');
            $stmt->bindValue(':next_run_at', $timestamp, \PDO::PARAM_STR);
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);

            return $stmt->execute();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update schedule next run time: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Toggle a schedule's active status.
     */
    public static function toggleActiveStatus(int $id): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET is_active = NOT is_active, updated_at = NOW() WHERE id = :id');
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);

            return $stmt->execute();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to toggle schedule active status: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Delete a schedule.
     */
    public static function deleteSchedule(int $id): bool
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
     * Delete all schedules for a server.
     */
    public static function deleteSchedulesByServerId(int $serverId): bool
    {
        if ($serverId <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE server_id = :server_id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['server_id' => $serverId]);
    }

    /**
     * Get schedule with related server data.
     */
    public static function getScheduleWithServer(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT s.*, sr.name as server_name, sr.uuid as server_uuid 
                FROM ' . self::$table . ' s 
                LEFT JOIN featherpanel_servers sr ON s.server_id = sr.id 
                WHERE s.id = :id LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get schedules with related server data for a specific server.
     */
    public static function getSchedulesWithServerByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT s.*, sr.name as server_name, sr.uuid as server_uuid 
                FROM ' . self::$table . ' s 
                LEFT JOIN featherpanel_servers sr ON s.server_id = sr.id 
                WHERE s.server_id = :server_id 
                ORDER BY s.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['server_id' => $serverId]);

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
     * Validate cron expression components.
     */
    public static function validateCronExpression(string $dayOfWeek, string $month, string $dayOfMonth, string $hour, string $minute): bool
    {
        // Validate each component using proper cron validation
        return self::validateCronField($minute, 0, 59)
            && self::validateCronField($hour, 0, 23)
            && self::validateCronField($dayOfMonth, 1, 31)
            && self::validateCronField($month, 1, 12)
            && self::validateCronField($dayOfWeek, 0, 7);
    }

    /**
     * Calculate next run time based on cron expression.
     */
    public static function calculateNextRunTime(string $dayOfWeek, string $month, string $dayOfMonth, string $hour, string $minute): string
    {
        $now = new \DateTime();
        $nextRun = clone $now;

        // Start with current time and find the next valid time
        $found = false;
        $attempts = 0;
        $maxAttempts = 1000; // Prevent infinite loops

        while (!$found && $attempts < $maxAttempts) {
            ++$attempts;

            // Check if current time matches all cron fields
            if (self::timeMatchesCron($nextRun, $dayOfWeek, $month, $dayOfMonth, $hour, $minute)) {
                // If it's in the future, we found our time
                if ($nextRun > $now) {
                    $found = true;
                    break;
                }
            }

            // Move to next minute
            $nextRun->add(new \DateInterval('PT1M'));
        }

        // If we couldn't find a valid time, default to 1 hour from now
        if (!$found) {
            $nextRun = clone $now;
            $nextRun->add(new \DateInterval('PT1H'));
        }

        return $nextRun->format('Y-m-d H:i:s');
    }

    /**
     * Validate a single cron field.
     */
    private static function validateCronField(string $field, int $min, int $max): bool
    {
        // Handle wildcard
        if ($field === '*') {
            return true;
        }

        // Handle step values (e.g., */5, */15)
        if (preg_match('/^\*\/(\d+)$/', $field, $matches)) {
            $step = (int) $matches[1];

            return $step > 0 && $step <= ($max - $min + 1);
        }

        // Handle ranges (e.g., 1-5, 0-6)
        if (preg_match('/^(\d+)-(\d+)$/', $field, $matches)) {
            $start = (int) $matches[1];
            $end = (int) $matches[2];

            return $start >= $min && $end <= $max && $start <= $end;
        }

        // Handle ranges with step (e.g., 1-5/2)
        if (preg_match('/^(\d+)-(\d+)\/(\d+)$/', $field, $matches)) {
            $start = (int) $matches[1];
            $end = (int) $matches[2];
            $step = (int) $matches[3];

            return $start >= $min && $end <= $max && $start <= $end && $step > 0;
        }

        // Handle comma-separated values (e.g., 1,3,5)
        if (strpos($field, ',') !== false) {
            $values = explode(',', $field);
            foreach ($values as $value) {
                if (!self::validateCronField(trim($value), $min, $max)) {
                    return false;
                }
            }

            return true;
        }

        // Handle single numeric value
        if (is_numeric($field)) {
            $value = (int) $field;

            return $value >= $min && $value <= $max;
        }

        // Handle special values for day of week (0 and 7 both represent Sunday)
        if ($min === 0 && $max === 7 && ($field === '0' || $field === '7')) {
            return true;
        }

        return false;
    }

    /**
     * Check if a specific time matches the cron expression.
     */
    private static function timeMatchesCron(\DateTime $time, string $dayOfWeek, string $month, string $dayOfMonth, string $hour, string $minute): bool
    {
        return self::cronFieldMatches($time->format('i'), $minute, 0, 59)
            && self::cronFieldMatches($time->format('H'), $hour, 0, 23)
            && self::cronFieldMatches($time->format('j'), $dayOfMonth, 1, 31)
            && self::cronFieldMatches($time->format('n'), $month, 1, 12)
            && self::cronFieldMatches($time->format('w'), $dayOfWeek, 0, 7);
    }

    /**
     * Check if a value matches a cron field.
     */
    private static function cronFieldMatches(string $value, string $cronField, int $min, int $max): bool
    {
        $numValue = (int) $value;

        // Handle wildcard
        if ($cronField === '*') {
            return true;
        }

        // Handle step values (e.g., */5)
        if (preg_match('/^\*\/(\d+)$/', $cronField, $matches)) {
            $step = (int) $matches[1];

            return $numValue % $step === 0;
        }

        // Handle ranges (e.g., 1-5)
        if (preg_match('/^(\d+)-(\d+)$/', $cronField, $matches)) {
            $start = (int) $matches[1];
            $end = (int) $matches[2];

            return $numValue >= $start && $numValue <= $end;
        }

        // Handle ranges with step (e.g., 1-5/2)
        if (preg_match('/^(\d+)-(\d+)\/(\d+)$/', $cronField, $matches)) {
            $start = (int) $matches[1];
            $end = (int) $matches[2];
            $step = (int) $matches[3];

            return $numValue >= $start && $numValue <= $end && ($numValue - $start) % $step === 0;
        }

        // Handle comma-separated values (e.g., 1,3,5)
        if (strpos($cronField, ',') !== false) {
            $values = explode(',', $cronField);
            foreach ($values as $cronValue) {
                if (self::cronFieldMatches($value, trim($cronValue), $min, $max)) {
                    return true;
                }
            }

            return false;
        }

        // Handle single numeric value
        if (is_numeric($cronField)) {
            return $numValue === (int) $cronField;
        }

        // Handle special values for day of week (0 and 7 both represent Sunday)
        if ($min === 0 && $max === 7 && ($cronField === '0' || $cronField === '7')) {
            return $numValue === 0 || $numValue === 7;
        }

        return false;
    }

    /**
     * Sanitize data for logging (remove sensitive fields).
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = ['password', 'remember_token', 'two_fa_key'];
        $sanitized = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }
}
