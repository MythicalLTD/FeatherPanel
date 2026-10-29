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

/** Minimal five-field cron expansion used for the schedule calendar preview. */
export interface CronFields {
    cron_minute: string;
    cron_hour: string;
    cron_day_of_month: string;
    cron_month: string;
    cron_day_of_week: string;
}

function fieldMatches(expr: string, value: number, min: number, max: number): boolean {
    return expr.split(',').some((part) => {
        const [range, stepRaw] = part.trim().split('/');
        const step = stepRaw ? Math.max(1, parseInt(stepRaw, 10) || 1) : 1;
        let lo = min;
        let hi = max;
        if (range !== '*' && range !== '') {
            const [a, b] = range.split('-');
            lo = parseInt(a, 10);
            hi = b !== undefined ? parseInt(b, 10) : stepRaw ? max : lo;
            if (Number.isNaN(lo) || Number.isNaN(hi)) return false;
        }
        return value >= lo && value <= hi && (value - lo) % step === 0;
    });
}

function partsInZone(date: Date, timeZone: string) {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        minute: 'numeric',
        hour: 'numeric',
        day: 'numeric',
        month: 'numeric',
        weekday: 'short',
    });
    const map: Record<string, string> = {};
    for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday);
    return {
        minute: parseInt(map.minute, 10),
        hour: parseInt(map.hour, 10) % 24,
        day: parseInt(map.day, 10),
        month: parseInt(map.month, 10),
        dow,
    };
}

/** Returns upcoming run times (at most `limit`) within the next `days` days. */
export function upcomingCronRuns(cron: CronFields, timeZone = 'UTC', days = 7, limit = 200): Date[] {
    const runs: Date[] = [];
    let zone = timeZone || 'UTC';
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: zone });
    } catch {
        zone = 'UTC';
    }
    const start = new Date();
    start.setSeconds(0, 0);
    const total = days * 1440;
    for (let i = 1; i <= total && runs.length < limit; i++) {
        const d = new Date(start.getTime() + i * 60000);
        const p = partsInZone(d, zone);
        const domRestricted = cron.cron_day_of_month !== '*';
        const dowRestricted = cron.cron_day_of_week !== '*';
        const domOk = fieldMatches(cron.cron_day_of_month, p.day, 1, 31);
        const dowOk =
            fieldMatches(cron.cron_day_of_week, p.dow, 0, 7) ||
            (p.dow === 0 && fieldMatches(cron.cron_day_of_week, 7, 0, 7));
        const dayOk = domRestricted && dowRestricted ? domOk || dowOk : domOk && dowOk;
        if (
            dayOk &&
            fieldMatches(cron.cron_minute, p.minute, 0, 59) &&
            fieldMatches(cron.cron_hour, p.hour, 0, 23) &&
            fieldMatches(cron.cron_month, p.month, 1, 12)
        ) {
            runs.push(d);
        }
    }
    return runs;
}
