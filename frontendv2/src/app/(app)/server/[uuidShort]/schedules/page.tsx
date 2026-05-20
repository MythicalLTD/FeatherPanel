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
import { useParams, useRouter, usePathname } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    Calendar,
    Plus,
    RefreshCw,
    Pencil,
    Trash2,
    Power,
    ListTodo,
    Clock,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Lock,
    Loader2,
    Play,
    Download,
    Upload,
} from 'lucide-react';

import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { formatDateTimeInTz } from '@/lib/dateUtils';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';
import type { Schedule, SchedulePagination } from '@/types/server';

export default function ServerSchedulesPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const pathname = usePathname();
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { loading: settingsLoading } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const canRead = hasPermission('schedule.read');
    const canCreate = hasPermission('schedule.create');
    const canUpdate = hasPermission('schedule.update');
    const canDelete = hasPermission('schedule.delete');
    const dateOpts = useDateFormatOptions();

    const [schedules, setSchedules] = React.useState<Schedule[]>([]);
    const [loading, setLoading] = React.useState(true);

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-schedules');
    const [pagination, setPagination] = React.useState<SchedulePagination>({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
    });

    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [selectedSchedule, setSelectedSchedule] = React.useState<Schedule | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    const [runningNow, setRunningNow] = React.useState<number | null>(null);
    const [exporting, setExporting] = React.useState<number | null>(null);
    const [isImportOpen, setIsImportOpen] = React.useState(false);
    const [importJson, setImportJson] = React.useState('');
    const [importing, setImporting] = React.useState(false);
    const importFileRef = React.useRef<HTMLInputElement>(null);

    const fetchData = React.useCallback(
        async (page = 1) => {
            if (!uuidShort || !isEnabled(settings?.server_allow_schedules)) return;
            setLoading(true);
            try {
                const { data } = await axios.get<{
                    success: boolean;
                    data: { data: Schedule[]; pagination: SchedulePagination };
                }>(`/api/user/servers/${uuidShort}/schedules`, {
                    params: { page, per_page: 20 },
                });
                if (data?.success && data?.data) {
                    setSchedules(data.data.data || []);
                    setPagination(data.data.pagination);
                }
            } catch (error) {
                console.error('Failed to fetch schedules:', error);
                toast.error(t('serverSchedules.failedToFetch'));
            } finally {
                setLoading(false);
            }
        },
        [uuidShort, settings?.server_allow_schedules, t],
    );

    React.useEffect(() => {
        const schedulesEnabled = isEnabled(settings?.server_allow_schedules);
        if (canRead && schedulesEnabled) {
            fetchData();
            fetchWidgets();
        } else if (!permissionsLoading && !canRead) {
            toast.error(t('serverSchedules.noSchedulePermission'));
            router.push(`/server/${uuidShort}`);
        } else {
            setLoading(false);
        }
    }, [canRead, permissionsLoading, fetchData, fetchWidgets, router, uuidShort, t, settings?.server_allow_schedules]);

    const handleDelete = async () => {
        if (!selectedSchedule) return;
        setDeleting(true);
        try {
            const { data } = await axios.delete(`/api/user/servers/${uuidShort}/schedules/${selectedSchedule.id}`);
            if (data?.success) {
                toast.success(t('serverSchedules.deleteSuccess'));
                setIsDeleteOpen(false);
                fetchData(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverSchedules.deleteFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSchedules.deleteFailed');
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const handleToggle = async (schedule: Schedule) => {
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/schedules/${schedule.id}/toggle`);
            if (data?.success) {
                toast.success(t('serverSchedules.toggleSuccess'));
                fetchData(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverSchedules.toggleFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSchedules.toggleFailed');
            toast.error(msg);
        }
    };

    const handleRunNow = async (schedule: Schedule) => {
        setRunningNow(schedule.id);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/schedules/${schedule.id}/run`);
            if (data?.success) {
                toast.success(t('serverSchedules.runQueued'));
                fetchData(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverSchedules.runFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t('serverSchedules.runFailed'));
        } finally {
            setRunningNow(null);
        }
    };

    const handleExport = async (schedule: Schedule) => {
        setExporting(schedule.id);
        try {
            const { data } = await axios.get(`/api/user/servers/${uuidShort}/schedules/${schedule.id}/export`);
            if (data?.success) {
                const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `schedule-${schedule.name.replace(/\s+/g, '-').toLowerCase()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(t('serverSchedules.exportSuccess'));
            } else {
                toast.error(data?.message || t('serverSchedules.exportFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t('serverSchedules.exportFailed'));
        } finally {
            setExporting(null);
        }
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setImportJson(ev.target?.result as string);
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!importJson.trim()) {
            toast.error(t('serverSchedules.importEmptyPayload'));
            return;
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(importJson);
        } catch {
            toast.error(t('serverSchedules.importInvalidJson'));
            return;
        }
        setImporting(true);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/schedules/import`, parsed);
            if (data?.success) {
                toast.success(t('serverSchedules.importSuccess', { count: String(data.data.tasks_imported) }));
                setIsImportOpen(false);
                setImportJson('');
                fetchData(1);
            } else {
                toast.error(data?.message || t('serverSchedules.importFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t('serverSchedules.importFailed'));
        } finally {
            setImporting(false);
        }
    };

    const formatCronExpression = (schedule: Schedule): string => {
        return `${schedule.cron_minute} ${schedule.cron_hour} ${schedule.cron_day_of_month} ${schedule.cron_month} ${schedule.cron_day_of_week}`;
    };

    const getStatusText = (schedule: Schedule): string => {
        if (schedule.is_processing) return t('serverSchedules.statusProcessing');
        if (schedule.is_active) return t('serverSchedules.statusActive');
        return t('serverSchedules.statusInactive');
    };
    const showHeaderCreateAction = canCreate && schedules.length > 0;

    if (permissionsLoading || settingsLoading) return null;

    if (!isEnabled(settings?.server_allow_schedules)) {
        return (
            <div className='flex flex-col items-center justify-center space-y-8 rounded-[3rem] border border-white/5 bg-[#0A0A0A]/40 py-24 text-center backdrop-blur-3xl'>
                <div className='relative'>
                    <div className='absolute inset-0 scale-150 rounded-full bg-red-500/20 blur-3xl' />
                    <div className='relative flex h-32 w-32 rotate-3 items-center justify-center rounded-3xl border-2 border-red-500/20 bg-red-500/10'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black tracking-tight uppercase'>
                        {t('serverSchedules.featureDisabled')}
                    </h2>
                    <p className='text-muted-foreground text-lg leading-relaxed font-medium'>
                        {t('serverSchedules.featureDisabledDescription')}
                    </p>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 h-14 rounded-2xl px-10'
                    onClick={() => router.push(`/server/${uuidShort}`)}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    if (loading && schedules.length === 0) {
        return (
            <div key={pathname} className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black tracking-tight uppercase'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div key={pathname} className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('server-schedules', 'top-of-page')} />

            <PageHeader
                title={t('serverSchedules.title')}
                description={t('serverSchedules.description')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        {showHeaderCreateAction && (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => router.push(`/server/${uuidShort}/schedules/new`)}
                                disabled={loading}
                                className='order-1 w-full sm:order-3 sm:w-auto'
                            >
                                <Plus className='mr-2 h-5 w-5' />
                                {t('serverSchedules.createSchedule')}
                            </Button>
                        )}
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => fetchData(pagination.current_page)}
                            disabled={loading}
                            className='order-2 sm:order-1'
                            aria-label={t('common.refresh')}
                        >
                            <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('common.refresh')}</span>
                        </Button>
                        {canCreate && (
                            <Button
                                size='default'
                                variant='glass'
                                onClick={() => {
                                    setImportJson('');
                                    setIsImportOpen(true);
                                }}
                                disabled={loading}
                                className='order-2 sm:order-2'
                                aria-label={t('serverSchedules.import')}
                            >
                                <Upload className='h-5 w-5 sm:mr-2' />
                                <span className='hidden sm:inline'>{t('serverSchedules.import')}</span>
                            </Button>
                        )}
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-schedules', 'after-header')} />

            {schedules.length === 0 ? (
                <EmptyState
                    title={t('serverSchedules.noSchedules')}
                    description={t('serverSchedules.noSchedulesDescription')}
                    icon={Calendar}
                    action={
                        canCreate ? (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => router.push(`/server/${uuidShort}/schedules/new`)}
                            >
                                <Plus className='mr-2 h-6 w-6' />
                                {t('serverSchedules.createSchedule')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <>
                    {pagination.total > pagination.per_page && (
                        <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={pagination.current_page <= 1 || loading}
                                onClick={() => fetchData(pagination.current_page - 1)}
                                className='gap-1.5'
                            >
                                <ChevronLeft className='h-4 w-4' />
                                {t('common.previous')}
                            </Button>
                            <span className='text-sm font-medium'>
                                {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={pagination.current_page >= pagination.last_page || loading}
                                onClick={() => fetchData(pagination.current_page + 1)}
                                className='gap-1.5'
                            >
                                {t('common.next')}
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                    <div className='grid grid-cols-1 gap-4'>
                        {schedules.map((schedule) => (
                            <ResourceCard
                                key={schedule.id}
                                icon={Calendar}
                                iconWrapperClassName={
                                    schedule.is_processing
                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                        : schedule.is_active
                                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                          : 'bg-gray-500/10 border-gray-500/20 text-gray-500'
                                }
                                title={schedule.name}
                                description={
                                    <div className='flex flex-col gap-1'>
                                        <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-xs font-medium'>
                                            <span className='flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 font-mono'>
                                                <Clock className='h-3 w-3' />
                                                {formatCronExpression(schedule)}
                                            </span>
                                            {schedule.timezone && (
                                                <span className='flex items-center gap-1.5 px-2 py-1 font-mono'>
                                                    {schedule.timezone}
                                                </span>
                                            )}
                                            {schedule.next_run_at && (
                                                <span className='flex items-center gap-1.5 px-2 py-1'>
                                                    <CalendarClock className='h-3 w-3' />
                                                    {t('serverSchedules.nextRun')}{' '}
                                                    {formatDateTimeInTz(schedule.next_run_at, dateOpts)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                }
                                badges={[
                                    {
                                        label: getStatusText(schedule),
                                        className: schedule.is_active
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                            : schedule.is_processing
                                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                              : 'bg-destructive/10 text-destructive border-destructive/20',
                                    },
                                ]}
                                actions={
                                    <div className='flex items-center gap-2'>
                                        {canUpdate && (
                                            <Button
                                                variant='glass'
                                                size='sm'
                                                onClick={() =>
                                                    router.push(`/server/${uuidShort}/schedules/${schedule.id}/edit`)
                                                }
                                            >
                                                <Pencil className='mr-1.5 h-3.5 w-3.5' />
                                                <span className='hidden sm:inline'>{t('common.edit')}</span>
                                            </Button>
                                        )}
                                        <Button
                                            variant='glass'
                                            size='sm'
                                            onClick={() =>
                                                router.push(`/server/${uuidShort}/schedules/${schedule.id}/tasks`)
                                            }
                                        >
                                            <ListTodo className='mr-1.5 h-3.5 w-3.5' />
                                            <span className='hidden sm:inline'>{t('serverSchedules.tasks')}</span>
                                        </Button>
                                        {canUpdate && (
                                            <Button
                                                variant='glass'
                                                size='sm'
                                                disabled={runningNow === schedule.id || !!schedule.is_processing}
                                                onClick={() => handleRunNow(schedule)}
                                            >
                                                {runningNow === schedule.id ? (
                                                    <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                                ) : (
                                                    <Play className='mr-1.5 h-3.5 w-3.5' />
                                                )}
                                                <span className='hidden sm:inline'>{t('serverSchedules.runNow')}</span>
                                            </Button>
                                        )}
                                        <Button
                                            variant='glass'
                                            size='sm'
                                            disabled={exporting === schedule.id}
                                            onClick={() => handleExport(schedule)}
                                        >
                                            {exporting === schedule.id ? (
                                                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                            ) : (
                                                <Download className='mr-1.5 h-3.5 w-3.5' />
                                            )}
                                            <span className='hidden sm:inline'>{t('serverSchedules.export')}</span>
                                        </Button>
                                        {canUpdate && (
                                            <Button
                                                variant={schedule.is_active ? 'warning' : 'default'}
                                                size='sm'
                                                onClick={() => handleToggle(schedule)}
                                            >
                                                <Power className='mr-1.5 h-3.5 w-3.5' />
                                                <span className='hidden sm:inline'>
                                                    {schedule.is_active ? t('common.disable') : t('common.enable')}
                                                </span>
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant='destructive'
                                                size='sm'
                                                onClick={() => {
                                                    setSelectedSchedule(schedule);
                                                    setIsDeleteOpen(true);
                                                }}
                                            >
                                                <Trash2 className='mr-1.5 h-3.5 w-3.5' />
                                                <span className='hidden sm:inline'>{t('common.delete')}</span>
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                        ))}
                    </div>
                    {pagination.total > pagination.per_page && (
                        <div className='flex items-center justify-between gap-3 border-t border-white/5 pt-4'>
                            <div className='text-muted-foreground text-xs'>
                                {t('serverSchedules.showing', {
                                    from: String(pagination.from),
                                    to: String(pagination.to),
                                    total: String(pagination.total),
                                })}
                            </div>
                            <div className='flex items-center gap-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={pagination.current_page <= 1 || loading}
                                    onClick={() => fetchData(pagination.current_page - 1)}
                                >
                                    <ChevronLeft className='h-4 w-4' />
                                </Button>
                                <div className='px-2 text-sm'>
                                    {pagination.current_page} / {pagination.last_page}
                                </div>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={pagination.current_page >= pagination.last_page || loading}
                                    onClick={() => fetchData(pagination.current_page + 1)}
                                >
                                    <ChevronRight className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <WidgetRenderer widgets={getWidgets('server-schedules', 'after-schedules-list')} />
            <WidgetRenderer widgets={getWidgets('server-schedules', 'bottom-of-page')} />

            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t('serverSchedules.confirmDeleteTitle')}
                description={t('serverSchedules.confirmDeleteDescription', {
                    scheduleName: selectedSchedule?.name || '',
                })}
            >
                <div className='flex justify-end gap-2 pt-4'>
                    <Button variant='outline' onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
                        {deleting ? (
                            <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <Trash2 className='mr-2 h-4 w-4' />
                        )}
                        {t('common.delete')}
                    </Button>
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isImportOpen}
                onClose={() => {
                    if (!importing) {
                        setIsImportOpen(false);
                        setImportJson('');
                    }
                }}
                title={t('serverSchedules.importScheduleTitle')}
                description={t('serverSchedules.importScheduleDescription')}
            >
                <div className='flex flex-col gap-4 pt-2'>
                    <div
                        className='flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-white/5 p-6 transition-colors hover:border-white/20'
                        onClick={() => importFileRef.current?.click()}
                    >
                        <Upload className='text-muted-foreground h-8 w-8' />
                        <p className='text-muted-foreground text-sm'>{t('serverSchedules.clickToUploadJson')}</p>
                        <input
                            ref={importFileRef}
                            type='file'
                            accept='application/json,.json'
                            className='hidden'
                            onChange={handleImportFileChange}
                        />
                    </div>
                    <div className='text-muted-foreground flex items-center gap-3 text-xs'>
                        <div className='h-px flex-1 bg-white/10' />
                        <span>{t('serverSchedules.orPasteJson')}</span>
                        <div className='h-px flex-1 bg-white/10' />
                    </div>
                    <textarea
                        className='text-foreground placeholder:text-muted-foreground focus:ring-primary min-h-40 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs focus:ring-1 focus:outline-none'
                        placeholder='{"name": "My Schedule", "cron_minute": "0", ...}'
                        value={importJson}
                        onChange={(e) => setImportJson(e.target.value)}
                        disabled={importing}
                    />
                    <div className='flex justify-end gap-2'>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsImportOpen(false);
                                setImportJson('');
                            }}
                            disabled={importing}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button variant='default' onClick={handleImport} disabled={importing || !importJson.trim()}>
                            {importing ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Upload className='mr-2 h-4 w-4' />
                            )}
                            {t('serverSchedules.importScheduleButton')}
                        </Button>
                    </div>
                </div>
            </HeadlessModal>
        </div>
    );
}
