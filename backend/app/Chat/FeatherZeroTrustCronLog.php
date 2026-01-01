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

class FeatherZeroTrustCronLog
{
    private static string $table = 'featherpanel_featherzerotrust_cron_logs';

    /**
     * Create a new cron log execution.
     *
     * @param array $data Execution data
     *
     * @return string|false Execution ID or false on failure
     */
    public static function create(array $data): string | false
    {
        $pdo = Database::getPdoConnection();

        // Generate execution ID if not provided
        if (!isset($data['execution_id'])) {
            $data['execution_id'] = 'fzt-' . time() . '-' . bin2hex(random_bytes(8));
        }

        $fields = [
            'execution_id',
            'started_at',
            'status',
            'total_servers_scanned',
            'total_detections',
            'total_errors',
            'summary',
            'details',
            'error_message',
        ];

        $insert = [];
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                if ($field === 'details' && is_array($data[$field])) {
                    $insert[$field] = json_encode($data[$field]);
                } else {
                    $insert[$field] = $data[$field];
                }
            }
        }

        if (empty($insert)) {
            return false;
        }

        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(', ', array_keys($insert)) . ') VALUES (:' . implode(', :', array_keys($insert)) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($insert)) {
            return $data['execution_id'];
        }

        return false;
    }

    /**
     * Update an existing cron log execution.
     *
     * @param string $executionId Execution ID
     * @param array $data Update data
     *
     * @return bool Success status
     */
    public static function update(string $executionId, array $data): bool
    {
        $pdo = Database::getPdoConnection();

        $allowed = [
            'completed_at',
            'status',
            'total_servers_scanned',
            'total_detections',
            'total_errors',
            'summary',
            'details',
            'error_message',
        ];

        $update = [];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                if ($field === 'details' && is_array($data[$field])) {
                    $update[$field] = json_encode($data[$field]);
                } else {
                    $update[$field] = $data[$field];
                }
            }
        }

        if (empty($update)) {
            return false;
        }

        $set = implode(', ', array_map(fn ($f) => "`$f` = :$f", array_keys($update)));
        $update['execution_id'] = $executionId;

        $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE execution_id = :execution_id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($update);
    }

    /**
     * Get all cron logs with pagination.
     *
     * @param int $limit Limit
     * @param int $offset Offset
     * @param string $status Filter by status
     *
     * @return array Cron logs
     */
    public static function getAll(int $limit = 25, int $offset = 0, ?string $status = null): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $params = [];

        if ($status !== null) {
            $sql .= ' WHERE status = :status';
            $params['status'] = $status;
        }

        $sql .= ' ORDER BY started_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Decode JSON fields
        foreach ($results as &$result) {
            if ($result['details']) {
                $result['details'] = json_decode($result['details'], true);
            }
        }

        return $results;
    }

    /**
     * Get total count of cron logs.
     *
     * @param string|null $status Filter by status
     *
     * @return int Count
     */
    public static function getCount(?string $status = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $params = [];

        if ($status !== null) {
            $sql .= ' WHERE status = :status';
            $params['status'] = $status;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get a cron log by execution ID.
     *
     * @param string $executionId Execution ID
     *
     * @return array|null Cron log or null
     */
    public static function getByExecutionId(string $executionId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE execution_id = :execution_id LIMIT 1');
        $stmt->execute(['execution_id' => $executionId]);

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($result && $result['details']) {
            $result['details'] = json_decode($result['details'], true);
        }

        return $result ?: null;
    }
}
