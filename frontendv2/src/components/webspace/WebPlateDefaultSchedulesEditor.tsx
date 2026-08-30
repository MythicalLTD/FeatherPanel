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

import { Plus, Trash2, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { CronEditor } from '@/components/common/CronEditor';
import { WebSpaceScheduleTasksEditor } from '@/components/webspace/WebSpaceScheduleTasksEditor';
import { listSupportedTimezones } from '@/lib/dateUtils';
import {
    SCHEDULE_PRESETS,
    emptyScheduleDraft,
    type SchedulePresetId,
    type WebSpaceScheduleDraft,
} from '@/lib/webspace-schedules';

interface Props {
    schedules: WebSpaceScheduleDraft[];
    onChange: (schedules: WebSpaceScheduleDraft[]) => void;
    disabled?: boolean;
}

export function WebPlateDefaultSchedulesEditor({ schedules, onChange, disabled }: Props) {
    const { t } = useTranslation();
    const timezoneOptions = listSupportedTimezones().map((tz) => ({ id: tz, name: tz }));

    const presetOptions = [
        { id: '', name: t('webSpaces.schedules.presets.pick') },
        ...SCHEDULE_PRESETS.map((preset) => ({
            id: preset.id,
            name: t(`webSpaces.schedules.presets.${preset.id}`),
        })),
    ];

    const updateSchedule = (index: number, patch: Partial<WebSpaceScheduleDraft>) => {
        onChange(schedules.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    };

    const addBlank = () => {
        onChange([...schedules, emptyScheduleDraft('UTC', true)]);
    };

    const addPreset = (presetId: string) => {
        if (!presetId) return;
        const preset = SCHEDULE_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        onChange([...schedules, preset.apply('UTC')]);
    };

    const removeSchedule = (index: number) => {
        onChange(schedules.filter((_, i) => i !== index));
    };

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <p className='text-sm font-medium'>{t('admin.webPlates.form.schedules_section')}</p>
                    <p className='text-muted-foreground text-xs'>{t('admin.webPlates.form.schedules_help')}</p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <HeadlessSelect
                        value=''
                        onChange={(val) => addPreset(String(val) as SchedulePresetId)}
                        options={presetOptions}
                        disabled={disabled}
                    />
                    <Button type='button' variant='glass' size='sm' onClick={addBlank} disabled={disabled}>
                        <Plus className='mr-1 h-3.5 w-3.5' />
                        {t('admin.webPlates.form.add_schedule')}
                    </Button>
                </div>
            </div>

            {schedules.length === 0 ? (
                <div className='border-border/60 text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
                    <Sparkles className='mx-auto mb-2 h-5 w-5 opacity-70' />
                    {t('admin.webPlates.form.schedules_empty')}
                </div>
            ) : (
                schedules.map((schedule, index) => (
                    <div key={`default-schedule-${index}`} className='border-border/60 space-y-4 rounded-lg border p-4'>
                        <div className='flex items-start justify-between gap-2'>
                            <p className='text-sm font-medium'>
                                {t('admin.webPlates.form.schedule_number', {
                                    number: String(index + 1),
                                })}
                            </p>
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => removeSchedule(index)}
                                disabled={disabled}
                            >
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                {t('serverSchedules.name')}
                            </Label>
                            <Input
                                value={schedule.name}
                                onChange={(e) => updateSchedule(index, { name: e.target.value })}
                                disabled={disabled}
                            />
                        </div>

                        <CronEditor
                            value={{
                                cron_minute: schedule.cron_minute,
                                cron_hour: schedule.cron_hour,
                                cron_day_of_month: schedule.cron_day_of_month,
                                cron_month: schedule.cron_month,
                                cron_day_of_week: schedule.cron_day_of_week,
                            }}
                            onChange={(cron) => updateSchedule(index, cron)}
                            labels={{
                                minute: t('serverSchedules.minute'),
                                hour: t('serverSchedules.hour'),
                                dayOfMonth: t('serverSchedules.dayOfMonth'),
                                month: t('serverSchedules.month'),
                                dayOfWeek: t('serverSchedules.dayOfWeek'),
                                help: t('serverSchedules.cronHelp'),
                            }}
                        />

                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                    {t('serverSchedules.timezone')}
                                </Label>
                                <HeadlessSelect
                                    value={schedule.timezone}
                                    onChange={(val) => updateSchedule(index, { timezone: String(val) })}
                                    options={timezoneOptions}
                                    disabled={disabled}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                    {t('serverSchedules.scheduleEnabled')}
                                </Label>
                                <HeadlessSelect
                                    value={schedule.is_active ? '1' : '0'}
                                    onChange={(val) => updateSchedule(index, { is_active: String(val) === '1' })}
                                    options={[
                                        { id: '1', name: t('common.enabled') },
                                        { id: '0', name: t('common.disabled') },
                                    ]}
                                    disabled={disabled}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                    {t('admin.webPlates.form.schedule_lock')}
                                </Label>
                                <HeadlessSelect
                                    value={schedule.is_locked !== false ? '1' : '0'}
                                    onChange={(val) => updateSchedule(index, { is_locked: String(val) === '1' })}
                                    options={[
                                        { id: '1', name: t('admin.webPlates.form.schedule_lock_on') },
                                        { id: '0', name: t('admin.webPlates.form.schedule_lock_off') },
                                    ]}
                                    disabled={disabled}
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.webPlates.form.schedule_lock_help')}
                                </p>
                            </div>
                        </div>

                        <WebSpaceScheduleTasksEditor
                            tasks={schedule.tasks}
                            onChange={(tasks) => updateSchedule(index, { tasks })}
                            disabled={disabled}
                        />
                    </div>
                ))
            )}
        </div>
    );
}
