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

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { FormSection } from '@/components/featherui/FormSection';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { listSupportedTimezones } from '@/lib/dateUtils';
import { safeBack } from '@/lib/safe-back';
import { CronEditor } from '@/components/common/CronEditor';
import { WebSpaceScheduleTasksEditor } from '@/components/webspace/WebSpaceScheduleTasksEditor';
import {
    emptyScheduleDraft,
    emptyScheduleTask,
    isWebSpaceScheduleLocked,
    needsCommandPayload,
    type WebSpaceScheduleDraft,
    type WebSpaceScheduleTaskDraft,
} from '@/lib/webspace-schedules';

interface ScheduleTask {
    id?: number;
    action: string;
    payload?: string;
    sequence_id?: number;
    time_offset?: number;
    continue_on_failure?: boolean | number;
}

export default function WebSpaceScheduleEditPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const uuidShort = String(params.uuidShort || '');
    const scheduleId = String(params.id || '');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<WebSpaceScheduleDraft>(emptyScheduleDraft());

    const timezoneOptions = useMemo(() => listSupportedTimezones().map((tz) => ({ id: tz, name: tz })), []);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/schedules/${scheduleId}`);
                const schedule = data.data?.schedule;
                if (!schedule) {
                    throw new Error('Schedule not found');
                }
                if (isWebSpaceScheduleLocked(schedule)) {
                    toast.error(t('webSpaces.schedules.lockedCannotChange'));
                    router.replace(`/webspace/${uuidShort}/schedules`);
                    return;
                }
                const tasks = ((schedule.tasks || []) as ScheduleTask[]).map(
                    (task, index): WebSpaceScheduleTaskDraft => ({
                        action: task.action || 'restart',
                        payload: task.payload || '',
                        sequence_id: task.sequence_id ?? index + 1,
                        time_offset: task.time_offset ?? 0,
                        continue_on_failure: !!task.continue_on_failure,
                    }),
                );
                setForm({
                    name: schedule.name || '',
                    cron_minute: schedule.cron_minute || '*',
                    cron_hour: schedule.cron_hour || '*',
                    cron_day_of_month: schedule.cron_day_of_month || '*',
                    cron_month: schedule.cron_month || '*',
                    cron_day_of_week: schedule.cron_day_of_week || '*',
                    timezone: schedule.timezone || 'UTC',
                    is_active: !!schedule.is_active,
                    tasks: tasks.length > 0 ? tasks : [emptyScheduleTask(1)],
                });
            } catch (err) {
                toast.error(
                    isAxiosError(err)
                        ? err.response?.data?.message || t('serverSchedules.loadFailed')
                        : t('serverSchedules.loadFailed'),
                );
                router.push(`/webspace/${uuidShort}/schedules`);
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [uuidShort, scheduleId, router, t]);

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
            await axios.put(`/api/user/webspaces/${uuidShort}/schedules/${scheduleId}`, {
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
            toast.success(t('serverSchedules.updateSuccess'));
            router.push(`/webspace/${uuidShort}/schedules`);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('serverSchedules.updateFailed')
                    : t('serverSchedules.updateFailed'),
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <TableSkeleton count={6} />;
    }

    return (
        <div className='mx-auto max-w-3xl space-y-6 pb-12'>
            <PageHeader
                title={t('serverSchedules.editSchedule')}
                description={t('webSpaces.schedules.editDescription')}
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
                            <Save className='mr-2 h-4 w-4' />
                            {t('serverSchedules.update')}
                        </Button>
                    </div>
                }
            />

            <form onSubmit={handleSubmit}>
                <FormSection>
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
