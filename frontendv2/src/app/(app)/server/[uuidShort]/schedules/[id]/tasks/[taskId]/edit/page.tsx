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

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { ListCheck, Save, Lock } from 'lucide-react';

import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { FormSection } from '@/components/featherui/FormSection';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { isEnabledUnlessExplicitlyFalse } from '@/lib/utils';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import type { Database, Task, TaskUpdateRequest } from '@/types/server';
import { safeBack } from '@/lib/safe-back';
import { BackupTaskFields } from '@/components/server/backup/BackupTaskFields';
import {
    buildBackupPayload,
    emptyBackupFields,
    parseBackupFields,
    type BackupFields,
} from '@/components/server/backup/backup-payload';

export default function EditTaskPage() {
    const {
        uuidShort,
        id: scheduleId,
        taskId,
    } = useParams() as {
        uuidShort: string;
        id: string;
        taskId: string;
    };
    const router = useRouter();
    const { t } = useTranslation();
    const { loading: settingsLoading, settings } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const canUpdate = hasPermission('schedule.update');
    const schedulesEnabled = isEnabledUnlessExplicitlyFalse(settings?.server_allow_schedules);

    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [databases, setDatabases] = React.useState<Database[]>([]);
    const [taskCount, setTaskCount] = React.useState(1);
    const [form, setForm] = React.useState<TaskUpdateRequest & { sequence_id: number }>({
        action: 'backup',
        payload: '',
        time_offset: 0,
        continue_on_failure: 0,
        sequence_id: 1,
    });
    const [backup, setBackup] = React.useState<BackupFields>(emptyBackupFields());
    const { getWidgets, fetchWidgets } = usePluginWidgets('server-tasks-edit');

    const actionOptions = React.useMemo(
        () => [
            { id: 'power', name: t('serverTasks.actionPower') },
            { id: 'backup', name: t('serverTasks.actionBackup') },
            { id: 'command', name: t('serverTasks.actionCommand') },
        ],
        [t],
    );

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    React.useEffect(() => {
        if (!settingsLoading && !schedulesEnabled) {
            router.push(`/server/${uuidShort}/schedules`);
            toast.error(t('serverSchedules.disabled'));
        }
    }, [uuidShort, schedulesEnabled, t, router, settingsLoading]);

    React.useEffect(() => {
        const load = async () => {
            if (!uuidShort || !scheduleId || !taskId) return;
            setLoading(true);
            try {
                const [taskRes, tasksRes, databasesRes] = await Promise.all([
                    axios.get<{ success: boolean; data: Task }>(
                        `/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${taskId}`,
                    ),
                    axios.get<{ success: boolean; data: { data: Task[] } }>(
                        `/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks`,
                        { params: { page: 1, per_page: 100 } },
                    ),
                    axios.get<{ success: boolean; data: { data: Database[] } }>(
                        `/api/user/servers/${uuidShort}/databases`,
                        { params: { page: 1, per_page: 100 } },
                    ),
                ]);

                if (!taskRes.data?.success || !taskRes.data?.data) {
                    toast.error(t('serverTasks.failedToFetch'));
                    router.push(`/server/${uuidShort}/schedules/${scheduleId}/tasks`);
                    return;
                }

                const task = taskRes.data.data;
                const normalizedAction = task.action === 'database_backup' ? 'backup' : task.action;
                setForm({
                    action: normalizedAction,
                    payload: task.payload,
                    time_offset: task.time_offset,
                    continue_on_failure: task.continue_on_failure,
                    sequence_id: task.sequence_id,
                });
                setBackup(parseBackupFields(task.action, task.payload || ''));
                setTaskCount(tasksRes.data?.data?.data?.length || 1);
                if (databasesRes.data?.success && databasesRes.data?.data) {
                    setDatabases(databasesRes.data.data.data || []);
                }
            } catch (error) {
                console.error('Failed to load task:', error);
                toast.error(t('serverTasks.failedToFetch'));
                router.push(`/server/${uuidShort}/schedules/${scheduleId}/tasks`);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [uuidShort, scheduleId, taskId, router, t]);

    const handleUpdate = async (e?: React.FormEvent) => {
        e?.preventDefault();
        let payload = form.payload || '';
        const action = form.action === 'database_backup' ? 'backup' : form.action || '';
        if (action === 'backup') {
            const built = buildBackupPayload(backup);
            if (built === null) {
                toast.error(t('serverTasks.selectAtLeastOneDatabase'));
                return;
            }
            payload = built;
        }
        setSaving(true);
        try {
            const { data } = await axios.put(`/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${taskId}`, {
                ...form,
                action,
                payload,
            });
            if (data?.success) {
                toast.success(t('serverTasks.updateSuccess'));
                router.push(`/server/${uuidShort}/schedules/${scheduleId}/tasks`);
            } else {
                toast.error(data?.message || t('serverTasks.updateFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t('serverTasks.updateFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (permissionsLoading || settingsLoading || loading) return null;

    if (!canUpdate) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black tracking-tight uppercase'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => safeBack(router)}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className='mx-auto max-w-4xl space-y-8 pb-16'>
            <WidgetRenderer widgets={getWidgets('server-tasks-edit', 'top-of-page')} />
            <PageHeader
                title={t('serverTasks.editTask')}
                description={t('serverTasks.editTaskDescription')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => safeBack(router)}
                            disabled={saving}
                            className='order-2 sm:order-1'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            variant='default'
                            onClick={() => handleUpdate()}
                            disabled={saving}
                            loading={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            <Save className='mr-2 h-4 w-4' />
                            {t('serverTasks.update')}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-tasks-edit', 'after-header')} />

            <form onSubmit={handleUpdate} className='space-y-8'>
                <FormSection>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <ListCheck className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {t('serverTasks.action')}
                            </h2>
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                {t('serverTasks.actionHelp')}
                            </p>
                        </div>
                    </div>

                    <div className='grid gap-6 sm:grid-cols-2'>
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('serverTasks.action')} <span className='text-primary'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={form.action}
                                onChange={(val) => {
                                    const action = String(val);
                                    setForm({ ...form, action, payload: '' });
                                    setBackup(emptyBackupFields());
                                }}
                                options={actionOptions}
                                disabled={saving}
                            />
                        </div>
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('serverTasks.sequenceId')}
                            </Label>
                            <Input
                                type='number'
                                min='1'
                                max={Math.max(taskCount, form.sequence_id)}
                                value={form.sequence_id}
                                onChange={(e) => setForm({ ...form, sequence_id: Number(e.target.value) })}
                                disabled={saving}
                            />
                            <p className='text-muted-foreground ml-1 text-xs'>{t('serverTasks.sequenceIdHelp')}</p>
                        </div>
                    </div>
                </FormSection>

                <FormSection>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <ListCheck className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {form.action === 'backup' ? t('serverTasks.backupSettings') : t('serverTasks.payload')}
                            </h2>
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                Configuration
                            </p>
                        </div>
                    </div>

                    {form.action === 'power' ? (
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('serverTasks.payload')} <span className='text-primary'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={form.payload}
                                onChange={(val) => setForm({ ...form, payload: String(val) })}
                                options={[
                                    { id: 'start', name: t('serverTasks.startServer') },
                                    { id: 'stop', name: t('serverTasks.stopServer') },
                                    { id: 'restart', name: t('serverTasks.restartServer') },
                                    { id: 'kill', name: t('serverTasks.killServer') },
                                ]}
                                disabled={saving}
                            />
                        </div>
                    ) : form.action === 'backup' ? (
                        <BackupTaskFields
                            fields={backup}
                            setFields={setBackup}
                            databases={databases}
                            disabled={saving}
                        />
                    ) : (
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('serverTasks.payload')}
                                {form.action === 'command' && <span className='text-primary'> *</span>}
                            </Label>
                            <Input
                                value={form.payload}
                                onChange={(e) => setForm({ ...form, payload: e.target.value })}
                                placeholder={
                                    form.action === 'command'
                                        ? t('serverTasks.enterCommand')
                                        : t('serverTasks.payloadValue')
                                }
                                required={form.action === 'command'}
                                disabled={saving}
                            />
                        </div>
                    )}
                </FormSection>

                <FormSection>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <ListCheck className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>Options</h2>
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                Execution
                            </p>
                        </div>
                    </div>

                    <div className='grid gap-6 sm:grid-cols-2'>
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('serverTasks.timeOffset')}
                            </Label>
                            <Input
                                type='number'
                                min='0'
                                value={form.time_offset}
                                onChange={(e) => setForm({ ...form, time_offset: Number(e.target.value) })}
                                disabled={saving}
                            />
                            <p className='text-muted-foreground ml-1 text-xs'>{t('serverTasks.timeOffsetHelp')}</p>
                        </div>
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('serverTasks.continueOnFailure')}
                            </Label>
                            <HeadlessSelect
                                value={String(form.continue_on_failure)}
                                onChange={(val) => setForm({ ...form, continue_on_failure: Number(val) })}
                                options={[
                                    { id: '0', name: t('serverTasks.stopOnFailure') },
                                    { id: '1', name: t('serverTasks.continueOnFailure') },
                                ]}
                                disabled={saving}
                            />
                            <p className='text-muted-foreground ml-1 text-xs'>
                                {t('serverTasks.continueOnFailureHelp')}
                            </p>
                        </div>
                    </div>
                </FormSection>
            </form>
            <WidgetRenderer widgets={getWidgets('server-tasks-edit', 'bottom-of-page')} />
        </div>
    );
}
