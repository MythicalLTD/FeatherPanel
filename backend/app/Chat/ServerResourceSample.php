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
 * Five minute CPU, memory and disk samples per server, kept for seven days.
 * Timestamps are stored in UTC.
 */
class ServerResourceSample
{
    public const INTERVAL_SECONDS = 300;

    /** Seven days plus one bucket, so a full 7 day window is always available. */
    public const RETENTION_SECONDS = 7 * 86400 + self::INTERVAL_SECONDS;

    private static string $table = 'featherpanel_server_resource_samples';

    /**
     * Store one sample per server for a bucket. Re-running the same bucket is a no-op.
     *
     * @param array<int, array{cpu: float, memory_bytes: int, disk_bytes: int}> $samples keyed by server id
     */
    public static function record(array $samples, int $bucketTimestamp): int
    {
        if ($samples === []) {
            return 0;
        }

        try {
            $pdo = Database::getPdoConnection();
            $values = [];
            $params = [];
            $i = 0;
            foreach ($samples as $serverId => $sample) {
                $values[] = "(:s{$i}, :t{$i}, :c{$i}, :m{$i}, :d{$i})";
                $params["s{$i}"] = (int) $serverId;
                $params["t{$i}"] = gmdate('Y-m-d H:i:s', $bucketTimestamp);
                $params["c{$i}"] = max(0, round((float) $sample['cpu'], 2));
                $params["m{$i}"] = max(0, (int) $sample['memory_bytes']);
                $params["d{$i}"] = max(0, (int) $sample['disk_bytes']);
                ++$i;
            }
            $stmt = $pdo->prepare(
                'INSERT IGNORE INTO ' . self::$table . ' (server_id, sampled_at, cpu, memory_bytes, disk_bytes) VALUES ' . implode(', ', $values)
            );
            $stmt->execute($params);

            return $stmt->rowCount();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to record resource samples: ' . $e->getMessage());

            return 0;
        }
    }

    /**
     * Samples since a UTC timestamp for the given servers, oldest first.
     *
     * @param int[] $serverIds
     *
     * @return array<int, array<int, array{t: int, cpu: float, memory_bytes: int, disk_bytes: int}>> keyed by server id
     */
    public static function since(array $serverIds, int $sinceTimestamp): array
    {
        $serverIds = array_values(array_unique(array_filter(array_map('intval', $serverIds), static fn (int $id): bool => $id > 0)));
        if ($serverIds === []) {
            return [];
        }

        try {
            $pdo = Database::getPdoConnection();
            $placeholders = implode(', ', array_fill(0, count($serverIds), '?'));
            $stmt = $pdo->prepare(
                'SELECT server_id, sampled_at, cpu, memory_bytes, disk_bytes FROM ' . self::$table
                . ' WHERE server_id IN (' . $placeholders . ') AND sampled_at >= ? ORDER BY sampled_at ASC'
            );
            $stmt->execute([...$serverIds, gmdate('Y-m-d H:i:s', $sinceTimestamp)]);

            $out = [];
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                $time = strtotime((string) $row['sampled_at'] . ' UTC');
                if ($time === false) {
                    continue;
                }
                $out[(int) $row['server_id']][] = [
                    't' => $time,
                    'cpu' => (float) $row['cpu'],
                    'memory_bytes' => (int) $row['memory_bytes'],
                    'disk_bytes' => (int) $row['disk_bytes'],
                ];
            }

            return $out;
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to read resource samples: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Average samples into wider buckets (for example hourly points for a 7 day graph).
     * CPU and memory are averaged, disk keeps the last value of the bucket.
     *
     * @param array<int, array{t: int, cpu: float, memory_bytes: int, disk_bytes: int}> $samples oldest first
     *
     * @return array<int, array{t: int, cpu: float, memory_bytes: int, disk_bytes: int}>
     */
    public static function downsample(array $samples, int $bucketSeconds): array
    {
        $buckets = [];
        foreach ($samples as $sample) {
            $t = $sample['t'] - ($sample['t'] % $bucketSeconds);
            $buckets[$t] ??= ['n' => 0, 'cpu' => 0.0, 'memory' => 0, 'disk' => 0];
            ++$buckets[$t]['n'];
            $buckets[$t]['cpu'] += $sample['cpu'];
            $buckets[$t]['memory'] += $sample['memory_bytes'];
            $buckets[$t]['disk'] = $sample['disk_bytes'];
        }
        $out = [];
        foreach ($buckets as $t => $b) {
            $out[] = [
                't' => $t,
                'cpu' => round($b['cpu'] / $b['n'], 2),
                'memory_bytes' => (int) round($b['memory'] / $b['n']),
                'disk_bytes' => $b['disk'],
            ];
        }

        return $out;
    }

    /**
     * The newest samples of one server, newest first.
     *
     * @return array<int, array{cpu: float, memory_bytes: int, disk_bytes: int}>
     */
    public static function latest(int $serverId, int $limit): array
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('SELECT cpu, memory_bytes, disk_bytes FROM ' . self::$table . ' WHERE server_id = :id ORDER BY sampled_at DESC LIMIT ' . max(1, $limit));
            $stmt->execute(['id' => $serverId]);

            return array_map(static fn (array $r): array => [
                'cpu' => (float) $r['cpu'],
                'memory_bytes' => (int) $r['memory_bytes'],
                'disk_bytes' => (int) $r['disk_bytes'],
            ], $stmt->fetchAll(\PDO::FETCH_ASSOC));
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to read resource samples: ' . $e->getMessage());

            return [];
        }
    }

    /** Remove samples older than the retention window. */
    public static function prune(?int $now = null): int
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE sampled_at < :before');
            $stmt->execute(['before' => gmdate('Y-m-d H:i:s', ($now ?? time()) - self::RETENTION_SECONDS)]);

            return $stmt->rowCount();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to prune resource samples: ' . $e->getMessage());

            return 0;
        }
    }

    /** Start of the five minute bucket a timestamp falls in. */
    public static function bucket(int $timestamp): int
    {
        return $timestamp - ($timestamp % self::INTERVAL_SECONDS);
    }
}
