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

export const WEBPLATE_RUNTIMES = ['static', 'php', 'node', 'python', 'custom'] as const;

export type WebPlateRuntime = (typeof WEBPLATE_RUNTIMES)[number];

/** Infer WebPlate runtime from a Docker image name (empty image → static). */
export function inferRuntimeFromDockerImage(image: string): WebPlateRuntime {
    const s = image.trim().toLowerCase();
    if (!s) {
        return 'static';
    }

    // Match on image path/name before tag when possible.
    const withoutTag = s.includes('@') ? s.slice(0, s.indexOf('@')) : s;
    const name = withoutTag.includes(':') ? withoutTag.slice(0, withoutTag.lastIndexOf(':')) : withoutTag;

    if (/\bphp\b/.test(name) || /\bfpm\b/.test(name) || /laravel/.test(name)) {
        return 'php';
    }
    if (/\bnode\b/.test(name) || /\bbun\b/.test(name) || /\bdeno\b/.test(name)) {
        return 'node';
    }
    if (/\bpython\b/.test(name) || /gunicorn/.test(name) || /uvicorn/.test(name) || /django/.test(name)) {
        return 'python';
    }

    return 'custom';
}

/** Normalize document root: blank / "." → site root (empty string). */
export function normalizeDocumentRoot(value: string): string {
    const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
    if (!trimmed || trimmed === '.') {
        return '';
    }
    return trimmed;
}

export interface WebPlateDefaultScheduleTask {
    action: string;
    payload?: string;
    sequence_id?: number;
    time_offset?: number;
    continue_on_failure?: boolean;
}

export interface WebPlateDefaultSchedule {
    name: string;
    cron_minute: string;
    cron_hour: string;
    cron_day_of_month: string;
    cron_month: string;
    cron_day_of_week: string;
    timezone?: string;
    is_active?: boolean;
    is_locked?: boolean;
    tasks: WebPlateDefaultScheduleTask[];
}

export interface WebPlate {
    id: number;
    uuid: string;
    author: string;
    name: string;
    description?: string | null;
    runtime: WebPlateRuntime | string;
    docker_image?: string | null;
    document_root: string;
    startup?: string | null;
    container_port?: number;
    script_container: string;
    script_entry: string;
    script_install?: string | null;
    default_schedules?: WebPlateDefaultSchedule[] | null;
    created_at?: string;
    updated_at?: string;
}

export interface WebPlateFormState {
    name: string;
    author: string;
    description: string;
    runtime: WebPlateRuntime;
    docker_image: string;
    document_root: string;
    startup: string;
    container_port: string;
    script_container: string;
    script_entry: string;
    script_install: string;
    default_schedules: WebPlateDefaultSchedule[];
}

export const emptyWebPlateForm = (): WebPlateFormState => ({
    name: '',
    author: 'system',
    description: '',
    runtime: 'static',
    docker_image: '',
    document_root: '',
    startup: '',
    container_port: '0',
    script_container: 'alpine:3.20',
    script_entry: 'ash',
    script_install: '',
    default_schedules: [],
});

export function webPlateToForm(plate: WebPlate): WebPlateFormState {
    const runtime = (
        WEBPLATE_RUNTIMES.includes(plate.runtime as WebPlateRuntime) ? plate.runtime : 'custom'
    ) as WebPlateRuntime;

    const defaults = Array.isArray(plate.default_schedules)
        ? plate.default_schedules.map((schedule) => ({
              name: schedule.name || '',
              cron_minute: schedule.cron_minute || '*',
              cron_hour: schedule.cron_hour || '*',
              cron_day_of_month: schedule.cron_day_of_month || '*',
              cron_month: schedule.cron_month || '*',
              cron_day_of_week: schedule.cron_day_of_week || '*',
              timezone: schedule.timezone || 'UTC',
              is_active: schedule.is_active !== false,
              is_locked: schedule.is_locked !== false,
              tasks: (schedule.tasks || []).map((task, index) => ({
                  action: task.action || 'command',
                  payload: task.payload || '',
                  sequence_id: task.sequence_id ?? index + 1,
                  time_offset: task.time_offset ?? 0,
                  continue_on_failure: !!task.continue_on_failure,
              })),
          }))
        : [];

    return {
        name: plate.name ?? '',
        author: plate.author ?? 'system',
        description: plate.description ?? '',
        runtime,
        docker_image: plate.docker_image ?? '',
        document_root: plate.document_root ?? '',
        startup: plate.startup ?? '',
        container_port: String(plate.container_port ?? 0),
        script_container: plate.script_container || 'alpine:3.20',
        script_entry: plate.script_entry || 'ash',
        script_install: plate.script_install ?? '',
        default_schedules: defaults,
    };
}

export function webPlateFormPayload(form: WebPlateFormState) {
    const image = form.docker_image.trim();

    return {
        ...form,
        docker_image: image,
        // No image → static hosting; otherwise keep (auto-inferred or overridden) runtime.
        runtime: image ? form.runtime : 'static',
        document_root: normalizeDocumentRoot(form.document_root),
        container_port: Math.max(0, Number(form.container_port) || 0),
        default_schedules: form.default_schedules.map((schedule) => ({
            ...schedule,
            is_active: schedule.is_active !== false,
            is_locked: schedule.is_locked !== false,
            tasks: schedule.tasks.map((task, index) => ({
                action: task.action,
                payload: task.payload ?? '',
                sequence_id: index + 1,
                time_offset: task.time_offset ?? 0,
                continue_on_failure: !!task.continue_on_failure,
            })),
        })),
    };
}
