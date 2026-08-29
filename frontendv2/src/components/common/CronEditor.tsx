/*
This file is part of FeatherPanel.
 */

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

'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/featherui/Input';
import { Button } from '@/components/featherui/Button';
import { cn } from '@/lib/utils';

export type CronFields = {
    cron_minute: string;
    cron_hour: string;
    cron_day_of_month: string;
    cron_month: string;
    cron_day_of_week: string;
};

type CronEditorProps = {
    value: CronFields;
    onChange: (next: CronFields) => void;
    labels?: {
        minute?: string;
        hour?: string;
        dayOfMonth?: string;
        month?: string;
        dayOfWeek?: string;
        presets?: string;
        advanced?: string;
        summary?: string;
        help?: string;
    };
};

const PRESETS: { id: string; label: string; fields: CronFields }[] = [
    {
        id: 'every5',
        label: 'Every 5 minutes',
        fields: { cron_minute: '*/5', cron_hour: '*', cron_day_of_month: '*', cron_month: '*', cron_day_of_week: '*' },
    },
    {
        id: 'hourly',
        label: 'Hourly',
        fields: { cron_minute: '0', cron_hour: '*', cron_day_of_month: '*', cron_month: '*', cron_day_of_week: '*' },
    },
    {
        id: 'daily',
        label: 'Daily at midnight',
        fields: { cron_minute: '0', cron_hour: '0', cron_day_of_month: '*', cron_month: '*', cron_day_of_week: '*' },
    },
    {
        id: 'weekly',
        label: 'Weekly (Sun 00:00)',
        fields: { cron_minute: '0', cron_hour: '0', cron_day_of_month: '*', cron_month: '*', cron_day_of_week: '0' },
    },
    {
        id: 'monthly',
        label: 'Monthly (1st 00:00)',
        fields: { cron_minute: '0', cron_hour: '0', cron_day_of_month: '1', cron_month: '*', cron_day_of_week: '*' },
    },
];

const WEEKDAYS = [
    { value: '0', label: 'Sun' },
    { value: '1', label: 'Mon' },
    { value: '2', label: 'Tue' },
    { value: '3', label: 'Wed' },
    { value: '4', label: 'Thu' },
    { value: '5', label: 'Fri' },
    { value: '6', label: 'Sat' },
];

function describeCron(fields: CronFields): string {
    const { cron_minute: m, cron_hour: h, cron_day_of_month: dom, cron_month: mon, cron_day_of_week: dow } = fields;
    const expr = `${m} ${h} ${dom} ${mon} ${dow}`;
    const preset = PRESETS.find(
        (p) =>
            p.fields.cron_minute === m &&
            p.fields.cron_hour === h &&
            p.fields.cron_day_of_month === dom &&
            p.fields.cron_month === mon &&
            p.fields.cron_day_of_week === dow,
    );
    if (preset) return `${preset.label} (${expr})`;
    return expr;
}

function activePresetId(fields: CronFields): string | null {
    const match = PRESETS.find(
        (p) =>
            p.fields.cron_minute === fields.cron_minute &&
            p.fields.cron_hour === fields.cron_hour &&
            p.fields.cron_day_of_month === fields.cron_day_of_month &&
            p.fields.cron_month === fields.cron_month &&
            p.fields.cron_day_of_week === fields.cron_day_of_week,
    );
    return match?.id ?? null;
}

export function CronEditor({ value, onChange, labels }: CronEditorProps) {
    const summary = useMemo(() => describeCron(value), [value]);
    const active = activePresetId(value);
    const selectedDays = useMemo(() => {
        if (value.cron_day_of_week === '*') return new Set(WEEKDAYS.map((d) => d.value));
        return new Set(
            value.cron_day_of_week
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        );
    }, [value.cron_day_of_week]);

    const toggleDay = (day: string) => {
        const next = new Set(selectedDays);
        if (value.cron_day_of_week === '*') {
            next.clear();
            WEEKDAYS.forEach((d) => next.add(d.value));
        }
        if (next.has(day)) next.delete(day);
        else next.add(day);
        if (next.size === 0 || next.size === 7) {
            onChange({ ...value, cron_day_of_week: '*' });
            return;
        }
        onChange({
            ...value,
            cron_day_of_week: WEEKDAYS.map((d) => d.value)
                .filter((v) => next.has(v))
                .join(','),
        });
    };

    return (
        <div className='space-y-4'>
            <div className='space-y-2'>
                <Label>{labels?.presets || 'Presets'}</Label>
                <div className='flex flex-wrap gap-2'>
                    {PRESETS.map((preset) => (
                        <Button
                            key={preset.id}
                            type='button'
                            size='sm'
                            variant={active === preset.id ? 'default' : 'outline'}
                            onClick={() => onChange({ ...preset.fields })}
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className='space-y-2'>
                <Label>Days of week</Label>
                <div className='flex flex-wrap gap-1.5'>
                    {WEEKDAYS.map((day) => {
                        const on = value.cron_day_of_week === '*' || selectedDays.has(day.value);
                        return (
                            <button
                                key={day.value}
                                type='button'
                                onClick={() => toggleDay(day.value)}
                                className={cn(
                                    'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                                    on
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {day.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className='space-y-2'>
                <Label>{labels?.advanced || 'Advanced (cron fields)'}</Label>
                <div className='grid grid-cols-2 gap-3 md:grid-cols-5'>
                    {(
                        [
                            ['cron_minute', labels?.minute || 'Minute'],
                            ['cron_hour', labels?.hour || 'Hour'],
                            ['cron_day_of_month', labels?.dayOfMonth || 'Day of month'],
                            ['cron_month', labels?.month || 'Month'],
                            ['cron_day_of_week', labels?.dayOfWeek || 'Day of week'],
                        ] as const
                    ).map(([key, label]) => (
                        <div key={key} className='space-y-2'>
                            <Label>{label}</Label>
                            <Input
                                value={value[key]}
                                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                                className='font-mono'
                            />
                        </div>
                    ))}
                </div>
                <p className='text-muted-foreground text-xs'>
                    {labels?.help || 'Need help?'}{' '}
                    <a href='https://crontab.guru/' target='_blank' rel='noreferrer' className='text-primary underline'>
                        crontab.guru
                    </a>
                </p>
            </div>

            <p className='text-muted-foreground text-sm'>
                <span className='text-foreground font-medium'>{labels?.summary || 'Runs'}:</span> {summary}
            </p>
        </div>
    );
}
