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

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    Activity,
    RefreshCw,
    Search,
    X,
    Eye,
    Clock,
    ChevronLeft,
    ChevronRight,
    Archive,
    FileText,
    Server,
    Database,
    Users,
    Play,
    Pause,
    RotateCcw,
    Trash2,
    Lock,
    Unlock,
    Copy,
    CalendarClock,
    ListTodo,
    Network,
    Edit,
    User,
    Globe,
    Loader2,
    SlidersHorizontal,
    Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';

type ActivityMetadata = {
    message?: string;
    command?: string;
    files?: string[];
    action?: string;
    exit_code?: number | string;
    backup_name?: string;
    backup_uuid?: string;
    adapter?: string;
    truncate_directory?: boolean;
    allocation_ip?: string;
    allocation_port?: number;
    server_uuid?: string;
    path?: string;
    filename?: string;
    file_size?: number;
    content_type?: string;
    content_length?: number;
    file_exists?: boolean;
    root?: string;
    file_count?: number;
    database_id?: number;
    database_name?: string;
    username?: string;
    database_host_name?: string;
    schedule_id?: number;
    schedule_name?: string;
    new_status?: string;
    updated_fields?: string[];
    task_id?: number;
    sequence_id?: number;
    subuser_id?: number;
    subusers?: unknown[];
    schedules?: unknown[];
    [key: string]: unknown;
};

type ActivityUser = {
    username: string;
    avatar: string | null;
    role: string | null;
};

type ActivityItem = {
    id: number;
    server_id: number;
    node_id: number;
    user_id: number | null;
    event: string;
    message?: string;
    metadata?: ActivityMetadata | null;
    ip?: string | null;
    timestamp?: string;
    created_at?: string;
    updated_at?: string;
    user?: ActivityUser | null;
};

