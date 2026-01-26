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
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { isEnabled } from '@/lib/utils';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import type { Task, TaskCreateRequest, TaskUpdateRequest, Schedule, SchedulePagination } from '@/types/server';

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

    const schedulesEnabled = isEnabled(settings?.server_allow_schedules);

    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    const [createForm, setCreateForm] = React.useState<TaskCreateRequest>({
        action: '',
        payload: '',
        time_offset: 0,
        continue_on_failure: 0,
    });

    const [editForm, setEditForm] = React.useState<TaskUpdateRequest & { sequence_id: number }>({
        action: '',
        payload: '',
        time_offset: 0,
        continue_on_failure: 0,
        sequence_id: 1,
    });

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
            fetchWidgets();
        } else if (!permissionsLoading && !canRead) {
            toast.error(t('serverTasks.noSchedulePermission'));
            router.push(`/server/${uuidShort}/schedules`);
        } else {
            setLoading(false);
        }
    }, [canRead, permissionsLoading, fetchTasks, fetchSchedule, router, uuidShort, t, schedulesEnabled, fetchWidgets]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await axios.post(
                `/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks`,
                createForm,
            );
            if (data?.success) {
                toast.success(t('serverTasks.createSuccess'));
                setIsCreateOpen(false);
                fetchTasks(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverTasks.createFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t('serverTasks.createFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;
        setSaving(true);
        try {
            const { data } = await axios.put(
                `/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${selectedTask.id}`,
                editForm,
            );
            if (data?.success) {
                toast.success(t('serverTasks.updateSuccess'));
                setIsEditOpen(false);
                fetchTasks(pagination.current_page);
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
                {
                    sequence_id: task.sequence_id - 1,
                },
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
                {
                    sequence_id: task.sequence_id + 1,
                },
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

    const getPayloadPlaceholder = (action: string): string => {
        switch (action) {
            case 'power':
                return t('serverTasks.selectPowerActionFromDropdown');
            case 'backup':
                return t('serverTasks.backupIgnoredFilesPlaceholder');
            case 'command':
                return t('serverTasks.enterCommand');
            default:
                return t('serverTasks.payloadValue');
        }
    };

    const getPayloadHelp = (action: string): string => {
        switch (action) {
            case 'power':
                return t('serverTasks.selectPowerActionHelp');
            case 'backup':
                return t('serverTasks.backupIgnoredFilesHelp');
            case 'command':
                return t('serverTasks.commandHelp');
            default:
                return t('serverTasks.additionalDataHelp');
        }
    };

    if (permissionsLoading || settingsLoading || loading) return null;

    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black uppercase tracking-tight'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className='space-y-6 '>
            <WidgetRenderer widgets={getWidgets('server-tasks', 'top-of-page')} />

            <PageHeader
                title={t('serverTasks.title')}
                description={t('serverTasks.description', { scheduleName: schedule?.name || '' })}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='glass' size='default' onClick={() => router.back()} disabled={loading}>
                            {t('common.back')}
                        </Button>
                        {canUpdate && (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => {
                                    setCreateForm({ action: '', payload: '', time_offset: 0, continue_on_failure: 0 });
                                    setIsCreateOpen(true);
                                }}
                            >
                                <Plus className='h-4 w-4 mr-2' />
                                {t('serverTasks.createTask')}
                            </Button>
                        )}
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-tasks', 'after-header')} />

            {!schedulesEnabled && (
                <div className='p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3'>
                    <AlertTriangle className='h-5 w-5 text-yellow-500' />
                    <p className='text-sm text-yellow-500 font-medium'>{t('serverSchedules.disabled')}</p>
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
                                onClick={() => {
                                    setCreateForm({ action: '', payload: '', time_offset: 0, continue_on_failure: 0 });
                                    setIsCreateOpen(true);
                                }}
                            >
                                <Plus className='h-6 w-6 mr-2' />
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
                                    : task.action === 'backup'
                                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                      : 'bg-white/5 border-white/10 text-muted-foreground'
                            }
                            title={task.action}
                            description={
                                <div className='flex flex-col gap-1'>
                                    <span className='font-mono text-xs text-muted-foreground bg-black/20 px-2 py-1 rounded-md border border-white/5 w-fit'>
                                        {task.payload || t('serverTasks.noPayload')}
                                    </span>
                                    {(task.time_offset > 0 || task.continue_on_failure === 1) && (
                                        <div className='flex items-center gap-3 text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider mt-1'>
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
                                            <div className='flex flex-col gap-1 mr-2'>
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
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setEditForm({
                                                        action: task.action,
                                                        payload: task.payload,
                                                        time_offset: task.time_offset,
                                                        continue_on_failure: task.continue_on_failure,
                                                        sequence_id: task.sequence_id,
                                                    });
                                                    setIsEditOpen(true);
                                                }}
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

            <HeadlessModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title={t('serverTasks.createTask')}
                description={t('serverTasks.createTaskDescription')}
            >
                <form onSubmit={handleCreate} className='space-y-4 pt-4'>
                    <div className='space-y-2'>
                        <Label>{t('serverTasks.action')}</Label>
                        <HeadlessSelect
                            value={createForm.action}
                            onChange={(val) => setCreateForm({ ...createForm, action: String(val), payload: '' })}
                            options={[
                                { id: 'power', name: t('serverTasks.actionPower') },
                                { id: 'backup', name: t('serverTasks.actionBackup') },
                                { id: 'command', name: t('serverTasks.actionCommand') },
                            ]}
                            placeholder={t('serverTasks.selectActionType')}
                        />
                        <p className='text-xs text-muted-foreground'>{t('serverTasks.actionHelp')}</p>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverTasks.payload')}</Label>
                        {createForm.action === 'power' ? (
                            <HeadlessSelect
                                value={createForm.payload}
                                onChange={(val) => setCreateForm({ ...createForm, payload: String(val) })}
                                options={[
                                    { id: 'start', name: t('serverTasks.startServer') },
                                    { id: 'stop', name: t('serverTasks.stopServer') },
                                    { id: 'restart', name: t('serverTasks.restartServer') },
                                    { id: 'kill', name: t('serverTasks.killServer') },
                                ]}
                                placeholder={t('serverTasks.selectPowerAction')}
                            />
                        ) : (
                            <Input
                                value={createForm.payload}
                                onChange={(e) => setCreateForm({ ...createForm, payload: e.target.value })}
                                placeholder={getPayloadPlaceholder(createForm.action)}
                                required={createForm.action === 'command'}
                            />
                        )}
                        <p className='text-xs text-muted-foreground'>{getPayloadHelp(createForm.action)}</p>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverTasks.timeOffset')}</Label>
                        <Input
                            type='number'
                            min='0'
                            value={createForm.time_offset}
                            onChange={(e) => setCreateForm({ ...createForm, time_offset: Number(e.target.value) })}
                        />
                        <p className='text-xs text-muted-foreground'>{t('serverTasks.timeOffsetHelp')}</p>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverTasks.continueOnFailure')}</Label>
                        <HeadlessSelect
                            value={String(createForm.continue_on_failure)}
                            onChange={(val) => setCreateForm({ ...createForm, continue_on_failure: Number(val) })}
                            options={[
                                { id: '0', name: t('serverTasks.stopOnFailure') },
                                { id: '1', name: t('serverTasks.continueOnFailure') },
                            ]}
                        />
                        <p className='text-xs text-muted-foreground'>{t('serverTasks.continueOnFailureHelp')}</p>
                    </div>

                    <div className='flex justify-end gap-2 pt-4'>
                        <Button type='button' variant='glass' onClick={() => setIsCreateOpen(false)} disabled={saving}>
                            {t('common.cancel')}
                        </Button>
                        <Button type='submit' disabled={saving} variant='default' loading={saving}>
                            {!saving && <Plus className='mr-2 h-4 w-4' />}
                            {t('serverTasks.create')}
                        </Button>
                    </div>
                </form>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title={t('serverTasks.editTask')}
                description={t('serverTasks.editTaskDescription')}
            >
                <form onSubmit={handleUpdate} className='space-y-4 pt-4'>
                    <div className='space-y-2'>
                        <Label>{t('serverTasks.action')}</Label>
                        <HeadlessSelect
                            value={editForm.action}
                            onChange={(val) => setEditForm({ ...editForm, action: String(val), payload: '' })}
                            options={[
                                { id: 'power', name: t('serverTasks.actionPower') },
                                { id: 'backup', name: t('serverTasks.actionBackup') },
                                { id: 'command', name: t('serverTasks.actionCommand') },
                            ]}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverTasks.sequenceId')}</Label>
                        <Input
                            type='number'
                            min='1'
                            max={Math.max(sortedTasks.length, editForm.sequence_id)}
                            value={editForm.sequence_id}
                            onChange={(e) => setEditForm({ ...editForm, sequence_id: Number(e.target.value) })}
                        />
                        <p className='text-xs text-muted-foreground'>{t('serverTasks.sequenceIdHelp')}</p>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverTasks.payload')}</Label>
                        {editForm.action === 'power' ? (
                            <HeadlessSelect
                                value={editForm.payload}
                                onChange={(val) => setEditForm({ ...editForm, payload: String(val) })}
                                options={[
                                    { id: 'start', name: t('serverTasks.startServer') },
                                    { id: 'stop', name: t('serverTasks.stopServer') },
                                    { id: 'restart', name: t('serverTasks.restartServer') },
                                    { id: 'kill', name: t('serverTasks.killServer') },
                                ]}
                            />
                        ) : (
                            <Input
                                value={editForm.payload}
                                onChange={(e) => setEditForm({ ...editForm, payload: e.target.value })}
                                placeholder={getPayloadPlaceholder(editForm.action)}
                                required={editForm.action === 'command'}
                            />
                        )}
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverTasks.timeOffset')}</Label>
                        <Input
                            type='number'
                            min='0'
                            value={editForm.time_offset}
                            onChange={(e) => setEditForm({ ...editForm, time_offset: Number(e.target.value) })}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverTasks.continueOnFailure')}</Label>
                        <HeadlessSelect
                            value={String(editForm.continue_on_failure)}
                            onChange={(val) => setEditForm({ ...editForm, continue_on_failure: Number(val) })}
                            options={[
                                { id: '0', name: t('serverTasks.stopOnFailure') },
                                { id: '1', name: t('serverTasks.continueOnFailure') },
                            ]}
                        />
                    </div>

                    <div className='flex justify-end gap-2 pt-4'>
                        <Button type='button' variant='glass' onClick={() => setIsEditOpen(false)} disabled={saving}>
                            {t('common.cancel')}
                        </Button>
                        <Button type='submit' disabled={saving} variant='default' loading={saving}>
                            {t('serverTasks.update')}
                        </Button>
                    </div>
                </form>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t('serverTasks.confirmDeleteTitle')}
                description={t('serverTasks.confirmDeleteDescription', {
                    action: selectedTask?.action || '',
                    payload: selectedTask?.payload || t('serverTasks.noPayload'),
                })}
            >
                <div className='flex justify-end gap-2 pt-4'>
                    <Button variant='glass' onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={handleDelete} disabled={deleting} loading={deleting}>
                        {!deleting && <Trash2 className='mr-2 h-4 w-4' />}
                        {t('serverTasks.confirmDelete')}
                    </Button>
                </div>
            </HeadlessModal>
        </div>
    );
}
