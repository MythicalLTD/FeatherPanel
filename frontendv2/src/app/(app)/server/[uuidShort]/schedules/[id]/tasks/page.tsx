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
import { ListCheck, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Lock, AlertTriangle } from 'lucide-react';

import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { isEnabledUnlessExplicitlyFalse } from '@/lib/utils';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import type { Task, Schedule, SchedulePagination, Database } from '@/types/server';
import { safeBack } from '@/lib/safe-back';
import { formatBackupPayloadDisplay, isBackupAction } from '@/components/server/backup/backup-payload';

export default function ServerTasksPage() {
    const { uuidShort, id: scheduleId } = useParams() as { uuidShort: string; id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { loading: settingsLoading, settings } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const canRead = hasPermission('schedule.read');
    const canUpdate = hasPermission('schedule.update');
    const canDelete = hasPermission('schedule.delete');

    const [tasks, setTasks] = React.useState<Task[]>([]);
    const [schedule, setSchedule] = React.useState<Schedule | null>(null);
    const [databases, setDatabases] = React.useState<Database[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [pagination, setPagination] = React.useState<SchedulePagination>({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
    });

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-tasks');
    const schedulesEnabled = isEnabledUnlessExplicitlyFalse(settings?.server_allow_schedules);

    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    const sortedTasks = React.useMemo(() => {
        return [...tasks].sort((a, b) => a.sequence_id - b.sequence_id);
    }, [tasks]);

    const fetchSchedule = React.useCallback(async () => {
        try {
            const { data } = await axios.get<{ success: boolean; data: Schedule }>(
                `/api/user/servers/${uuidShort}/schedules/${scheduleId}`,
            );
            if (data?.success && data?.data) {
                setSchedule(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch schedule:', error);
        }
    }, [uuidShort, scheduleId]);

    const fetchDatabases = React.useCallback(async () => {
        if (!uuidShort) return;
        try {
            const { data } = await axios.get<{
                success: boolean;
                data: { data: Database[] };
            }>(`/api/user/servers/${uuidShort}/databases`, {
                params: { page: 1, per_page: 100 },
            });
            if (data?.success && data?.data) {
                setDatabases(data.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch databases:', error);
        }
    }, [uuidShort]);

    const fetchTasks = React.useCallback(
        async (page = 1) => {
            if (!uuidShort || !scheduleId) return;
            setLoading(true);
            try {
                const { data } = await axios.get<{
                    success: boolean;
                    data: { data: Task[]; pagination: SchedulePagination };
                }>(`/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks`, {
                    params: { page, per_page: 20 },
                });
                if (data?.success && data?.data) {
                    setTasks(data.data.data || []);
                    setPagination(data.data.pagination);
                }
            } catch (error) {
                console.error('Failed to fetch tasks:', error);
                toast.error(t('serverTasks.failedToFetch'));
            } finally {
                setLoading(false);
            }
        },
        [uuidShort, scheduleId, t],
    );

    React.useEffect(() => {
        if (canRead && schedulesEnabled) {
            fetchSchedule();
            fetchTasks();
            fetchDatabases();
            fetchWidgets();
        } else if (!permissionsLoading && !canRead) {
            toast.error(t('serverTasks.noSchedulePermission'));
            router.push(`/server/${uuidShort}/schedules`);
        } else {
            setLoading(false);
        }
    }, [
        canRead,
        permissionsLoading,
        fetchTasks,
        fetchSchedule,
        fetchDatabases,
        router,
        uuidShort,
        t,
        schedulesEnabled,
        fetchWidgets,
    ]);

    const handleDelete = async () => {
        if (!selectedTask) return;
        setDeleting(true);
        try {
            const { data } = await axios.delete(
                `/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${selectedTask.id}`,
            );
            if (data?.success) {
                toast.success(t('serverTasks.deleteSuccess'));
                setIsDeleteOpen(false);
                fetchTasks(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverTasks.deleteFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t('serverTasks.deleteFailed'));
        } finally {
            setDeleting(false);
        }
    };

    const handleMoveUp = async (task: Task) => {
        if (task.sequence_id <= 1) return;
        try {
            const { data } = await axios.put(
                `/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${task.id}/sequence`,
                { sequence_id: task.sequence_id - 1 },
            );
            if (data?.success) {
                toast.success(t('serverTasks.moveUpSuccess'));
                fetchTasks(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverTasks.moveUpFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t('serverTasks.moveUpFailed'));
        }
    };

    const handleMoveDown = async (task: Task) => {
        if (task.sequence_id >= sortedTasks.length) return;
        try {
            const { data } = await axios.put(
                `/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${task.id}/sequence`,
                { sequence_id: task.sequence_id + 1 },
            );
            if (data?.success) {
                toast.success(t('serverTasks.moveDownSuccess'));
                fetchTasks(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverTasks.moveDownFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t('serverTasks.moveDownFailed'));
        }
    };

    const getActionLabel = (action: string): string => {
        switch (action) {
            case 'power':
                return t('serverTasks.actionPower');
            case 'backup':
            case 'database_backup':
                return t('serverTasks.actionBackup');
            case 'command':
                return t('serverTasks.actionCommand');
            default:
                return action;
        }
    };

    const formatTaskPayloadDisplay = (task: Task): string => {
        if (isBackupAction(task.action)) {
            return formatBackupPayloadDisplay(task.action, task.payload || '', databases, {
                files: t('serverTasks.backupTypeFiles'),
                databases: t('serverTasks.backupTypeDatabases'),
                full: t('serverTasks.backupTypeFull'),
                all: t('serverTasks.databaseScopeAll'),
                specific: t('serverTasks.databaseScopeSpecific'),
                noPayload: t('serverTasks.noPayload'),
            });
        }
        return task.payload || t('serverTasks.noPayload');
    };

    if (permissionsLoading || settingsLoading || loading) return null;

    if (!canRead) {
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
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('server-tasks', 'top-of-page')} />

            <PageHeader
                title={t('serverTasks.title')}
                description={t('serverTasks.description', { scheduleName: schedule?.name || '' })}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        {canUpdate && tasks.length > 0 && (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => router.push(`/server/${uuidShort}/schedules/${scheduleId}/tasks/new`)}
                                className='order-1 w-full sm:order-2 sm:w-auto'
                            >
                                <Plus className='mr-2 h-4 w-4' />
                                {t('serverTasks.createTask')}
                            </Button>
                        )}
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => safeBack(router)}
                            disabled={loading}
                            className='order-2 sm:order-1'
                        >
                            {t('common.back')}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-tasks', 'after-header')} />

            {!schedulesEnabled && (
                <div className='flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4'>
                    <AlertTriangle className='h-5 w-5 text-yellow-500' />
                    <p className='text-sm font-medium text-yellow-500'>{t('serverSchedules.disabled')}</p>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-tasks', 'before-tasks-list')} />

            {tasks.length === 0 ? (
                <EmptyState
                    title={t('serverTasks.noTasks')}
                    description={t('serverTasks.noTasksDescription')}
                    icon={ListCheck}
                    action={
                        canUpdate ? (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => router.push(`/server/${uuidShort}/schedules/${scheduleId}/tasks/new`)}
                            >
                                <Plus className='mr-2 h-6 w-6' />
                                {t('serverTasks.createTask')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {sortedTasks.map((task) => (
                        <ResourceCard
                            key={task.id}
                            icon={ListCheck}
                            iconWrapperClassName={
                                task.action === 'power'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                    : isBackupAction(task.action)
                                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                      : 'bg-white/5 border-white/10 text-muted-foreground'
                            }
                            title={getActionLabel(task.action)}
                            description={
                                <div className='flex flex-col gap-1'>
                                    <span className='text-muted-foreground w-fit rounded-md border border-white/5 bg-black/20 px-2 py-1 font-mono text-xs'>
                                        {formatTaskPayloadDisplay(task)}
                                    </span>
                                    {(task.time_offset > 0 || task.continue_on_failure === 1) && (
                                        <div className='text-muted-foreground/60 mt-1 flex items-center gap-3 text-[10px] font-medium tracking-wider uppercase'>
                                            {task.time_offset > 0 && (
                                                <span>
                                                    {t('serverTasks.timeOffset')}: {task.time_offset}s
                                                </span>
                                            )}
                                            {task.continue_on_failure === 1 && (
                                                <span>{t('serverTasks.continueOnFailure')}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            }
                            badges={[
                                {
                                    label: `#${task.sequence_id}`,
                                    className: 'bg-white/5 border-white/10 text-muted-foreground',
                                },
                                ...(task.is_queued === 1
                                    ? [
                                          {
                                              label: t('serverTasks.queued'),
                                              className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                                          },
                                      ]
                                    : []),
                            ]}
                            actions={
                                <div className='flex items-center gap-2'>
                                    {canUpdate && (
                                        <>
                                            <div className='mr-2 flex flex-col gap-1'>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='h-6 w-6 p-0 hover:bg-white/10'
                                                    disabled={task.sequence_id <= 1}
                                                    onClick={() => handleMoveUp(task)}
                                                >
                                                    <ChevronUp className='h-3 w-3' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='h-6 w-6 p-0 hover:bg-white/10'
                                                    disabled={task.sequence_id >= sortedTasks.length}
                                                    onClick={() => handleMoveDown(task)}
                                                >
                                                    <ChevronDown className='h-3 w-3' />
                                                </Button>
                                            </div>
                                            <Button
                                                size='sm'
                                                variant='glass'
                                                className='h-8 w-8 p-0'
                                                onClick={() =>
                                                    router.push(
                                                        `/server/${uuidShort}/schedules/${scheduleId}/tasks/${task.id}/edit`,
                                                    )
                                                }
                                            >
                                                <Pencil className='h-3.5 w-3.5' />
                                            </Button>
                                        </>
                                    )}
                                    {canDelete && (
                                        <Button
                                            size='sm'
                                            variant='destructive'
                                            className='h-8 w-8 p-0'
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setIsDeleteOpen(true);
                                            }}
                                        >
                                            <Trash2 className='h-3.5 w-3.5' />
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-tasks', 'after-tasks-list')} />
            <WidgetRenderer widgets={getWidgets('server-tasks', 'bottom-of-page')} />

            <Dialog
                open={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDeleteOpen(false);
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle>{t('serverTasks.confirmDeleteTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('serverTasks.confirmDeleteDescription', {
                            action: selectedTask ? getActionLabel(selectedTask.action) : '',
                            payload: selectedTask ? formatTaskPayloadDisplay(selectedTask) : t('serverTasks.noPayload'),
                        })}
                    </DialogDescription>
                </DialogHeader>
                <div className='flex justify-end gap-2 pt-4'>
                    <Button variant='glass' onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={handleDelete} disabled={deleting} loading={deleting}>
                        {!deleting && <Trash2 className='mr-2 h-4 w-4' />}
                        {t('serverTasks.confirmDelete')}
                    </Button>
                </div>
            </Dialog>
        </div>
    );
}
