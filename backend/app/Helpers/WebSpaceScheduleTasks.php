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

use App\Chat\ServerSchedule;

/**
 * Shared validation for WebSpace schedule tasks (user schedules + WebPlate defaults).
 */
final class WebSpaceScheduleTasks
{
    /** @var list<string> */
    public const VALID_ACTIONS = [
        'power',
        'start',
        'stop',
        'restart',
        'backup',
        'command',
        'exec',
        'malware_scan',
        'scan',
    ];

    /**
     * @param list<mixed> $tasks
     *
     * @return list<array{action: string, payload: string, sequence_id: int, time_offset: int, continue_on_failure: bool}>|string
     *                                                                                                                            Normalized tasks, or an error message string
     */
    public static function validateAndNormalizeTasks(array $tasks): array | string
    {
        if ($tasks === []) {
            return 'At least one task is required';
        }

        $normalized = [];
        foreach ($tasks as $index => $task) {
            if (!is_array($task)) {
                return "Task at index {$index} is invalid";
            }

            $action = strtolower(trim((string) ($task['action'] ?? '')));
            if (!in_array($action, self::VALID_ACTIONS, true)) {
                return "Task at index {$index} has invalid action";
            }

            $payload = (string) ($task['payload'] ?? '');
            if (in_array($action, ['command', 'exec'], true) && trim($payload) === '') {
                return "Task at index {$index} requires a command payload";
            }

            $normalized[] = [
                'action' => $action === 'exec' ? 'command' : $action,
                'payload' => $payload,
                'sequence_id' => isset($task['sequence_id']) ? max(1, (int) $task['sequence_id']) : ($index + 1),
                'time_offset' => max(0, (int) ($task['time_offset'] ?? 0)),
                'continue_on_failure' => !empty($task['continue_on_failure']),
            ];
        }

        return $normalized;
    }

    /**
     * Validate + normalize a list of default/template schedules.
     *
     * @return list<array<string, mixed>>|string normalized schedules, or error message
     */
    public static function validateAndNormalizeSchedules(mixed $raw): array | string
    {
        if ($raw === null || $raw === '' || $raw === []) {
            return [];
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                return 'default_schedules must be a JSON array';
            }
            $raw = $decoded;
        }

        if (!is_array($raw)) {
            return 'default_schedules must be an array';
        }

        // Associative object disguised as array
        if ($raw !== [] && array_keys($raw) !== range(0, count($raw) - 1)) {
            return 'default_schedules must be a list of schedules';
        }

        $out = [];
        foreach ($raw as $index => $schedule) {
            if (!is_array($schedule)) {
                return "Schedule at index {$index} is invalid";
            }

            $name = trim((string) ($schedule['name'] ?? ''));
            if ($name === '') {
                return "Schedule at index {$index} requires a name";
            }

            $cronMinute = (string) ($schedule['cron_minute'] ?? '*');
            $cronHour = (string) ($schedule['cron_hour'] ?? '*');
            $cronDayOfMonth = (string) ($schedule['cron_day_of_month'] ?? '*');
            $cronMonth = (string) ($schedule['cron_month'] ?? '*');
            $cronDayOfWeek = (string) ($schedule['cron_day_of_week'] ?? '*');

            if (!ServerSchedule::validateCronExpression($cronDayOfWeek, $cronMonth, $cronDayOfMonth, $cronHour, $cronMinute)) {
                return "Schedule at index {$index} has an invalid cron expression";
            }

            $timezone = isset($schedule['timezone']) && is_string($schedule['timezone']) && $schedule['timezone'] !== ''
                ? $schedule['timezone']
                : 'UTC';
            if (!ServerSchedule::isValidTimezone($timezone)) {
                return "Schedule at index {$index} has an invalid timezone";
            }

            $tasksRaw = $schedule['tasks'] ?? [];
            if (!is_array($tasksRaw)) {
                return "Schedule at index {$index} has invalid tasks";
            }

            $tasks = self::validateAndNormalizeTasks($tasksRaw);
            if (is_string($tasks)) {
                return "Schedule at index {$index}: {$tasks}";
            }

            $out[] = [
                'name' => $name,
                'cron_minute' => $cronMinute,
                'cron_hour' => $cronHour,
                'cron_day_of_month' => $cronDayOfMonth,
                'cron_month' => $cronMonth,
                'cron_day_of_week' => $cronDayOfWeek,
                'timezone' => $timezone,
                'is_active' => array_key_exists('is_active', $schedule) ? (bool) $schedule['is_active'] : true,
                'is_locked' => array_key_exists('is_locked', $schedule) ? (bool) $schedule['is_locked'] : true,
                'tasks' => $tasks,
            ];
        }

        return $out;
    }
}
