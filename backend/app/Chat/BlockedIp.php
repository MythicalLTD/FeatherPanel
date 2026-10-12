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
use App\Helpers\IpAddressMatcher;

/**
 * Persisted panel IP blocklist used to prevent new account registration.
 */
class BlockedIp
{
    private static string $table = 'featherpanel_blocked_ips';

    /**
     * Normalize and validate a single IP or CIDR rule for storage.
     */
    public static function normalizeIpInput(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '' || strlen($raw) > 64) {
            return null;
        }
        if (!IpAddressMatcher::isValidIpOrCidr($raw)) {
            return null;
        }
        if (str_contains($raw, '/')) {
            [$ip, $prefix] = explode('/', $raw, 2);
            $normalizedIp = self::canonicalizeIp($ip);
            if ($normalizedIp === null) {
                return null;
            }

            return $normalizedIp . '/' . (int) $prefix;
        }

        return self::canonicalizeIp($raw);
    }

    /**
     * Parse a timestring like 1m, 1h, 24h, 7d, 1w, 1h30m into seconds.
     * Empty / permanent / 0 = permanent (null seconds).
     *
     * @return int|null Seconds, or null for permanent
     */
    public static function parseDurationTimestring(string $raw): int | false | null
    {
        $raw = strtolower(trim($raw));
        if ($raw === '' || $raw === 'permanent' || $raw === '0') {
            return null;
        }

        if (!preg_match_all('/(\d+)([smhdwy])/', $raw, $matches, PREG_SET_ORDER)) {
            return false;
        }

        $consumed = '';
        foreach ($matches as $m) {
            $consumed .= $m[0];
        }
        if ($consumed !== $raw) {
            return false;
        }

        $seconds = 0;
        foreach ($matches as $m) {
            $n = (int) $m[1];
            if ($n <= 0) {
                return false;
            }
            $seconds += match ($m[2]) {
                's' => $n,
                'm' => $n * 60,
                'h' => $n * 3600,
                'd' => $n * 86400,
                'w' => $n * 604800,
                'y' => $n * 31536000,
                default => 0,
            };
        }

        if ($seconds <= 0) {
            return false;
        }

        // Cap at ~10 years to avoid absurd DATETIME values
        if ($seconds > 315360000) {
            return false;
        }

        return $seconds;
    }

    /**
     * Resolve expiry from a timestring duration or an explicit expires_at string.
     *
     * @return array{expires_at: ?string}|array{error: string, code: string}
     */
    public static function resolveExpiresAt(?string $duration = null, ?string $expiresAt = null, ?int $now = null): array
    {
        $now = $now ?? time();

        if ($expiresAt !== null && trim($expiresAt) !== '') {
            $ts = strtotime(trim($expiresAt));
            if ($ts === false) {
                return ['error' => 'Invalid expires_at timestamp', 'code' => 'INVALID_EXPIRES_AT'];
            }
            if ($ts <= $now) {
                return ['error' => 'expires_at must be in the future', 'code' => 'EXPIRES_AT_IN_PAST'];
            }

            return ['expires_at' => gmdate('Y-m-d H:i:s', $ts)];
        }

        $parsed = self::parseDurationTimestring($duration ?? '');
        if ($parsed === false) {
            return [
                'error' => 'Invalid duration. Use a timestring like 1m, 1h, 24h, 7d, 1w (or leave empty for permanent)',
                'code' => 'INVALID_DURATION',
            ];
        }
        if ($parsed === null) {
            return ['expires_at' => null];
        }

        return ['expires_at' => gmdate('Y-m-d H:i:s', $now + $parsed)];
    }

    public static function isActive(?string $expiresAt, ?int $now = null): bool
    {
        if ($expiresAt === null || trim($expiresAt) === '') {
            return true;
        }
        $ts = strtotime($expiresAt);
        if ($ts === false) {
            return false;
        }

        return $ts > ($now ?? time());
    }

    /**
     * Whether a stored row matches the client IP (ignores expiry).
     *
     * @param array{ip?: string} $row
     */
    public static function rowMatchesClient(array $row, string $clientIp): bool
    {
        $rule = trim((string) ($row['ip'] ?? ''));
        if ($rule === '' || !filter_var($clientIp, \FILTER_VALIDATE_IP)) {
            return false;
        }

        return IpAddressMatcher::matchesRule($clientIp, $rule);
    }

    /**
     * Find the first active ban matching the client IP.
     *
     * @return array<string, mixed>|null
     */
    public static function findActiveMatch(string $clientIp): ?array
    {
        $clientIp = trim($clientIp);
        if ($clientIp === '' || !filter_var($clientIp, \FILTER_VALIDATE_IP)) {
            return null;
        }

        foreach (self::getActiveRows() as $row) {
            if (self::rowMatchesClient($row, $clientIp) && self::isActive($row['expires_at'] ?? null)) {
                return $row;
            }
        }

        return null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function getActiveRows(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query(
            'SELECT `id`, `ip`, `reason`, `expires_at`, `created_by_uuid`, `created_at` FROM ' . self::$table
            . ' WHERE `expires_at` IS NULL OR `expires_at` > UTC_TIMESTAMP()'
            . ' ORDER BY `id` ASC'
        );
        if ($stmt === false) {
            return [];
        }

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function search(int $page = 1, int $limit = 20, string $search = '', bool $activeOnly = false): array
    {
        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 20;
        }
        if ($limit > 100) {
            $limit = 100;
        }
        $offset = ($page - 1) * $limit;
        $pdo = Database::getPdoConnection();
        $params = [];
        $where = [];
        if ($search !== '') {
            $where[] = '(`ip` LIKE :search OR `reason` LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        if ($activeOnly) {
            $where[] = '(`expires_at` IS NULL OR `expires_at` > UTC_TIMESTAMP())';
        }
        $whereSql = $where !== [] ? ' WHERE ' . implode(' AND ', $where) : '';
        $sql = 'SELECT `id`, `ip`, `reason`, `expires_at`, `created_by_uuid`, `created_at` FROM ' . self::$table
            . $whereSql . ' ORDER BY `created_at` DESC, `id` DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function countSearch(string $search = '', bool $activeOnly = false): int
    {
        $pdo = Database::getPdoConnection();
        $params = [];
        $where = [];
        if ($search !== '') {
            $where[] = '(`ip` LIKE :search OR `reason` LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        if ($activeOnly) {
            $where[] = '(`expires_at` IS NULL OR `expires_at` > UTC_TIMESTAMP())';
        }
        $whereSql = $where !== [] ? ' WHERE ' . implode(' AND ', $where) : '';
        if ($params === []) {
            $n = $pdo->query('SELECT COUNT(*) FROM ' . self::$table . $whereSql);

            return $n ? (int) $n->fetchColumn() : 0;
        }
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . $whereSql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT `id`, `ip`, `reason`, `expires_at`, `created_by_uuid`, `created_at` FROM ' . self::$table
            . ' WHERE `id` = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * @return int|false New row id or false on failure / duplicate
     */
    public static function create(string $ip, ?string $reason = null, ?string $expiresAt = null, ?string $createdByUuid = null): int | false
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (`ip`, `reason`, `expires_at`, `created_by_uuid`)'
            . ' VALUES (:ip, :reason, :expires_at, :created_by_uuid)'
        );
        try {
            if (
                $stmt->execute([
                    'ip' => $ip,
                    'reason' => $reason !== null && trim($reason) !== '' ? trim($reason) : null,
                    'expires_at' => $expiresAt,
                    'created_by_uuid' => $createdByUuid,
                ])
            ) {
                return (int) $pdo->lastInsertId();
            }
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->warning('BlockedIp create failed: ' . $e->getMessage());

            return false;
        }

        return false;
    }

    public static function deleteById(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE `id` = :id');

        return $stmt->execute(['id' => $id]) && $stmt->rowCount() > 0;
    }

    private static function canonicalizeIp(string $ip): ?string
    {
        $bin = @inet_pton($ip);
        if ($bin === false) {
            return null;
        }
        $out = @inet_ntop($bin);

        return $out !== false ? $out : null;
    }
}
