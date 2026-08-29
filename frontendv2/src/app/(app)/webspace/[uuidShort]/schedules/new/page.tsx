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

import { FormEvent, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { FormSection } from '@/components/featherui/FormSection';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { listSupportedTimezones } from '@/lib/dateUtils';
import { useUserTimezone } from '@/contexts/PreferencesContext';
import { safeBack } from '@/lib/safe-back';
import { CronEditor } from '@/components/common/CronEditor';
import { WebSpaceScheduleTasksEditor } from '@/components/webspace/WebSpaceScheduleTasksEditor';
import {
    SCHEDULE_PRESETS,
    emptyScheduleDraft,
    needsCommandPayload,
    type SchedulePresetId,
    type WebSpaceScheduleDraft,
} from '@/lib/webspace-schedules';

export default function WebSpaceScheduleNewPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const userTimezone = useUserTimezone();
    const uuidShort = String(params.uuidShort || '');

    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<WebSpaceScheduleDraft>(() => emptyScheduleDraft(userTimezone || 'UTC'));

    const timezoneOptions = useMemo(() => listSupportedTimezones().map((tz) => ({ id: tz, name: tz })), []);
    const presetOptions = useMemo(
        () => [
            { id: '', name: t('webSpaces.schedules.presets.pick') },
            ...SCHEDULE_PRESETS.map((preset) => ({
                id: preset.id,
                name: t(`webSpaces.schedules.presets.${preset.id}`),
            })),
        ],
        [t],
    );

    const applyPreset = (presetId: string) => {
        if (!presetId) return;
        const preset = SCHEDULE_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        setForm(preset.apply(form.timezone || userTimezone || 'UTC'));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error(t('serverSchedules.nameRequired'));
            return;
        }
        for (const task of form.tasks) {
            if (needsCommandPayload(String(task.action)) && !task.payload.trim()) {
                toast.error(t('webSpaces.schedules.commandRequired'));
                return;
            }
        }

        setSaving(true);
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/schedules`, {
                name: form.name.trim(),
                cron_minute: form.cron_minute,
                cron_hour: form.cron_hour,
                cron_day_of_month: form.cron_day_of_month,
                cron_month: form.cron_month,
                cron_day_of_week: form.cron_day_of_week,
                timezone: form.timezone,
                is_active: form.is_active ? 1 : 0,
                tasks: form.tasks.map((task, index) => ({
                    action: task.action,
                    payload: task.payload ?? '',
                    sequence_id: index + 1,
                    time_offset: task.time_offset ?? 0,
                    continue_on_failure: !!task.continue_on_failure,
                })),
            });
            toast.success(t('serverSchedules.createSuccess'));
            router.push(`/webspace/${uuidShort}/schedules`);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('serverSchedules.createFailed')
                    : t('serverSchedules.createFailed'),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='mx-auto max-w-3xl space-y-6 pb-12'>
            <PageHeader
                title={t('serverSchedules.createSchedule')}
                description={t('webSpaces.schedules.createDescription')}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='glass' onClick={() => safeBack(router)} disabled={saving}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={(e) => void handleSubmit(e as unknown as FormEvent)}
                            disabled={saving}
                            loading={saving}
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('serverSchedules.create')}
                        </Button>
                    </div>
                }
            />

            <form onSubmit={handleSubmit}>
                <FormSection>
                    <div className='space-y-2'>
                        <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                            {t('webSpaces.schedules.presets.label')}
                        </Label>
                        <HeadlessSelect
                            value=''
                            onChange={(val) => applyPreset(String(val) as SchedulePresetId)}
                            options={presetOptions}
                        />
                        <p className='text-muted-foreground text-xs'>{t('webSpaces.schedules.presets.help')}</p>
                    </div>

                    <div className='space-y-2'>
                        <Label
                            htmlFor='name'
                            className='text-muted-foreground text-xs font-bold tracking-wider uppercase'
                        >
                            {t('serverSchedules.name')}
                        </Label>
                        <Input
                            id='name'
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder={t('serverSchedules.namePlaceholder')}
                            required
                        />
                    </div>

                    <CronEditor
                        value={{
                            cron_minute: form.cron_minute,
                            cron_hour: form.cron_hour,
                            cron_day_of_month: form.cron_day_of_month,
                            cron_month: form.cron_month,
                            cron_day_of_week: form.cron_day_of_week,
                        }}
                        onChange={(cron) => setForm({ ...form, ...cron })}
                        labels={{
                            minute: t('serverSchedules.minute'),
                            hour: t('serverSchedules.hour'),
                            dayOfMonth: t('serverSchedules.dayOfMonth'),
                            month: t('serverSchedules.month'),
                            dayOfWeek: t('serverSchedules.dayOfWeek'),
                            help: t('serverSchedules.cronHelp'),
                        }}
                    />

                    <div className='space-y-2'>
                        <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                            {t('serverSchedules.timezone')}
                        </Label>
                        <HeadlessSelect
                            value={form.timezone}
                            onChange={(val) => setForm({ ...form, timezone: String(val) })}
                            options={timezoneOptions}
                        />
                    </div>

                    <WebSpaceScheduleTasksEditor
                        tasks={form.tasks}
                        onChange={(tasks) => setForm({ ...form, tasks })}
                        disabled={saving}
                    />

                    <div className='space-y-2'>
                        <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                            {t('serverSchedules.scheduleEnabled')}
                        </Label>
                        <HeadlessSelect
                            value={form.is_active ? '1' : '0'}
                            onChange={(val) => setForm({ ...form, is_active: String(val) === '1' })}
                            options={[
                                { id: '1', name: t('common.enabled') },
                                { id: '0', name: t('common.disabled') },
                            ]}
                        />
                    </div>
                </FormSection>
            </form>
        </div>
    );
}
