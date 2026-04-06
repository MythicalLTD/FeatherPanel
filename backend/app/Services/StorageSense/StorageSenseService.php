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

namespace App\Services\StorageSense;

use App\App;
use App\Chat\Database;

/**
 * Safe retention purges for large log / history tables (MySQL).
 */
class StorageSenseService
{
    /** @var array<string, bool> */
    private static array $tableCache = [];

    /**
     * @return string[]
     */
    public static function allowedTargets(): array
    {
        return [
            'user_activity',
            'server_activity',
            'vm_instance_activity',
            'vm_panel_logs',
            'chatbot_data',
            'mail_history',
            'admin_notifications',
            'featherzerotrust_logs',
            'sso_expired_tokens',
        ];
    }

    /**
     * Panel HTTP / app log directory size (best effort).
     *
     * @return array{path: string, bytes: int}
     */
    public static function getPanelLogsDirectoryInfo(): array
    {
        $base = dirname(__DIR__, 3);
        $path = $base . '/storage/logs';

        return [
            'path' => 'storage/logs',
            'bytes' => is_dir($path) ? self::directorySizeBytes($path) : 0,
        ];
    }

    public static function tableExists(\PDO $pdo, string $table): bool
    {
        if (array_key_exists($table, self::$tableCache)) {
            return self::$tableCache[$table];
        }
        try {
            $stmt = $pdo->prepare(
                'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :t LIMIT 1',
            );
            $stmt->execute(['t' => $table]);
            self::$tableCache[$table] = (bool) $stmt->fetchColumn();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('StorageSense tableExists failed: ' . $e->getMessage());
            self::$tableCache[$table] = false;
        }

        return self::$tableCache[$table];
    }

    public static function getTableApproxBytes(\PDO $pdo, string $table): int
    {
        if (!self::tableExists($pdo, $table)) {
            return 0;
        }
        try {
            $stmt = $pdo->prepare(
                'SELECT COALESCE(SUM(DATA_LENGTH + INDEX_LENGTH), 0) FROM information_schema.TABLES
                 WHERE table_schema = DATABASE() AND table_name = :t',
            );
            $stmt->execute(['t' => $table]);

            return (int) $stmt->fetchColumn();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('StorageSense getTableApproxBytes failed: ' . $e->getMessage());

            return 0;
        }
    }

    /**
     * @return array<int, array{
     *     id: string,
     *     table: string,
     *     available: bool,
     *     uses_retention_days: bool,
     *     row_count: int,
     *     purgeable_count: int,
     *     approx_data_bytes: int
     * }>
     */
    public static function summarize(int $daysOld): array
    {
        $pdo = Database::getPdoConnection();
        $cutoff = gmdate('Y-m-d H:i:s', time() - ($daysOld * 86400));

        $blocks = [
            [
                'id' => 'user_activity',
                'table' => 'featherpanel_activity',
                'uses_retention_days' => true,
                'purge_where' => 'created_at < :c',
                'purge_params' => ['c' => $cutoff],
            ],
            [
                'id' => 'server_activity',
                'table' => 'featherpanel_server_activities',
                'uses_retention_days' => true,
                'purge_where' => '`timestamp` < :c',
                'purge_params' => ['c' => $cutoff],
            ],
            [
                'id' => 'vm_instance_activity',
                'table' => 'featherpanel_vm_instance_activities',
                'uses_retention_days' => true,
                'purge_where' => '`timestamp` < :c',
                'purge_params' => ['c' => $cutoff],
            ],
            [
                'id' => 'vm_panel_logs',
                'table' => 'featherpanel_vm_logs',
                'uses_retention_days' => true,
                'purge_where' => 'created_at < :c',
                'purge_params' => ['c' => $cutoff],
            ],
            [
                'id' => 'chatbot_data',
                'table' => 'featherpanel_chatbot_conversations',
                'uses_retention_days' => true,
                'purge_where' => 'updated_at < :c',
                'purge_params' => ['c' => $cutoff],
            ],
            [
                'id' => 'mail_history',
                'table' => 'featherpanel_mail_queue',
                'uses_retention_days' => true,
                'purge_where' => "status IN ('sent','failed') AND created_at < :c",
                'purge_params' => ['c' => $cutoff],
            ],
            [
                'id' => 'admin_notifications',
                'table' => 'featherpanel_notifications',
                'uses_retention_days' => true,
                'purge_where' => 'created_at < :c',
                'purge_params' => ['c' => $cutoff],
            ],
            [
                'id' => 'featherzerotrust_logs',
                'table' => 'featherpanel_featherzerotrust_cron_logs',
                'uses_retention_days' => true,
                'purge_where' => 'started_at < :c',
                'purge_params' => ['c' => $cutoff],
            ],
            [
                'id' => 'sso_expired_tokens',
                'table' => 'featherpanel_sso_tokens',
                'uses_retention_days' => false,
                'purge_where' => 'expires_at < UTC_TIMESTAMP()',
                'purge_params' => [],
            ],
        ];

        $out = [];
        foreach ($blocks as $b) {
            $t = $b['table'];
            $exists = self::tableExists($pdo, $t);
            $out[] = [
                'id' => $b['id'],
                'table' => $t,
                'available' => $exists,
                'uses_retention_days' => $b['uses_retention_days'],
                'row_count' => $exists ? self::countWhere($pdo, $t, '1=1', []) : 0,
                'purgeable_count' => $exists ? self::countWhere($pdo, $t, $b['purge_where'], $b['purge_params']) : 0,
                'approx_data_bytes' => $exists ? self::getTableApproxBytes($pdo, $t) : 0,
            ];
        }

        return $out;
    }

