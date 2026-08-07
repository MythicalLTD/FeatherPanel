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
use App\Cache\Cache;

class UserDevice
{
    private static string $table = 'featherpanel_user_devices';

    /**
     * @return string[]
     */
    public static function getDeviceHashesByUserUuid(string $userUuid): array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT DISTINCT device_hash FROM ' . self::$table . ' WHERE user_uuid = :user_uuid ORDER BY device_hash'
        );
        $stmt->execute(['user_uuid' => $userUuid]);

        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'device_hash');
    }

    /**
     * @return string[]
     */
    public static function getSignalHashesByUserUuid(string $userUuid): array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT DISTINCT signal_hash FROM ' . self::$table
            . ' WHERE user_uuid = :user_uuid AND signal_hash IS NOT NULL AND signal_hash != \'\' ORDER BY signal_hash'
        );
        $stmt->execute(['user_uuid' => $userUuid]);

        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'signal_hash');
    }

    /**
     * @param string[] $deviceHashes
     *
     * @return array<int, array<string, mixed>>
     */
    public static function findUsersByDeviceHashes(array $deviceHashes, string $excludeUserUuid): array
    {
        $deviceHashes = array_values(array_unique(array_filter($deviceHashes, static fn ($h) => is_string($h) && preg_match('/^[a-f0-9]{64}$/i', $h))));
        if (empty($deviceHashes)) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $placeholders = implode(',', array_fill(0, count($deviceHashes), '?'));
        $sql = 'SELECT u.uuid, u.username, u.email, u.avatar, u.banned, u.first_ip, u.last_ip, u.last_seen, u.role_id,
                       ud.device_hash AS shared_device
                FROM ' . self::$table . ' ud
                INNER JOIN featherpanel_users u ON u.uuid = ud.user_uuid
                WHERE ud.device_hash IN (' . $placeholders . ') AND u.uuid != ?';
        $params = array_merge($deviceHashes, [$excludeUserUuid]);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * @param string[] $signalHashes
     *
     * @return array<int, array<string, mixed>>
     */
    public static function findUsersBySignalHashes(array $signalHashes, string $excludeUserUuid): array
    {
        $signalHashes = array_values(array_unique(array_filter($signalHashes, static fn ($h) => is_string($h) && preg_match('/^[a-f0-9]{64}$/i', $h))));
        if (empty($signalHashes)) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $placeholders = implode(',', array_fill(0, count($signalHashes), '?'));
        $sql = 'SELECT u.uuid, u.username, u.email, u.avatar, u.banned, u.first_ip, u.last_ip, u.last_seen, u.role_id,
                       ud.signal_hash AS shared_device
                FROM ' . self::$table . ' ud
                INNER JOIN featherpanel_users u ON u.uuid = ud.user_uuid
                WHERE ud.signal_hash IN (' . $placeholders . ') AND u.uuid != ?';
        $params = array_merge($signalHashes, [$excludeUserUuid]);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function hashClientToken(string $clientToken): string
    {
        return hash('sha256', 'fp-ui:' . strtolower(trim($clientToken)));
    }

    public static function countDistinctUsersByDeviceHash(string $deviceHash): int
    {
        if (!preg_match('/^[a-f0-9]{64}$/i', $deviceHash)) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT COUNT(DISTINCT user_uuid) FROM ' . self::$table . ' WHERE device_hash = :device_hash'
        );
        $stmt->execute(['device_hash' => $deviceHash]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Oldest account seen on this device (by first device visit).
     *
     * @return array{uuid: string, username: string, email: string}|null
     */
    public static function getMainAccountForDeviceHash(string $deviceHash): ?array
    {
        if (!preg_match('/^[a-f0-9]{64}$/i', $deviceHash)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT u.uuid, u.username, u.email, MIN(ud.first_seen) AS device_first_seen
             FROM ' . self::$table . ' ud
             INNER JOIN featherpanel_users u ON u.uuid = ud.user_uuid
             WHERE ud.device_hash = :device_hash
             GROUP BY u.uuid, u.username, u.email
             ORDER BY device_first_seen ASC
             LIMIT 1'
        );
        $stmt->execute(['device_hash' => $deviceHash]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        return [
            'uuid' => (string) $row['uuid'],
            'username' => (string) $row['username'],
            'email' => (string) $row['email'],
        ];
    }

    public static function deleteAll(): bool
    {
        try {
            $pdo = Database::getPdoConnection();

            return $pdo->exec('DELETE FROM ' . self::$table) !== false;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete all user device data: ' . $e->getMessage());

            return false;
        }
    }

    public static function trackVisit(
        string $userUuid,
        string $clientToken,
        ?array $signals,
        string $ipAddress,
        ?string $userAgent,
    ): bool {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return false;
        }

        $clientToken = trim($clientToken);
        if (!preg_match('/^[a-f0-9\-]{16,64}$/i', $clientToken)) {
            return false;
        }

        $deviceHash = self::hashClientToken($clientToken);

        // Skip the SELECT when this device was seen recently (same 10-minute window as DB throttle)
        $throttleKey = 'device_seen:' . $userUuid . ':' . $deviceHash;
        if (Cache::get($throttleKey) !== null) {
            return true;
        }

        $signalHash = null;
        $signalsJson = null;

        if (!empty($signals)) {
            ksort($signals);
            $signalHash = hash('sha256', json_encode($signals, JSON_UNESCAPED_SLASHES));
            $signalsJson = json_encode($signals, JSON_UNESCAPED_SLASHES);
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT id, last_seen FROM ' . self::$table
            . ' WHERE user_uuid = :user_uuid AND device_hash = :device_hash LIMIT 1'
        );
        $stmt->execute(['user_uuid' => $userUuid, 'device_hash' => $deviceHash]);
        $existing = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($existing) {
            $lastSeen = strtotime((string) ($existing['last_seen'] ?? ''));
            if ($lastSeen !== false && (time() - $lastSeen) < 600) {
                Cache::put($throttleKey, 1, 10);

                return true;
            }

            $update = $pdo->prepare(
                'UPDATE ' . self::$table . ' SET last_seen = NOW(), hit_count = hit_count + 1,
                 ip_address = :ip_address, user_agent = :user_agent'
                . ($signalHash !== null ? ', signal_hash = :signal_hash, signals = :signals' : '')
                . ' WHERE id = :id'
            );
            $params = [
                'id' => (int) $existing['id'],
                'ip_address' => $ipAddress !== '' ? $ipAddress : null,
                'user_agent' => $userAgent !== null && strlen($userAgent) > 512 ? substr($userAgent, 0, 512) : $userAgent,
            ];
            if ($signalHash !== null) {
                $params['signal_hash'] = $signalHash;
                $params['signals'] = $signalsJson;
            }

            $ok = $update->execute($params);
            if ($ok) {
                Cache::put($throttleKey, 1, 10);
            }

            return $ok;
        }

        $insert = $pdo->prepare(
            'INSERT INTO ' . self::$table
            . ' (user_uuid, device_hash, signal_hash, signals, ip_address, user_agent, first_seen, last_seen, hit_count)
               VALUES (:user_uuid, :device_hash, :signal_hash, :signals, :ip_address, :user_agent, NOW(), NOW(), 1)'
        );

        $ok = $insert->execute([
            'user_uuid' => $userUuid,
            'device_hash' => $deviceHash,
            'signal_hash' => $signalHash,
            'signals' => $signalsJson,
            'ip_address' => $ipAddress !== '' ? $ipAddress : null,
            'user_agent' => $userAgent !== null && strlen($userAgent) > 512 ? substr($userAgent, 0, 512) : $userAgent,
        ]);
        if ($ok) {
            Cache::put($throttleKey, 1, 10);
        }

        return $ok;
    }

    public static function deleteUserData(string $userUuid): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_uuid = :user_uuid');

            return $stmt->execute(['user_uuid' => $userUuid]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete user device data: ' . $e->getMessage());

            return false;
        }
    }
}