export default function ServerActivityPage({ params }: { params: Promise<{ uuidShort: string }> }) {
    const { uuidShort } = use(params);
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEventFilter, setSelectedEventFilter] = useState('all');
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
        from: 0,
        to: 0,
    });

    const { fetchWidgets, getWidgets } = usePluginWidgets('server-activities');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [pendingFilter, setPendingFilter] = useState('all');

    const fetchActivities = useCallback(
        async (page = 1) => {
            try {
                setLoading(true);
                const queryParams: Record<string, string | number> = {
                    page,
                    per_page: 10,
                };
                if (searchQuery.trim()) {
                    queryParams.search = searchQuery.trim();
                }

                const { data } = await axios.get(`/api/user/servers/${uuidShort}/activities`, { params: queryParams });

                if (!data.success) {
                    toast.error(data.message || t('serverActivities.failedToFetch'));
                    return;
                }

                const apiItems: ActivityItem[] = (data.data.activities.data || data.data.activities || []).map(
                    (item: ActivityItem) => ({
                        ...item,
                        metadata: normalizeMetadata(item.metadata),
                    }),
                );

                let filteredActivities = apiItems;

                if (selectedEventFilter !== 'all') {
                    filteredActivities = filteredActivities.filter((a) => {
                        const eventLower = a.event.toLowerCase();
                        switch (selectedEventFilter) {
                            case 'backup':
                                return eventLower.includes('backup');
                            case 'power':
                                return ['power', 'start', 'stop', 'restart', 'kill'].some((x) =>
                                    eventLower.includes(x),
                                );
                            case 'file':
                                return eventLower.includes('file') || eventLower.includes('download');
                            case 'database':
                                return eventLower.includes('database');
                            case 'schedule':
                                return eventLower.includes('schedule');
                            case 'task':
                                return eventLower.includes('task');
                            case 'subuser':
                                return eventLower.includes('subuser');
                            case 'allocation':
                                return eventLower.includes('allocation');
                            case 'server':
                                return eventLower.includes('server') && !eventLower.includes('subuser');
                            default:
                                return true;
                        }
                    });
                }

                setActivities(filteredActivities);

                const p = data.data.pagination || {};
                const totalPages = p.total_pages || p.last_page || 1;
                const currentPage = p.current_page || 1;

                setPagination({
                    current_page: currentPage,
                    per_page: p.per_page || 10,
                    total_records: p.total || p.total_records || 0,
                    total_pages: totalPages,
                    has_next: currentPage < totalPages,
                    has_prev: currentPage > 1,
                    from: p.from || 0,
                    to: p.to || 0,
                });
            } catch (error) {
                console.error(error);
                toast.error(t('serverActivities.failedToFetch'));
            } finally {
                setLoading(false);
            }
        },
        [uuidShort, searchQuery, selectedEventFilter, t],
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchActivities(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedEventFilter]);

    useEffect(() => {
        if (!permissionsLoading) {
            if (!hasPermission('activity.read')) {
                toast.error(t('serverActivities.noActivityPermission'));
                router.push(`/server/${uuidShort}`);
                return;
            }
            fetchActivities(1);
        }
    }, [permissionsLoading]);

    function normalizeMetadata(m: unknown): ActivityMetadata | undefined {
        if (m == null) return undefined;
        if (typeof m === 'object') return m as ActivityMetadata;
        if (typeof m === 'string') {
            try {
                return JSON.parse(m) as ActivityMetadata;
            } catch {
                return undefined;
            }
        }
        return undefined;
    }

    function formatEvent(event: string) {
        return event
            .replace(/_/g, ' ')
            .replace(/:/g, ' ')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function getEventIcon(event: string) {
        const eventLower = event.toLowerCase();
        if (eventLower.includes('backup')) return Archive;
        if (['power', 'start', 'play'].some((x) => eventLower.includes(x))) return Play;
        if (['stop', 'kill'].some((x) => eventLower.includes(x))) return Pause;
        if (eventLower.includes('restart')) return RotateCcw;
        if (eventLower.includes('file') || eventLower.includes('download')) return FileText;
        if (eventLower.includes('database')) return Database;
        if (eventLower.includes('schedule')) return CalendarClock;
        if (eventLower.includes('task')) return ListTodo;
        if (['subuser', 'user'].some((x) => eventLower.includes(x))) return Users;
        if (['allocation', 'network'].some((x) => eventLower.includes(x))) return Network;
        if (['setting', 'updated', 'update'].some((x) => eventLower.includes(x))) return Edit;
        if (['delete', 'deleted'].some((x) => eventLower.includes(x))) return Trash2;
        if (eventLower.includes('lock')) return Lock;
        if (eventLower.includes('unlock')) return Unlock;
        return Server;
    }

    function getEventIconClass(event: string) {
        const eventLower = event.toLowerCase();
        if (eventLower.includes('backup')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        if (['start', 'play'].some((x) => eventLower.includes(x)))
            return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (['stop', 'kill'].some((x) => eventLower.includes(x))) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (eventLower.includes('restart')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        if (eventLower.includes('power')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (eventLower.includes('file')) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        if (eventLower.includes('database')) return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
        if (eventLower.includes('schedule')) return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
        if (eventLower.includes('task')) return 'text-pink-500 bg-pink-500/10 border-pink-500/20';
        if (['subuser', 'user'].some((x) => eventLower.includes(x)))
            return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
        if (eventLower.includes('allocation')) return 'text-teal-500 bg-teal-500/10 border-teal-500/20';
        if (eventLower.includes('delete')) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (eventLower.includes('lock')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        if (eventLower.includes('unlock')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        return 'text-primary bg-primary/10 border-primary/20';
    }

    function displayMessage(item: ActivityItem): string {
        if (item.message) return item.message;
        return formatEvent(item.event);
    }

    function formatRelativeTime(timestamp?: string) {
        if (!timestamp) return '';
        const now = new Date();
        const date = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return t('serverActivities.justNow');
        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return t('serverActivities.minutesAgo', { minutes: String(minutes) });
        }
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return t('serverActivities.hoursAgo', { hours: String(hours) });
        }
        if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return t('serverActivities.daysAgo', { days: String(days) });
        }
        return date.toLocaleDateString();
    }

    const detailsPairs =
        selectedItem && selectedItem.metadata
            ? Object.entries(selectedItem.metadata).map(([k, v]) => ({
                  key: k,
                  value: typeof v === 'object' ? JSON.stringify(v) : String(v),
              }))
            : [];

    const rawJson = selectedItem?.metadata ? JSON.stringify(selectedItem.metadata, null, 2) : '';

    const changePage = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPagination((p) => ({ ...p, current_page: newPage }));
            fetchActivities(newPage);
        }
    };

    const filterOptions = [
        { id: 'all', name: t('serverActivities.allEvents') },
        { id: 'server', name: t('serverActivities.filterNames.server') },
        { id: 'backup', name: t('serverActivities.filterNames.backup') },
        { id: 'power', name: t('serverActivities.filterNames.power') },
        { id: 'file', name: t('serverActivities.filterNames.file') },
        { id: 'database', name: t('serverActivities.filterNames.database') },
        { id: 'schedule', name: t('serverActivities.filterNames.schedule') },
        { id: 'task', name: t('serverActivities.filterNames.task') },
        { id: 'subuser', name: t('serverActivities.filterNames.subuser') },
        { id: 'allocation', name: t('serverActivities.filterNames.allocation') },
    ];

    const selectedFilterLabel = filterOptions.find((o) => o.id === selectedEventFilter)?.name ?? t('serverActivities.allEvents');

    const openFilterDialog = () => {
        setPendingFilter(selectedEventFilter);
        setFilterDialogOpen(true);
    };

    const applyFilter = () => {
        setSelectedEventFilter(pendingFilter);
        setFilterDialogOpen(false);
        setTimeout(() => fetchActivities(1), 0);
    };

    const clearFilterInDialog = () => {
        setPendingFilter('all');
        setSelectedEventFilter('all');
        setFilterDialogOpen(false);
        setTimeout(() => fetchActivities(1), 0);
    };

    if (permissionsLoading || (loading && activities.length === 0)) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div key={pathname} className='space-y-8 pb-12 '>
            <PageHeader
                title={t('serverActivities.title')}
                description={
                    <div className='flex items-center gap-3'>
                        <span>{t('serverActivities.description')}</span>
                        <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20'>
                            {pagination.total_records} {t('serverActivities.events')}
                        </span>
                    </div>
                }
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='glass' size='default' onClick={() => fetchActivities()} disabled={loading}>
                            <RefreshCw className={cn('h-5 w-5 mr-2', loading && 'animate-spin')} />
                            {t('common.refresh')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('server-activities', 'activity-top')} />

            <div className='flex flex-col md:flex-row gap-4'>
                <div className='relative flex-1 group'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/80 group-focus-within:text-foreground transition-colors' />
                    <Input
                        placeholder={t('serverActivities.searchPlaceholder')}
                        className='pl-12 h-14 text-base'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className='w-full md:w-auto flex gap-2'>
                    <Button
                        variant='glass'
                        size='default'
                        onClick={openFilterDialog}
                        className='h-14 min-w-[12rem] md:min-w-[14rem] bg-[#0A0A0A]/20 backdrop-blur-md border border-white/5 rounded-xl text-base px-6 hover:bg-[#0A0A0A]/40 transition-colors font-medium flex items-center justify-between gap-3'
                    >
                        <SlidersHorizontal className='h-5 w-5 shrink-0 text-muted-foreground' />
                        <span className='truncate'>{selectedFilterLabel}</span>
                        {(selectedEventFilter !== 'all' || searchQuery) && (
                            <span className='shrink-0 w-2 h-2 rounded-full bg-primary' aria-hidden />
                        )}
                    </Button>
                    {(searchQuery || selectedEventFilter !== 'all') && (
                        <Button
                            variant='glass'
                            size='icon'
                            className='h-14 w-14 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50'
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedEventFilter('all');
                                setTimeout(() => fetchActivities(1), 0);
                            }}
                        >
                            <X className='h-6 w-6' />
                        </Button>
                    )}
                </div>
            </div>

            {activities.length === 0 ? (
                <EmptyState
                    title={t('serverActivities.noActivitiesFound')}
                    description={
                        searchQuery || selectedEventFilter !== 'all'
                            ? t('serverActivities.noActivitiesSearchDescription')
                            : t('serverActivities.noActivitiesDescription')
                    }
                    icon={Activity}
                    action={
                        searchQuery || selectedEventFilter !== 'all' ? (
                            <Button
                                variant='glass'
                                size='default'
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedEventFilter('all');
                                    setTimeout(() => fetchActivities(1), 0);
                                }}
                                className='h-14 px-10 text-lg rounded-xl'
                            >
                                {t('common.clear')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className='space-y-4'>
                    {activities.map((activity, index) => {
                        return (
                            <ResourceCard
                                key={activity.id}
                                onClick={() => {
                                    setSelectedItem(activity);
                                    setDetailsOpen(true);
                                }}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className='cursor-pointer animate-in slide-in-from-bottom-2 duration-500 fill-mode-both'
                                icon={getEventIcon(activity.event)}
                                iconWrapperClassName={getEventIconClass(activity.event)}
                                title={formatEvent(activity.event)}
                                badges={
                                    <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40 shadow-sm'>
                                        {activity.id}
                                    </span>
                                }
                                description={
                                    <>
                                        <p className='w-full text-muted-foreground font-medium line-clamp-1 opacity-80 group-hover:opacity-100 transition-opacity mb-2'>
                                            {displayMessage(activity)}
                                        </p>
                                        <div className='flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 border-t border-border/10 w-full'>
                                            <div className='flex items-center gap-2 text-muted-foreground'>
                                                <User className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-bold uppercase tracking-tight'>
                                                    {activity.user?.username || t('serverActivities.details.system')}
                                                </span>
                                            </div>
                                            <div className='flex items-center gap-2 text-muted-foreground'>
                                                <Clock className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-semibold'>
                                                    {activity.timestamp ? formatRelativeTime(activity.timestamp) : '-'}
                                                </span>
                                            </div>
                                            {activity.ip && (
                                                <div className='flex items-center gap-2 text-muted-foreground'>
                                                    <Globe className='h-4 w-4 opacity-50' />
                                                    <span className='text-xs font-mono font-bold opacity-60 italic'>
                                                        {activity.ip}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                }
                                actions={
                                    <div className='h-12 w-12 rounded-xl group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-all flex items-center justify-center'>
                                        <Eye className='h-6 w-6' />
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {pagination.total_records > pagination.per_page && (
                <div className='flex items-center justify-between py-8 border-t border-border/40 px-6'>
                    <p className='text-sm font-bold opacity-40 uppercase tracking-widest'>
                        {t('serverActivities.pagination.showing', {
                            from: String(pagination.from),
                            to: String(pagination.to),
                            total: String(pagination.total_records),
                        })}
                    </p>
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={!pagination.has_prev || loading}
                            onClick={() => changePage(pagination.current_page - 1)}
                            className='h-10 w-10 p-0 rounded-xl'
                        >
                            <ChevronLeft className='h-5 w-5' />
                        </Button>
                        <span className='h-10 px-4 rounded-xl text-sm font-black bg-primary/5 text-primary border border-primary/20 flex items-center justify-center min-w-12'>
                            {pagination.current_page} / {pagination.total_pages}
                        </span>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={!pagination.has_next || loading}
                            onClick={() => changePage(pagination.current_page + 1)}
                            className='h-10 w-10 p-0 rounded-xl'
                        >
                            <ChevronRight className='h-5 w-5' />
                        </Button>
                    </div>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-activities', 'activity-bottom')} />

            {/* Filter & view options dialog */}
            <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} className='max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-xl font-bold'>
                        {t('serverActivities.filterDialog.title')}
                    </DialogTitle>
                    <DialogDescription className='text-muted-foreground'>
                        {t('serverActivities.filterDialog.whatToShow')}
                    </DialogDescription>
                </DialogHeader>
                <div className='mt-6 space-y-2 max-h-[min(60vh,400px)] overflow-y-auto pr-1 custom-scrollbar'>
                    {filterOptions.map((option) => (
                        <button
                            key={option.id}
                            type='button'
                            onClick={() => setPendingFilter(option.id)}
                            className={cn(
                                'w-full flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left font-medium transition-all',
                                pendingFilter === option.id
                                    ? 'bg-primary/15 border-primary/40 text-primary'
                                    : 'bg-muted/20 border-border/30 text-foreground hover:bg-muted/40 hover:border-border/50',
                            )}
                        >
                            <span>{option.name}</span>
                            {pendingFilter === option.id && <Check className='h-5 w-5 shrink-0 text-primary' />}
                        </button>
                    ))}
                </div>
                <DialogFooter className='mt-6 flex flex-wrap gap-2 sm:gap-3'>
                    <Button
                        variant='glass'
                        size='default'
                        onClick={clearFilterInDialog}
                        className='order-2 sm:order-1'
                    >
                        {t('common.clear')}
                    </Button>
                    <Button
                        variant='glass'
                        size='default'
                        onClick={() => setFilterDialogOpen(false)}
                        className='order-3'
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        size='default'
                        onClick={applyFilter}
                        className='order-1 sm:order-3 px-8 font-semibold'
                    >
                        {t('serverActivities.filterDialog.apply')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} className='max-w-[1200px]'>
                {selectedItem && (
                    <div className='space-y-8 p-2 w-full'>
                        <DialogHeader>
                            <div className='flex items-center gap-6'>
                                <div
                                    className={cn(
                                        'h-20 w-20 rounded-4xl flex items-center justify-center border-4 shadow-2xl transition-transform group-hover:scale-105 group-hover:rotate-2 shrink-0',
                                        getEventIconClass(selectedItem.event),
                                    )}
                                >
                                    {React.createElement(getEventIcon(selectedItem.event), { className: 'h-10 w-10' })}
                                </div>
                                <div className='space-y-1.5 flex-1'>
                                    <div className='flex items-center gap-3'>
                                        <DialogTitle className='text-4xl font-black uppercase tracking-tighter leading-none'>
                                            {formatEvent(selectedItem.event)}
                                        </DialogTitle>
                                        <span className='px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] bg-white/10 border border-white/5 opacity-40'>
                                            #{selectedItem.id}
                                        </span>
                                    </div>
                                    <DialogDescription className='text-xl font-medium opacity-70 leading-relaxed max-w-4xl'>
                                        {selectedItem.message || t('serverActivities.details.description')}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className='grid grid-cols-1 xl:grid-cols-2 gap-8'>
                            <div className='space-y-6'>
                                <div className='flex items-center justify-between border-b border-white/5 pb-4'>
                                    <h3 className='text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3'>
                                        <div className='w-1.5 h-4 bg-primary rounded-full' />
                                        {t('serverActivities.details.metadataPayload')}
                                    </h3>
                                    <span className='text-[10px] font-black opacity-30 uppercase tracking-widest'>
                                        {detailsPairs.length} Keys found
                                    </span>
                                </div>

                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <div className='flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 shrink-0'>
                                        <span className='text-[10px] font-black text-primary/50 uppercase tracking-widest'>
                                            {t('serverActivities.details.executingUser')}
                                        </span>
                                        <div className='flex items-center gap-3'>
                                            <div className='h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center font-black text-xs border border-primary/20'>
                                                {selectedItem.user?.username?.substring(0, 2).toUpperCase() || 'S'}
                                            </div>
                                            <span className='text-lg font-bold truncate'>
                                                {selectedItem.user?.username || t('serverActivities.details.system')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 shrink-0'>
                                        <span className='text-[10px] font-black text-primary/50 uppercase tracking-widest'>
                                            {t('serverActivities.details.timestamp')}
                                        </span>
                                        <div className='flex items-center gap-3'>
                                            <Clock className='h-5 w-5 text-primary opacity-50' />
                                            <span className='text-lg font-bold'>
                                                {selectedItem.timestamp
                                                    ? new Date(selectedItem.timestamp).toLocaleString()
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    {detailsPairs.map((pair) => (
                                        <div
                                            key={pair.key}
                                            className='flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all'
                                        >
                                            <span className='text-[10px] font-black text-primary/50 uppercase tracking-widest underline decoration-primary/20 decoration-2 underline-offset-4'>
                                                {pair.key}
                                            </span>
                                            <span className='text-base font-mono font-bold break-all leading-tight opacity-90 group-hover:opacity-100'>
                                                {pair.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className='space-y-6'>
                                <div className='flex items-center justify-between border-b border-white/5 pb-4'>
                                    <h3 className='text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3'>
                                        <div className='w-1.5 h-4 bg-primary rounded-full' />
                                        {t('serverActivities.details.diagnosticOutput')}
                                    </h3>
                                    <Button
                                        variant='glass'
                                        size='sm'
                                        className='h-8 px-4 font-black uppercase tracking-wider opacity-40 hover:opacity-100 border-white/5'
                                        onClick={() => {
                                            navigator.clipboard.writeText(rawJson);
                                            toast.success(t('serverActivities.details.payloadCopied'));
                                        }}
                                    >
                                        <Copy className='h-3.5 w-3.5 mr-2' />
                                        {t('serverActivities.details.copyPayload')}
                                    </Button>
                                </div>
                                <div className='relative group h-full'>
                                    <pre className='h-full max-h-[600px] bg-black/40 text-emerald-400 p-8 rounded-4xl overflow-x-auto font-mono text-base border border-white/5 custom-scrollbar leading-relaxed backdrop-blur-3xl shadow-2xl'>
                                        {rawJson || '// No additional metadata available'}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className='border-t border-white/5 pt-8 mt-4 flex items-center justify-end'>
                            <Button
                                size='default'
                                className='px-12 h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20'
                                onClick={() => setDetailsOpen(false)}
                            >
                                {t('serverActivities.details.closeEntry')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
