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

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
    Calendar,
    CalendarClock,
    Clock,
    Loader2,
    Pencil,
    Play,
    Plus,
    Power,
    RefreshCw,
    Square,
    Trash2,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { formatDateTimeInTz } from '@/lib/dateUtils';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';

interface WebSpaceSchedule {
    id: number;
    name: string;
    cron_minute: string;
    cron_hour: string;
    cron_day_of_month: string;
    cron_month: string;
    cron_day_of_week: string;
    timezone?: string;
    is_active: number | boolean;
    is_processing?: number | boolean;
    next_run_at?: string | null;
    tasks?: { id?: number; action?: string; payload?: string }[];
}

export default function WebSpaceSchedulesPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const uuidShort = String(params.uuidShort || '');

    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<WebSpaceSchedule[]>([]);
    const [busy, setBusy] = useState<number | 'abort' | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<WebSpaceSchedule | null>(null);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/schedules`);
            const list = (data.data?.schedules || []) as WebSpaceSchedule[];
            setSchedules(Array.isArray(list) ? list : []);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('serverSchedules.failedToFetch')
                    : t('serverSchedules.failedToFetch'),
            );
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const formatCron = (schedule: WebSpaceSchedule) =>
        `${schedule.cron_minute} ${schedule.cron_hour} ${schedule.cron_day_of_month} ${schedule.cron_month} ${schedule.cron_day_of_week}`;

    const handleToggle = async (schedule: WebSpaceSchedule) => {
        setBusy(schedule.id);
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/schedules/${schedule.id}/toggle`);
            toast.success(t('serverSchedules.toggleSuccess'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('serverSchedules.toggleFailed')
                    : t('serverSchedules.toggleFailed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const handleExecute = async (schedule: WebSpaceSchedule) => {
        setBusy(schedule.id);
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/schedules/${schedule.id}/execute`);
            toast.success(t('serverSchedules.runQueued'));
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('serverSchedules.runFailed')
                    : t('serverSchedules.runFailed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const handleAbort = async () => {
        setBusy('abort');
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/schedules/abort`);
            toast.success(t('webSpaces.schedules.abortSuccess'));
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.schedules.abortFailed')
                    : t('webSpaces.schedules.abortFailed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setBusy(deleteTarget.id);
        try {
            await axios.delete(`/api/user/webspaces/${uuidShort}/schedules/${deleteTarget.id}`);
            toast.success(t('serverSchedules.deleteSuccess'));
            setDeleteTarget(null);
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('serverSchedules.deleteFailed')
                    : t('serverSchedules.deleteFailed'),
            );
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return <TableSkeleton count={4} />;
    }

    return (
        <WebSpacePageWidgets pageId='webspace-schedules'>
            <div className='space-y-6'>
                <PageHeader
                    title={t('serverSchedules.title')}
                    description={t('serverSchedules.description')}
                    actions={
                        <div className='flex flex-wrap gap-2'>
                            <Button variant='glass' onClick={() => void load()} disabled={busy !== null}>
                                <RefreshCw className='mr-2 h-4 w-4' />
                                {t('common.refresh')}
                            </Button>
                            <Button variant='glass' onClick={() => void handleAbort()} disabled={busy !== null}>
                                <Square className='mr-2 h-4 w-4' />
                                {t('webSpaces.schedules.abortRun')}
                            </Button>
                            <Button onClick={() => router.push(`/webspace/${uuidShort}/schedules/new`)}>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('serverSchedules.createSchedule')}
                            </Button>
                        </div>
                    }
                />

                {schedules.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title={t('serverSchedules.noSchedules')}
                        description={t('serverSchedules.noSchedulesDescription')}
                        action={
                            <Button onClick={() => router.push(`/webspace/${uuidShort}/schedules/new`)}>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('serverSchedules.createSchedule')}
                            </Button>
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {schedules.map((schedule) => {
                            const active = Boolean(schedule.is_active);
                            const processing = Boolean(schedule.is_processing);
                            return (
                                <ResourceCard
                                    key={schedule.id}
                                    icon={Calendar}
                                    iconWrapperClassName={
                                        processing
                                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                            : active
                                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                              : 'bg-gray-500/10 border-gray-500/20 text-gray-500'
                                    }
                                    title={schedule.name}
                                    description={
                                        <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-xs'>
                                            <span className='flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 font-mono'>
                                                <Clock className='h-3 w-3' />
                                                {formatCron(schedule)}
                                            </span>
                                            {schedule.timezone && (
                                                <span className='font-mono'>{schedule.timezone}</span>
                                            )}
                                            {schedule.next_run_at && (
                                                <span className='flex items-center gap-1.5'>
                                                    <CalendarClock className='h-3 w-3' />
                                                    {t('serverSchedules.nextRun')}{' '}
                                                    {formatDateTimeInTz(schedule.next_run_at, dateOpts)}
                                                </span>
                                            )}
                                            <span>
                                                {t('webSpaces.schedules.taskCount', {
                                                    count: String(schedule.tasks?.length ?? 0),
                                                })}
                                            </span>
                                            {(schedule.tasks || []).slice(0, 2).map((task, taskIndex) => {
                                                const action = String(task.action || '');
                                                const actionKey = `webSpaces.schedules.actions.${action}`;
                                                const actionLabel = t(actionKey);
                                                const label =
                                                    action === 'command' || action === 'exec'
                                                        ? `${actionLabel === actionKey ? t('webSpaces.schedules.actions.command') : actionLabel}: ${(task.payload || '').slice(0, 40)}${(task.payload || '').length > 40 ? '…' : ''}`
                                                        : actionLabel === actionKey
                                                          ? action
                                                          : actionLabel;
                                                return (
                                                    <span
                                                        key={`${schedule.id}-task-${task.id ?? taskIndex}`}
                                                        className='rounded-lg bg-white/5 px-2 py-1 font-mono'
                                                    >
                                                        {label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    }
                                    badges={[
                                        {
                                            label: processing
                                                ? t('serverSchedules.statusProcessing')
                                                : active
                                                  ? t('serverSchedules.statusActive')
                                                  : t('serverSchedules.statusInactive'),
                                            className: active
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                : processing
                                                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                  : 'bg-destructive/10 text-destructive border-destructive/20',
                                        },
                                    ]}
                                    actions={
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <Button
                                                variant='glass'
                                                size='sm'
                                                onClick={() =>
                                                    router.push(`/webspace/${uuidShort}/schedules/${schedule.id}/edit`)
                                                }
                                            >
                                                <Pencil className='mr-1.5 h-3.5 w-3.5' />
                                                {t('common.edit')}
                                            </Button>
                                            <Button
                                                variant='glass'
                                                size='sm'
                                                disabled={busy === schedule.id}
                                                onClick={() => void handleExecute(schedule)}
                                            >
                                                {busy === schedule.id ? (
                                                    <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                                ) : (
                                                    <Play className='mr-1.5 h-3.5 w-3.5' />
                                                )}
                                                {t('serverSchedules.runNow')}
                                            </Button>
                                            <Button
                                                variant='glass'
                                                size='sm'
                                                disabled={busy === schedule.id}
                                                onClick={() => void handleToggle(schedule)}
                                            >
                                                <Power className='mr-1.5 h-3.5 w-3.5' />
                                                {active ? t('common.disable') : t('common.enable')}
                                            </Button>
                                            <Button
                                                variant='destructive'
                                                size='sm'
                                                onClick={() => setDeleteTarget(schedule)}
                                            >
                                                <Trash2 className='mr-1.5 h-3.5 w-3.5' />
                                                {t('common.delete')}
                                            </Button>
                                        </div>
                                    }
                                />
                            );
                        })}
                    </div>
                )}

                <Dialog
                    open={deleteTarget !== null}
                    onClose={() => setDeleteTarget(null)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteTarget(null);
                        }
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{t('serverSchedules.confirmDeleteTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('serverSchedules.confirmDeleteDescription', { scheduleName: deleteTarget?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className='flex justify-end gap-2 pt-4'>
                        <Button variant='outline' onClick={() => setDeleteTarget(null)} disabled={busy !== null}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant='destructive' onClick={() => void handleDelete()} disabled={busy !== null}>
                            {t('common.delete')}
                        </Button>
                    </div>
                </Dialog>
            </div>
        </WebSpacePageWidgets>
    );
}
