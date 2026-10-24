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

/**
 * VDS scheduled tasks (auto reboot / auto snapshot) run by the ZVdsSchedules cron.
 */
class VmSchedule
{
    public const ACTIONS = ['reboot', 'snapshot'];
    public const FREQUENCIES = ['hourly', 'daily', 'weekly'];

    private static string $table = 'featherpanel_vm_schedules';

    private const COLUMNS = ['vm_instance_id', 'name', 'action', 'frequency', 'minute', 'hour', 'weekday', 'keep', 'enabled', 'next_run_at', 'last_run_at', 'last_status', 'last_error', 'created_by'];

    public static function create(array $data): ?int
    {
        $data = array_intersect_key($data, array_flip(self::COLUMNS));
        $cols = array_keys($data);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`, `', $cols) . '`) VALUES (:' . implode(', :', $cols) . ')';
        $pdo = Database::getPdoConnection();
        if (!$pdo->prepare($sql)->execute($data)) {
            return null;
        }

        return (int) $pdo->lastInsertId();
    }

    public static function getById(int $id): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function forInstance(int $vmInstanceId): array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::$table . ' WHERE vm_instance_id = :id ORDER BY id ASC');
        $stmt->execute(['id' => $vmInstanceId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /** Enabled schedules whose next run is due. */
    public static function due(int $limit = 100): array
    {
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= :now ORDER BY next_run_at ASC LIMIT ' . max(1, $limit)
        );
        $stmt->execute(['now' => date('Y-m-d H:i:s')]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function update(int $id, array $data): bool
    {
        $data = array_intersect_key($data, array_flip(self::COLUMNS));
        if ($data === []) {
            return true;
        }
        $sets = array_map(static fn ($c) => "`$c` = :$c", array_keys($data));
        $data['id'] = $id;

        return Database::getPdoConnection()->prepare('UPDATE ' . self::$table . ' SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($data);
    }

    public static function delete(int $id): bool
    {
        return Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id')->execute(['id' => $id]);
    }

    /** Next run (panel timezone) strictly after $from. */
    public static function nextRun(array $s, ?\DateTimeImmutable $from = null): string
    {
        $from ??= new \DateTimeImmutable('now');
        $minute = max(0, min(59, (int) $s['minute']));
        $hour = max(0, min(23, (int) $s['hour']));
        switch ($s['frequency']) {
            case 'hourly':
                $next = $from->setTime((int) $from->format('H'), $minute);
                if ($next <= $from) {
                    $next = $next->modify('+1 hour');
                }
                break;
            case 'weekly':
                $next = $from->setTime($hour, $minute);
                $diff = (max(0, min(6, (int) $s['weekday'])) - (int) $next->format('w') + 7) % 7;
                $next = $next->modify('+' . $diff . ' days');
                if ($next <= $from) {
                    $next = $next->modify('+7 days');
                }
                break;
            default:
                $next = $from->setTime($hour, $minute);
                if ($next <= $from) {
                    $next = $next->modify('+1 day');
                }
        }

        return $next->format('Y-m-d H:i:s');
    }
}
