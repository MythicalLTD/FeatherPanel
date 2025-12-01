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

class FeatherZeroTrustScanLog
{
    private static string $table = 'featherpanel_featherzerotrust_scan_logs';

    /**
     * Create a new scan log entry.
     *
     * @param array $data Scan log data
     *
     * @return int|false Scan log ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $pdo = Database::getPdoConnection();

        $fields = [
            'execution_id',
            'server_uuid',
            'server_name',
            'node_id',
            'node_name',
            'status',
            'files_scanned',
            'detections_count',
            'errors_count',
            'duration_seconds',
            'detections',
            'error_message',
        ];

        $insert = [];
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                if ($field === 'detections' && is_array($data[$field])) {
                    $insert[$field] = json_encode($data[$field]);
                } else {
                    $insert[$field] = $data[$field];
                }
            }
        }

        if (empty($insert) || !isset($insert['execution_id']) || !isset($insert['server_uuid'])) {
            return false;
        }

        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(', ', array_keys($insert)) . ') VALUES (:' . implode(', :', array_keys($insert)) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Get scan logs by execution ID.
     *
     * @param string $executionId Execution ID
     *
     * @return array Scan logs
     */
    public static function getByExecutionId(string $executionId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE execution_id = :execution_id ORDER BY scanned_at DESC');
        $stmt->execute(['execution_id' => $executionId]);

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Decode JSON fields
        foreach ($results as &$result) {
            if ($result['detections']) {
                $result['detections'] = json_decode($result['detections'], true);
            }
        }

        return $results;
    }

    /**
     * Get scan logs by server UUID.
     *
     * @param string $serverUuid Server UUID
     * @param int $limit Limit
     * @param int $offset Offset
     *
     * @return array Scan logs
     */
    public static function getByServerUuid(string $serverUuid, int $limit = 25, int $offset = 0): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_uuid = :server_uuid ORDER BY scanned_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue('server_uuid', $serverUuid);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Decode JSON fields
        foreach ($results as &$result) {
            if ($result['detections']) {
                $result['detections'] = json_decode($result['detections'], true);
            }
        }

        return $results;
    }
}