    /**
     * @return array{deleted: int}|null null if target unknown / table missing
     */
    public static function purge(string $target, int $daysOld): ?array
    {
        if (!in_array($target, self::allowedTargets(), true)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $cutoff = gmdate('Y-m-d H:i:s', time() - ($daysOld * 86400));

        try {
            return match ($target) {
                'user_activity' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_activity',
                    'DELETE FROM featherpanel_activity WHERE created_at < :c',
                    ['c' => $cutoff],
                ),
                'server_activity' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_server_activities',
                    'DELETE FROM featherpanel_server_activities WHERE `timestamp` < :c',
                    ['c' => $cutoff],
                ),
                'vm_instance_activity' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_vm_instance_activities',
                    'DELETE FROM featherpanel_vm_instance_activities WHERE `timestamp` < :c',
                    ['c' => $cutoff],
                ),
                'vm_panel_logs' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_vm_logs',
                    'DELETE FROM featherpanel_vm_logs WHERE created_at < :c',
                    ['c' => $cutoff],
                ),
                'chatbot_data' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_chatbot_conversations',
                    'DELETE FROM featherpanel_chatbot_conversations WHERE updated_at < :c',
                    ['c' => $cutoff],
                ),
                'mail_history' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_mail_queue',
                    "DELETE FROM featherpanel_mail_queue WHERE status IN ('sent','failed') AND created_at < :c",
                    ['c' => $cutoff],
                ),
                'admin_notifications' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_notifications',
                    'DELETE FROM featherpanel_notifications WHERE created_at < :c',
                    ['c' => $cutoff],
                ),
                'featherzerotrust_logs' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_featherzerotrust_cron_logs',
                    'DELETE FROM featherpanel_featherzerotrust_cron_logs WHERE started_at < :c',
                    ['c' => $cutoff],
                ),
                'sso_expired_tokens' => self::purgeIfTable(
                    $pdo,
                    'featherpanel_sso_tokens',
                    'DELETE FROM featherpanel_sso_tokens WHERE expires_at < UTC_TIMESTAMP()',
                    [],
                ),
                default => null,
            };
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('StorageSense purge failed: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * @param string[] $targets
     *
     * @return array<int, array{target: string, deleted: int, success: bool, error?: string}>
     */
    public static function purgeBatch(array $targets, int $daysOld): array
    {
        $allowed = array_flip(self::allowedTargets());
        $seen = [];
        $results = [];
        foreach ($targets as $raw) {
            if (!is_string($raw)) {
                continue;
            }
            $t = trim($raw);
            if ($t === '' || !isset($allowed[$t]) || isset($seen[$t])) {
                continue;
            }
            $seen[$t] = true;
            $r = self::purge($t, $daysOld);
            if ($r === null) {
                $results[] = ['target' => $t, 'deleted' => 0, 'success' => false, 'error' => 'unavailable'];
            } else {
                $results[] = ['target' => $t, 'deleted' => $r['deleted'], 'success' => true];
            }
        }

        return $results;
    }

    private static function countWhere(\PDO $pdo, string $table, string $whereSql, array $params): int
    {
        if (!self::tableExists($pdo, $table)) {
            return 0;
        }
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM `' . str_replace('`', '', $table) . '` WHERE ' . $whereSql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param array<string, mixed> $params
     *
     * @return array{deleted: int}|null
     */
    private static function purgeIfTable(\PDO $pdo, string $table, string $deleteSql, array $params): ?array
    {
        if (!self::tableExists($pdo, $table)) {
            return null;
        }
        $stmt = $pdo->prepare($deleteSql);
        $stmt->execute($params);

        return ['deleted' => $stmt->rowCount()];
    }

    private static function directorySizeBytes(string $path): int
    {
        if (!is_dir($path) || !is_readable($path)) {
            return 0;
        }
        $size = 0;
        try {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            );
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $size += $file->getSize();
                }
            }
        } catch (\Throwable) {
            return 0;
        }

        return $size;
    }
}
