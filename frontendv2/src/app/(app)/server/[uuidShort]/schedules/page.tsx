/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
} from 'lucide-react';

import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
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

    // Permission checks
    const canRead = hasPermission('schedule.read');
    const canCreate = hasPermission('schedule.create');
    const canUpdate = hasPermission('schedule.update');
    const canDelete = hasPermission('schedule.delete');

    // State
    const [schedules, setSchedules] = React.useState<Schedule[]>([]);
    const [loading, setLoading] = React.useState(true);
    // Widgets
    const { getWidgets, fetchWidgets } = usePluginWidgets('server-schedules');
    const [pagination, setPagination] = React.useState<SchedulePagination>({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
    });

    // Delete Modal State
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [selectedSchedule, setSelectedSchedule] = React.useState<Schedule | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    // Fetch Data
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

    const formatCronExpression = (schedule: Schedule): string => {
        return `${schedule.cron_minute} ${schedule.cron_hour} ${schedule.cron_day_of_month} ${schedule.cron_month} ${schedule.cron_day_of_week}`;
    };

    const getStatusText = (schedule: Schedule): string => {
        if (schedule.is_processing) return t('serverSchedules.statusProcessing');
        if (schedule.is_active) return t('serverSchedules.statusActive');
        return t('serverSchedules.statusInactive');
    };

    if (permissionsLoading || settingsLoading) return null;

    if (!isEnabled(settings?.server_allow_schedules)) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 '>
                <div className='relative'>
                    <div className='absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150' />
                    <div className='relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black uppercase tracking-tight'>
                        {t('serverSchedules.featureDisabled')}
                    </h2>
                    <p className='text-muted-foreground text-lg leading-relaxed font-medium'>
                        {t('serverSchedules.featureDisabledDescription')}
                    </p>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 rounded-2xl h-14 px-10'
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
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>{t('common.loading')}</p>
            </div>
        );
    }

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
        <div key={pathname} className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('server-schedules', 'top-of-page')} />
            {/* Header Section */}
            <PageHeader
                title={t('serverSchedules.title')}
                description={t('serverSchedules.description')}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => fetchData(pagination.current_page)}
                            disabled={loading}
                        >
                            <RefreshCw className={cn('h-5 w-5 mr-2', loading && 'animate-spin')} />
                            {t('common.refresh')}
                        </Button>
                        {canCreate && (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => router.push(`/server/${uuidShort}/schedules/new`)}
                                disabled={loading}
                            >
                                <Plus className='h-5 w-5 mr-2' />
                                {t('serverSchedules.createSchedule')}
                            </Button>
                        )}
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-schedules', 'after-header')} />

            {/* List */}
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
                                <Plus className='h-6 w-6 mr-2' />
                                {t('serverSchedules.createSchedule')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
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
                                    <div className='flex items-center gap-3 text-xs font-medium text-muted-foreground'>
                                        <span className='flex items-center gap-1.5 font-mono bg-white/5 px-2 py-1 rounded-lg'>
                                            <Clock className='h-3 w-3' />
                                            {formatCronExpression(schedule)}
                                        </span>
                                        {schedule.next_run_at && (
                                            <span className='flex items-center gap-1.5 px-2 py-1'>
                                                <CalendarClock className='h-3 w-3' />
                                                Next: {new Date(schedule.next_run_at).toLocaleString()}
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
                                            <Pencil className='h-3.5 w-3.5 mr-1.5' />
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
                                        <ListTodo className='h-3.5 w-3.5 mr-1.5' />
                                        <span className='hidden sm:inline'>{t('serverSchedules.tasks')}</span>
                                    </Button>
                                    {canUpdate && (
                                        <Button
                                            variant={schedule.is_active ? 'warning' : 'default'}
                                            size='sm'
                                            onClick={() => handleToggle(schedule)}
                                        >
                                            <Power className='h-3.5 w-3.5 mr-1.5' />
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
                                            <Trash2 className='h-3.5 w-3.5 mr-1.5' />
                                            <span className='hidden sm:inline'>{t('common.delete')}</span>
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                    ))}
                    {/* Pagination */}
                    {pagination.total > pagination.per_page && (
                        <div className='flex items-center justify-between gap-3 pt-4 border-t border-white/5'>
                            <div className='text-xs text-muted-foreground'>
                                Showing {pagination.from}-{pagination.to} of {pagination.total}
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
                                <div className='text-sm px-2'>
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
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-schedules', 'after-schedules-list')} />
            <WidgetRenderer widgets={getWidgets('server-schedules', 'bottom-of-page')} />
            {/* Delete Modal */}
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
        </div>
    );
}
