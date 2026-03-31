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

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    MoreVertical,
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

function shouldBlurIpMetadata(key: string, value: string): boolean {
    const k = key.toLowerCase();
    if (k === 'ip' || k.endsWith('_ip') || k.includes('ip_address')) return true;
    const v = value.trim();
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(v)) return true;
    if (v.includes(':') && /^[0-9a-f:]+$/i.test(v.replace(/^\[|\]$/g, ''))) return true;
    return false;
}

function BlurredIp({ ip, className }: { ip: string; className?: string }) {
    return (
        <span
            className={cn(
                'font-mono font-bold italic blur-sm hover:blur-none transition-all duration-200',
                'text-xs opacity-60',
                className,
            )}
        >
            {ip}
        </span>
    );
}

export default function ServerActivityPage() {
    const params = useParams();
    const uuidShort = params.uuidShort as string;
    const router = useRouter();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const selectedFilterLabel =
        filterOptions.find((o) => o.id === selectedEventFilter)?.name ?? t('serverActivities.allEvents');

    if (permissionsLoading || (loading && activities.length === 0)) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className='space-y-8 pb-12'>
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

            <div className='space-y-6'>
                <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                    <div className='relative flex-1 group'>
                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/80 group-focus-within:text-foreground transition-colors' />
                        <Input
                            placeholder={t('serverActivities.searchPlaceholder')}
                            className='pl-12 h-14 text-base'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                        <DropdownMenu>
                            <DropdownMenuTrigger className='h-14 min-w-48 md:min-w-56 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm px-4 flex items-center justify-between gap-3 outline-none hover:bg-accent/50 transition-colors text-left font-medium'>
                                <SlidersHorizontal className='h-5 w-5 shrink-0 text-muted-foreground' />
                                <span className='truncate flex-1'>{selectedFilterLabel}</span>
                                {(selectedEventFilter !== 'all' || searchQuery) && (
                                    <span className='shrink-0 w-2 h-2 rounded-full bg-primary' aria-hidden />
                                )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align='end'
                                className='w-64 max-h-[min(60vh,400px)] overflow-y-auto bg-card/90 backdrop-blur-xl border-border/40 p-2 rounded-2xl'
                            >
                                {filterOptions.map((option) => (
                                    <DropdownMenuItem
                                        key={option.id}
                                        onClick={() => setSelectedEventFilter(option.id)}
                                        className={cn(
                                            'flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer',
                                            selectedEventFilter === option.id && 'bg-primary/10 text-primary',
                                        )}
                                    >
                                        <span className='font-bold'>{option.name}</span>
                                    </DropdownMenuItem>
                                ))}
                                {(searchQuery || selectedEventFilter !== 'all') && (
                                    <>
                                        <DropdownMenuSeparator className='bg-border/40 my-1' />
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSelectedEventFilter('all');
                                            }}
                                            className='flex items-center gap-3 p-3 rounded-xl cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10'
                                        >
                                            <X className='h-4 w-4' />
                                            <span className='font-bold'>{t('common.clear')}</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {(searchQuery || selectedEventFilter !== 'all') && (
                            <Button
                                variant='glass'
                                size='icon'
                                className='h-14 w-14 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50'
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedEventFilter('all');
                                }}
                            >
                                <X className='h-6 w-6' />
                            </Button>
                        )}
                    </div>
                </div>

                {pagination.total_records > pagination.per_page && (
                    <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50'>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={!pagination.has_prev || loading}
                            onClick={() => changePage(pagination.current_page - 1)}
                            className='gap-1.5'
                        >
                            <ChevronLeft className='h-4 w-4' />
                            {t('common.previous')}
                        </Button>
                        <span className='text-sm font-medium'>
                            {pagination.current_page} / {pagination.total_pages}
                        </span>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={!pagination.has_next || loading}
                            onClick={() => changePage(pagination.current_page + 1)}
                            className='gap-1.5'
                        >
                            {t('common.next')}
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                    </div>
                )}

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
                                    }}
                                    className='h-14 px-10 text-lg rounded-xl'
                                >
                                    {t('common.clear')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {activities.map((activity, index) => {
                            return (
                                <ResourceCard
                                    key={activity.id}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className='animate-in slide-in-from-bottom-2 duration-500 fill-mode-both'
                                    icon={getEventIcon(activity.event)}
                                    iconWrapperClassName={getEventIconClass(activity.event)}
                                    title={formatEvent(activity.event)}
                                    badges={
                                        <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40'>
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
                                                        {activity.user?.username ||
                                                            t('serverActivities.details.system')}
                                                    </span>
                                                </div>
                                                <div className='flex items-center gap-2 text-muted-foreground'>
                                                    <Clock className='h-4 w-4 opacity-50' />
                                                    <span className='text-sm font-semibold'>
                                                        {activity.timestamp
                                                            ? formatRelativeTime(activity.timestamp)
                                                            : '-'}
                                                    </span>
                                                </div>
                                                {activity.ip && (
                                                    <div className='flex items-center gap-2 text-muted-foreground'>
                                                        <Globe className='h-4 w-4 opacity-50' />
                                                        <BlurredIp ip={activity.ip} />
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    }
                                    actions={
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                className='h-12 w-12 rounded-xl group-hover:bg-primary/10 transition-colors flex items-center justify-center outline-none'
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className='h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors' />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align='end'
                                                className='w-56 bg-card/90 backdrop-blur-xl border-border/40 p-2 rounded-2xl'
                                            >
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSelectedItem(activity);
                                                        setDetailsOpen(true);
                                                    }}
                                                    className='flex items-center gap-3 p-3 rounded-xl cursor-pointer'
                                                >
                                                    <Eye className='h-4 w-4 text-primary' />
                                                    <span className='font-bold'>
                                                        {t('serverActivities.viewDetails')}
                                                    </span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
            </div>

            <WidgetRenderer widgets={getWidgets('server-activities', 'activity-bottom')} />

            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} className='max-w-3xl'>
                {selectedItem && (
                    <div className='space-y-6 p-2'>
                        <DialogHeader className='mb-0'>
                            <div className='flex items-start gap-4'>
                                <div className='h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0'>
                                    {React.createElement(getEventIcon(selectedItem.event), {
                                        className: 'h-6 w-6 text-primary',
                                    })}
                                </div>
                                <div className='min-w-0 flex-1 space-y-1'>
                                    <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                                        <DialogTitle className='text-xl font-bold leading-tight text-foreground'>
                                            {formatEvent(selectedItem.event)}
                                        </DialogTitle>
                                        <span className='text-xs font-medium tabular-nums text-muted-foreground'>
                                            #{selectedItem.id}
                                        </span>
                                    </div>
                                    <DialogDescription className='text-sm'>
                                        {selectedItem.message || t('serverActivities.details.description')}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className='space-y-4 px-1'>
                            <div className='rounded-2xl border border-border/50 bg-card/40 p-5 space-y-4'>
                                <h3 className='text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                                    {t('serverActivities.details.eventSummary')}
                                </h3>
                                <dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                    <div className='space-y-1.5'>
                                        <dt className='text-[10px] uppercase font-bold text-muted-foreground tracking-widest'>
                                            {t('serverActivities.details.executingUser')}
                                        </dt>
                                        <dd className='flex items-center gap-2 text-sm font-semibold'>
                                            <div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold border border-primary/15 text-primary'>
                                                {selectedItem.user?.username?.substring(0, 2).toUpperCase() || 'S'}
                                            </div>
                                            <span className='truncate'>
                                                {selectedItem.user?.username || t('serverActivities.details.system')}
                                            </span>
                                        </dd>
                                    </div>
                                    <div className='space-y-1.5'>
                                        <dt className='text-[10px] uppercase font-bold text-muted-foreground tracking-widest'>
                                            {t('serverActivities.details.timestamp')}
                                        </dt>
                                        <dd className='flex items-center gap-2 text-sm font-semibold'>
                                            <Clock className='h-4 w-4 text-muted-foreground shrink-0' />
                                            <span>
                                                {selectedItem.timestamp
                                                    ? new Date(selectedItem.timestamp).toLocaleString()
                                                    : '—'}
                                            </span>
                                        </dd>
                                    </div>
                                    {selectedItem.ip ? (
                                        <div className='space-y-1.5 sm:col-span-2'>
                                            <dt className='text-[10px] uppercase font-bold text-muted-foreground tracking-widest'>
                                                {t('serverActivities.details.ipAddress')}
                                            </dt>
                                            <dd className='flex items-center gap-2 text-sm'>
                                                <Globe className='h-4 w-4 text-muted-foreground shrink-0' />
                                                <BlurredIp ip={selectedItem.ip} className='text-sm opacity-90' />
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </div>

                            {detailsPairs.length > 0 ? (
                                <div className='rounded-2xl border border-border/50 bg-card/40 p-5 space-y-3'>
                                    <div className='flex items-center justify-between gap-2'>
                                        <h3 className='text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                                            {t('serverActivities.details.metadataPayload')}
                                        </h3>
                                        <span className='text-[10px] text-muted-foreground tabular-nums'>
                                            {t('serverActivities.details.fieldsCount', {
                                                count: String(detailsPairs.length),
                                            })}
                                        </span>
                                    </div>
                                    <dl className='space-y-4'>
                                        {detailsPairs.map((pair) => (
                                            <div
                                                key={pair.key}
                                                className='space-y-1.5 border-b border-border/30 pb-4 last:border-0 last:pb-0'
                                            >
                                                <dt className='text-[10px] uppercase font-bold text-muted-foreground tracking-widest wrap-break-word'>
                                                    {pair.key}
                                                </dt>
                                                <dd
                                                    className={cn(
                                                        'text-sm font-mono break-all text-foreground',
                                                        shouldBlurIpMetadata(pair.key, pair.value) &&
                                                            'blur-sm hover:blur-none transition-all duration-200',
                                                    )}
                                                >
                                                    {pair.value}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            ) : null}

                            <div className='rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-3'>
                                <div className='flex items-center justify-between gap-2'>
                                    <h3 className='text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                                        {t('serverActivities.details.diagnosticOutput')}
                                    </h3>
                                    <Button
                                        type='button'
                                        variant='glass'
                                        size='sm'
                                        className='h-8 rounded-lg font-medium shrink-0'
                                        onClick={() => {
                                            navigator.clipboard.writeText(rawJson || '');
                                            toast.success(t('serverActivities.details.payloadCopied'));
                                        }}
                                    >
                                        <Copy className='h-3.5 w-3.5 mr-2' />
                                        {t('serverActivities.details.copyPayload')}
                                    </Button>
                                </div>
                                <pre className='max-h-56 overflow-auto rounded-xl border border-border/40 bg-background/80 px-3 py-3 text-xs font-mono leading-relaxed text-muted-foreground custom-scrollbar'>
                                    {rawJson || t('serverActivities.details.noMetadata')}
                                </pre>
                            </div>
                        </div>

                        <DialogFooter className='border-t border-border/40 pt-6 mt-2 px-1'>
                            <Button
                                type='button'
                                variant='ghost'
                                className='h-12 rounded-xl font-bold'
                                onClick={() => setDetailsOpen(false)}
                            >
                                {t('common.close')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
