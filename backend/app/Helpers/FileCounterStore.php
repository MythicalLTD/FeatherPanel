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

namespace App\Helpers;

use App\App;

/**
 * Tiny file-backed counter/lock store used when Redis is unavailable.
 *
 * The panel uses Redis as its counter store (rate limiting, login lockout).
 * If Redis is missing the previous behaviour was to skip every limit, which
 * turned a Redis outage into an open door for password guessing. This store
 * keeps those counters working without adding a dependency: one JSON file per
 * key under storage/caches/security-store, updated under an exclusive lock.
 *
 * It is intentionally small and self-cleaning (expired files are rewritten or
 * removed on access). If the directory is not writable the store reports
 * "unavailable" and callers keep their previous fail-open behaviour instead of
 * breaking authentication.
 */
class FileCounterStore
{
    /** Roughly 1 in N writes triggers a sweep of expired counter files. */
    private const CLEANUP_EVERY = 100;
    /** @var string|null */
    private static $directory;

    /** @var bool|null Cached writability probe. */
    private static $writable;

    /**
     * Whether the file store can be used at all.
     */
    public static function available(): bool
    {
        if (self::$writable !== null) {
            return self::$writable;
        }

        $directory = self::directory();
        if ($directory === '') {
            return self::$writable = false;
        }

        if (!is_dir($directory)) {
            @mkdir($directory, 0o700, true);
        }

        self::$writable = is_dir($directory) && is_writable($directory);

        return self::$writable;
    }

    /**
     * Increment a counter and return the new value. The TTL is only applied on
     * creation, so a burst of failures does not extend the window.
     */
    public static function increment(string $key, int $ttlSeconds): int
    {
        if (!self::available()) {
            return 0;
        }

        return (int) self::mutate($key, static function (array $state) use ($ttlSeconds): array {
            $now = time();
            if ($state['expires_at'] === 0 || $state['expires_at'] <= $now) {
                $state['count'] = 0;
                $state['expires_at'] = $now + max(1, $ttlSeconds);
            }
            ++$state['count'];

            return $state;
        });
    }

    /**
     * Current counter value (0 when missing or expired).
     */
    public static function get(string $key): int
    {
        if (!self::available()) {
            return 0;
        }

        $state = self::read($key);
        if ($state === null) {
            return 0;
        }

        if ($state['expires_at'] !== 0 && $state['expires_at'] <= time()) {
            self::delete($key);

            return 0;
        }

        return $state['count'];
    }

    /**
     * Remaining TTL in seconds, 0 when the key does not exist.
     */
    public static function ttl(string $key): int
    {
        if (!self::available()) {
            return 0;
        }

        $state = self::read($key);
        if ($state === null || $state['expires_at'] === 0) {
            return 0;
        }

        $remaining = $state['expires_at'] - time();

        return $remaining > 0 ? $remaining : 0;
    }

    /**
     * Set a key with a TTL (used for lock flags).
     */
    public static function setEx(string $key, int $ttlSeconds): void
    {
        if (!self::available()) {
            return;
        }

        self::mutate($key, static function () use ($ttlSeconds): array {
            return [
                'count' => 1,
                'expires_at' => time() + max(1, $ttlSeconds),
            ];
        });
    }

    /**
     * Whether a key exists and has not expired.
     */
    public static function exists(string $key): bool
    {
        return self::ttl($key) > 0;
    }

    /**
     * Delete one or more keys.
     *
     * @param string|list<string> $keys
     */
    public static function delete(string | array $keys): void
    {
        if (!self::available()) {
            return;
        }

        foreach ((array) $keys as $key) {
            $path = self::pathFor((string) $key);
            if ($path !== '' && is_file($path)) {
                @unlink($path);
            }
        }
    }

    private static function directory(): string
    {
        if (self::$directory !== null) {
            return self::$directory;
        }

        $base = defined('APP_CACHE_DIR') ? (string) APP_CACHE_DIR : dirname(__DIR__, 2) . '/storage/caches';
        if ($base === '') {
            return self::$directory = '';
        }

        return self::$directory = rtrim($base, '/') . '/security-store';
    }

    private static function pathFor(string $key): string
    {
        $directory = self::directory();
        if ($directory === '') {
            return '';
        }

        return $directory . '/' . hash('sha256', $key) . '.json';
    }

    /**
     * Read the raw state of a key.
     *
     * @return array{count: int, expires_at: int}|null
     */
    private static function read(string $key): ?array
    {
        $path = self::pathFor($key);
        if ($path === '' || !is_file($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        return [
            'count' => max(0, (int) ($decoded['count'] ?? 0)),
            'expires_at' => max(0, (int) ($decoded['expires_at'] ?? 0)),
        ];
    }

    /**
     * Apply a mutation under an exclusive lock and return the new count.
     *
     * @param callable(array{count: int, expires_at: int}):array{count: int, expires_at: int} $mutator
     */
    private static function mutate(string $key, callable $mutator): int
    {
        $path = self::pathFor($key);
        if ($path === '') {
            return 0;
        }

        $handle = @fopen($path, 'c+');
        if ($handle === false) {
            self::logOnce('File counter store is not writable: ' . $path);

            return 0;
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                return 0;
            }

            $raw = stream_get_contents($handle);
            $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
            $state = [
                'count' => is_array($decoded) ? max(0, (int) ($decoded['count'] ?? 0)) : 0,
                'expires_at' => is_array($decoded) ? max(0, (int) ($decoded['expires_at'] ?? 0)) : 0,
            ];

            $state = $mutator($state);

            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode($state, JSON_THROW_ON_ERROR));
            fflush($handle);
            flock($handle, LOCK_UN);

            @chmod($path, 0o600);

            // Probabilistic cleanup so expired files for untouched keys do not linger.
            if (random_int(1, self::CLEANUP_EVERY) === 1) {
                self::sweepExpired();
            }

            return $state['count'];
        } catch (\Throwable $e) {
            return 0;
        } finally {
            fclose($handle);
        }
    }

    /**
     * Delete counter files whose expiration has passed.
     */
    private static function sweepExpired(): void
    {
        $directory = self::directory();
        if ($directory === '' || !is_dir($directory)) {
            return;
        }

        $now = time();
        $files = @scandir($directory);
        if (!is_array($files)) {
            return;
        }

        foreach ($files as $file) {
            if (!str_ends_with($file, '.json')) {
                continue;
            }
            $candidate = $directory . '/' . $file;
            if (!is_file($candidate)) {
                continue;
            }

            $raw = @file_get_contents($candidate);
            if (!is_string($raw) || $raw === '') {
                @unlink($candidate);
                continue;
            }

            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                @unlink($candidate);
                continue;
            }

            $expiresAt = max(0, (int) ($decoded['expires_at'] ?? 0));
            if ($expiresAt > 0 && $expiresAt <= $now) {
                @unlink($candidate);
            }
        }
    }

    private static function logOnce(string $message): void
    {
        static $logged = false;
        if ($logged) {
            return;
        }
        $logged = true;

        try {
            App::getInstance(true)->getLogger()->warning($message);
        } catch (\Throwable $e) {
            // Logging must never break authentication.
        }
    }
}
