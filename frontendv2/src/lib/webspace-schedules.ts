/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

export type WebSpaceScheduleTaskAction = 'restart' | 'start' | 'stop' | 'backup' | 'command';

export interface WebSpaceScheduleTaskDraft {
    action: WebSpaceScheduleTaskAction | string;
    payload: string;
    sequence_id: number;
    time_offset?: number;
    continue_on_failure?: boolean;
}

export interface WebSpaceScheduleDraft {
    name: string;
    cron_minute: string;
    cron_hour: string;
    cron_day_of_month: string;
    cron_month: string;
    cron_day_of_week: string;
    timezone: string;
    is_active: boolean;
    is_locked?: boolean;
    tasks: WebSpaceScheduleTaskDraft[];
}

export const WEBSPACE_TASK_ACTIONS: WebSpaceScheduleTaskAction[] = ['command', 'backup', 'restart', 'start', 'stop'];

export function emptyScheduleTask(sequence = 1): WebSpaceScheduleTaskDraft {
    return {
        action: 'command',
        payload: '',
        sequence_id: sequence,
        time_offset: 0,
        continue_on_failure: false,
    };
}

export function emptyScheduleDraft(timezone = 'UTC', isLocked = false): WebSpaceScheduleDraft {
    return {
        name: '',
        cron_minute: '*/5',
        cron_hour: '*',
        cron_day_of_month: '*',
        cron_month: '*',
        cron_day_of_week: '*',
        timezone,
        is_active: true,
        is_locked: isLocked,
        tasks: [emptyScheduleTask(1)],
    };
}

export function isWebSpaceScheduleLocked(
    schedule: { is_locked?: boolean | number | string } | null | undefined,
): boolean {
    const value = schedule?.is_locked;
    return value === true || value === 1 || value === '1';
}

export type SchedulePresetId = 'wordpress' | 'whmcs' | 'laravel' | 'nightly_backup';

export interface SchedulePreset {
    id: SchedulePresetId;
    apply: (timezone?: string) => WebSpaceScheduleDraft;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
    {
        id: 'wordpress',
        apply: (timezone = 'UTC') => ({
            name: 'WordPress Cron',
            cron_minute: '*/5',
            cron_hour: '*',
            cron_day_of_month: '*',
            cron_month: '*',
            cron_day_of_week: '*',
            timezone,
            is_active: true,
            is_locked: true,
            tasks: [
                {
                    action: 'command',
                    payload: 'wp cron event run --due-now',
                    sequence_id: 1,
                    time_offset: 0,
                    continue_on_failure: false,
                },
            ],
        }),
    },
    {
        id: 'whmcs',
        apply: (timezone = 'UTC') => ({
            name: 'WHMCS Cron',
            cron_minute: '*/5',
            cron_hour: '*',
            cron_day_of_month: '*',
            cron_month: '*',
            cron_day_of_week: '*',
            timezone,
            is_active: true,
            is_locked: true,
            tasks: [
                {
                    action: 'command',
                    payload: 'php -q crons/cron.php',
                    sequence_id: 1,
                    time_offset: 0,
                    continue_on_failure: false,
                },
            ],
        }),
    },
    {
        id: 'laravel',
        apply: (timezone = 'UTC') => ({
            name: 'Laravel Scheduler',
            cron_minute: '*',
            cron_hour: '*',
            cron_day_of_month: '*',
            cron_month: '*',
            cron_day_of_week: '*',
            timezone,
            is_active: true,
            is_locked: true,
            tasks: [
                {
                    action: 'command',
                    payload: 'php artisan schedule:run',
                    sequence_id: 1,
                    time_offset: 0,
                    continue_on_failure: false,
                },
            ],
        }),
    },
    {
        id: 'nightly_backup',
        apply: (timezone = 'UTC') => ({
            name: 'Nightly Backup',
            cron_minute: '0',
            cron_hour: '3',
            cron_day_of_month: '*',
            cron_month: '*',
            cron_day_of_week: '*',
            timezone,
            is_active: true,
            is_locked: true,
            tasks: [
                {
                    action: 'backup',
                    payload: '',
                    sequence_id: 1,
                    time_offset: 0,
                    continue_on_failure: false,
                },
            ],
        }),
    },
];

export function needsCommandPayload(action: string): boolean {
    const normalized = action.trim().toLowerCase();
    return normalized === 'command' || normalized === 'exec';
}
