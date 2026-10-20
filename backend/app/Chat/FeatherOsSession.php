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

use App\Cache\Cache;

/**
 * Single-instance lease for FeatherOS.
 *
 * Only one active desktop session per user is allowed (across tabs and devices).
 * Clients heartbeat while open; a stale lease expires so a crashed tab cannot brick the OS.
 */
class FeatherOsSession
{
    /** Cache TTL in minutes. Heartbeat should renew well before this. */
    private const TTL_MINUTES = 2;

    /** Treat a lease as dead if the last heartbeat is older than this (seconds). */
    public const STALE_AFTER_SECONDS = 90;

    /**
     * @return array{instance_id: string, started_at: int, heartbeat_at: int, user_agent: string, label: string}|null
     */
    public static function get(int $userId): ?array
    {
        $raw = Cache::get(self::cacheKey($userId));
        if (!is_array($raw) || empty($raw['instance_id']) || !is_string($raw['instance_id'])) {
            return null;
        }
        $heartbeatAt = (int) ($raw['heartbeat_at'] ?? 0);
        if ($heartbeatAt > 0 && (time() - $heartbeatAt) > self::STALE_AFTER_SECONDS) {
            self::clear($userId);

            return null;
        }

        return [
            'instance_id' => (string) $raw['instance_id'],
            'started_at' => (int) ($raw['started_at'] ?? time()),
            'heartbeat_at' => $heartbeatAt > 0 ? $heartbeatAt : time(),
            'user_agent' => self::truncateUa((string) ($raw['user_agent'] ?? '')),
            'label' => self::truncateLabel((string) ($raw['label'] ?? 'Another session')),
        ];
    }

    /**
     * @return array{acquired: bool, stolen: bool, session: array{instance_id: string, started_at: int, heartbeat_at: int, user_agent: string, label: string}, conflict: array{instance_id: string, started_at: int, heartbeat_at: int, user_agent: string, label: string}|null}
     */
    public static function acquire(int $userId, string $instanceId, string $userAgent, string $label, bool $force = false): array
    {
        $instanceId = self::normalizeInstanceId($instanceId);
        if ($instanceId === '') {
            return [
                'acquired' => false,
                'stolen' => false,
                'session' => [
                    'instance_id' => '',
                    'started_at' => time(),
                    'heartbeat_at' => time(),
                    'user_agent' => '',
                    'label' => 'Invalid',
                ],
                'conflict' => null,
            ];
        }
        $current = self::get($userId);

        if ($current !== null && $current['instance_id'] !== $instanceId && !$force) {
            return [
                'acquired' => false,
                'stolen' => false,
                'session' => $current,
                'conflict' => $current,
            ];
        }

        $stolen = $current !== null && $current['instance_id'] !== $instanceId;
        $now = time();
        $session = [
            'instance_id' => $instanceId,
            'started_at' => ($current !== null && $current['instance_id'] === $instanceId)
                ? $current['started_at']
                : $now,
            'heartbeat_at' => $now,
            'user_agent' => self::truncateUa($userAgent),
            'label' => self::truncateLabel($label !== '' ? $label : self::labelFromUa($userAgent)),
        ];
        Cache::put(self::cacheKey($userId), $session, self::TTL_MINUTES);

        return [
            'acquired' => true,
            'stolen' => $stolen,
            'session' => $session,
            'conflict' => null,
        ];
    }

    /**
     * @return array{ok: bool, session: array{instance_id: string, started_at: int, heartbeat_at: int, user_agent: string, label: string}|null, conflict: array{instance_id: string, started_at: int, heartbeat_at: int, user_agent: string, label: string}|null}
     */
    public static function heartbeat(int $userId, string $instanceId): array
    {
        $instanceId = self::normalizeInstanceId($instanceId);
        $current = self::get($userId);
        if ($current === null) {
            return ['ok' => false, 'session' => null, 'conflict' => null];
        }
        if ($current['instance_id'] !== $instanceId) {
            return ['ok' => false, 'session' => null, 'conflict' => $current];
        }
        $current['heartbeat_at'] = time();
        Cache::put(self::cacheKey($userId), $current, self::TTL_MINUTES);

        return ['ok' => true, 'session' => $current, 'conflict' => null];
    }

    public static function release(int $userId, string $instanceId): bool
    {
        $instanceId = self::normalizeInstanceId($instanceId);
        $current = self::get($userId);
        if ($current === null) {
            return true;
        }
        if ($current['instance_id'] !== $instanceId) {
            return false;
        }
        self::clear($userId);

        return true;
    }

    public static function clear(int $userId): void
    {
        Cache::forget(self::cacheKey($userId));
    }

    private static function cacheKey(int $userId): string
    {
        return 'featheros:session:' . $userId;
    }

    private static function normalizeInstanceId(string $instanceId): string
    {
        $instanceId = trim($instanceId);
        if ($instanceId === '' || strlen($instanceId) > 64) {
            return '';
        }
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $instanceId)) {
            return '';
        }

        return $instanceId;
    }

    private static function truncateUa(string $ua): string
    {
        $ua = trim($ua);

        return substr($ua, 0, 240);
    }

    private static function truncateLabel(string $label): string
    {
        $label = trim($label);
        if ($label === '') {
            return 'Another session';
        }

        return substr($label, 0, 80);
    }

    public static function labelFromUa(string $ua): string
    {
        $ua = $ua !== '' ? $ua : 'Unknown';
        $browser = 'Browser';
        if (preg_match('/Edg\//i', $ua)) {
            $browser = 'Edge';
        } elseif (preg_match('/Chrome\//i', $ua) && !preg_match('/Chromium/i', $ua)) {
            $browser = 'Chrome';
        } elseif (preg_match('/Firefox\//i', $ua)) {
            $browser = 'Firefox';
        } elseif (preg_match('/Safari\//i', $ua) && !preg_match('/Chrome/i', $ua)) {
            $browser = 'Safari';
        }

        $os = 'device';
        if (preg_match('/Windows/i', $ua)) {
            $os = 'Windows';
        } elseif (preg_match('/Android/i', $ua)) {
            $os = 'Android';
        } elseif (preg_match('/iPhone|iPad|iPod/i', $ua)) {
            $os = 'iOS';
        } elseif (preg_match('/Mac OS X|Macintosh/i', $ua)) {
            $os = 'macOS';
        } elseif (preg_match('/Linux/i', $ua)) {
            $os = 'Linux';
        }

        return $browser . ' on ' . $os;
    }
}
