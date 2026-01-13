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

namespace App\Services\FeatherZeroTrust;

use App\App;
use App\Chat\Database;

/**
 * SuspiciousFileHashService for managing suspicious file hashes in FeatherPanel database.
 */
class SuspiciousFileHashService
{
    /**
     * @var string The suspicious file hashes table name
     */
    private static string $table = 'featherpanel_suspicious_file_hashes';

    /**
     * Submit or update a hash for tracking.
     *
     * @param string $hash SHA-256 hash string
     * @param string $fileName File name
     * @param string $detectionType Detection type (e.g., "trojan", "virus", "suspicious")
     * @param string|null $serverUuid Server UUID or identifier
     * @param array<string, mixed> $metadata Additional metadata
     *
     * @return bool True on success, false on failure
     */
    public static function submitHash(
        string $hash,
        string $fileName,
        string $detectionType,
        ?string $serverUuid = null,
        array $metadata = [],
    ): bool {
        if (empty($hash) || empty($fileName) || empty($detectionType)) {
            App::getInstance(true)->getLogger()->error('Invalid hash submission: missing required fields');

            return false;
        }

        try {
            $pdo = Database::getPdoConnection();

            // Check if hash already exists
            $stmt = $pdo->prepare('SELECT id, times_detected FROM ' . self::$table . ' WHERE hash = :hash');
            $stmt->execute(['hash' => $hash]);
            $existing = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($existing) {
                // Update existing hash - increment detection count and update last_seen
                $updateData = [
                    'times_detected' => (int) $existing['times_detected'] + 1,
                    'last_seen' => date('Y-m-d H:i:s'),
                ];

                // Update optional fields if provided
                if ($serverUuid !== null) {
                    $updateData['server_uuid'] = $serverUuid;
                }
                if (!empty($metadata)) {
                    $updateData['metadata'] = json_encode($metadata);
                }

                $setClause = [];
                $params = ['id' => $existing['id']];
                foreach ($updateData as $key => $value) {
                    $setClause[] = "{$key} = :{$key}";
                    $params[$key] = $value;
                }

                $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $setClause) . ' WHERE id = :id';
                $stmt = $pdo->prepare($sql);

                return $stmt->execute($params);
            }

            // Insert new hash
            $data = [
                'hash' => $hash,
                'file_name' => $fileName,
                'detection_type' => $detectionType,
                'server_uuid' => $serverUuid,
                'times_detected' => 1,
                'confirmed_malicious' => 'false',
                'metadata' => !empty($metadata) ? json_encode($metadata) : null,
            ];

            // Add optional fields from metadata if present
            if (isset($metadata['server_name'])) {
                $data['server_name'] = $metadata['server_name'];
            }
            if (isset($metadata['node_id'])) {
                $data['node_id'] = $metadata['node_id'];
            }
            if (isset($metadata['file_path'])) {
                $data['file_path'] = $metadata['file_path'];
            }
            if (isset($metadata['file_size'])) {
                $data['file_size'] = $metadata['file_size'];
            }

            $fields = array_keys($data);
            $placeholders = array_map(fn ($f) => ':' . $f, $fields);
            $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
            $stmt = $pdo->prepare($sql);

            return $stmt->execute($data);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to submit hash to database: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Get all confirmed malicious hashes.
     *
     * @param bool $confirmedOnly Only return confirmed malicious hashes
     *
     * @return array<int, array<string, mixed>> Array of hash records
     */
    public static function getHashes(bool $confirmedOnly = false): array
    {
        try {
            $pdo = Database::getPdoConnection();

            if ($confirmedOnly) {
                $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE confirmed_malicious = "true" ORDER BY first_seen DESC');
            } else {
                $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' ORDER BY first_seen DESC');
            }

            $stmt->execute();
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Parse JSON metadata
            foreach ($results as &$result) {
                if (!empty($result['metadata'])) {
                    $result['metadata'] = json_decode($result['metadata'], true) ?? [];
                } else {
                    $result['metadata'] = [];
                }
            }

            return $results;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to get hashes from database: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Get hashes as a map for quick lookup.
     *
     * @param bool $confirmedOnly Only return confirmed malicious hashes
     *
     * @return array<string, array<string, mixed>> Hash map keyed by hash
     */
    public static function getHashesMap(bool $confirmedOnly = false): array
    {
        $hashes = self::getHashes($confirmedOnly);
        $hashMap = [];

        foreach ($hashes as $hash) {
            if (isset($hash['hash'])) {
                $hashMap[$hash['hash']] = $hash;
            }
        }

        return $hashMap;
    }

    /**
     * Check multiple hashes against the database.
     *
     * @param array<string> $hashes Array of SHA-256 hashes
     * @param bool $confirmedOnly Only check against confirmed malicious hashes
     *
     * @return array<int, array<string, mixed>> Matches found in the database
     */
    public static function checkHashes(array $hashes, bool $confirmedOnly = false): array
    {
        if (empty($hashes)) {
            return [];
        }

        try {
            $pdo = Database::getPdoConnection();
            $placeholders = implode(',', array_fill(0, count($hashes), '?'));

            $sql = 'SELECT * FROM ' . self::$table . ' WHERE hash IN (' . $placeholders . ')';
            if ($confirmedOnly) {
                $sql .= ' AND confirmed_malicious = "true"';
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($hashes);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Parse JSON metadata
            foreach ($results as &$result) {
                if (!empty($result['metadata'])) {
                    $result['metadata'] = json_decode($result['metadata'], true) ?? [];
                } else {
                    $result['metadata'] = [];
                }
            }

            return $results;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to check hashes in database: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Get statistics about the hash database.
     *
     * @return array<string, mixed> Statistics
     */
    public static function getStats(): array
    {
        try {
            $pdo = Database::getPdoConnection();

            // Total hashes
            $stmt = $pdo->query('SELECT COUNT(*) as total FROM ' . self::$table);
            $totalHashes = (int) $stmt->fetchColumn();

            // Confirmed malicious
            $stmt = $pdo->query('SELECT COUNT(*) as total FROM ' . self::$table . ' WHERE confirmed_malicious = "true"');
            $confirmedHashes = (int) $stmt->fetchColumn();

            // Unconfirmed
            $unconfirmedHashes = $totalHashes - $confirmedHashes;

            // Recent detections (last 24 hours)
            $stmt = $pdo->query('SELECT COUNT(*) as total FROM ' . self::$table . ' WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
            $recentDetections = (int) $stmt->fetchColumn();

            // Total unique servers
            $stmt = $pdo->query('SELECT COUNT(DISTINCT server_uuid) as total FROM ' . self::$table . ' WHERE server_uuid IS NOT NULL');
            $totalServers = (int) $stmt->fetchColumn();

            // Top detection types
            $stmt = $pdo->query('SELECT detection_type, COUNT(*) as count FROM ' . self::$table . ' GROUP BY detection_type ORDER BY count DESC LIMIT 10');
            $topDetectionTypes = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'totalHashes' => $totalHashes,
                'confirmedHashes' => $confirmedHashes,
                'unconfirmedHashes' => $unconfirmedHashes,
                'recentDetections' => $recentDetections,
                'totalServers' => $totalServers,
                'topDetectionTypes' => $topDetectionTypes,
            ];
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to get hash statistics: ' . $e->getMessage());

            return [
                'totalHashes' => 0,
                'confirmedHashes' => 0,
                'unconfirmedHashes' => 0,
                'recentDetections' => 0,
                'totalServers' => 0,
                'topDetectionTypes' => [],
            ];
        }
    }

    /**
     * Mark a hash as confirmed malicious.
     *
     * @param string $hash SHA-256 hash
     *
     * @return bool True on success, false on failure
     */
    public static function confirmMalicious(string $hash): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET confirmed_malicious = "true" WHERE hash = :hash');

            return $stmt->execute(['hash' => $hash]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to confirm hash as malicious: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Delete a hash from the database.
     *
     * @param string $hash SHA-256 hash
     *
     * @return bool True on success, false on failure
     */
    public static function deleteHash(string $hash): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE hash = :hash');

            return $stmt->execute(['hash' => $hash]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete hash: ' . $e->getMessage());

            return false;
        }
    }
}
