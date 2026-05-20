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
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
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
                'font-mono font-bold italic blur-sm transition-all duration-200 hover:blur-none',
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
    const dateOpts = useDateFormatOptions();
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

    function formatItemTime(timestamp?: string) {
        if (!timestamp) return '';
        return formatRelativeTime(timestamp, dateOpts);
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
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
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
                        <span className='bg-primary/5 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase'>
                            {pagination.total_records} {t('serverActivities.events')}
                        </span>
                    </div>
                }
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => fetchActivities()}
                            disabled={loading}
                            aria-label={t('common.refresh')}
                        >
                            <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('common.refresh')}</span>
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('server-activities', 'activity-top')} />

            <div className='space-y-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                    <div className='group relative flex-1'>
                        <Search className='text-muted-foreground/80 group-focus-within:text-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('serverActivities.searchPlaceholder')}
                            className='h-14 pl-12 text-base'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className='flex shrink-0 items-center gap-2'>
                        <DropdownMenu>
                            <DropdownMenuTrigger className='border-border/40 bg-card/50 hover:bg-accent/50 flex h-14 min-w-48 items-center justify-between gap-3 rounded-xl border px-4 text-left font-medium backdrop-blur-sm transition-colors outline-none md:min-w-56'>
                                <SlidersHorizontal className='text-muted-foreground h-5 w-5 shrink-0' />
                                <span className='flex-1 truncate'>{selectedFilterLabel}</span>
                                {(selectedEventFilter !== 'all' || searchQuery) && (
                                    <span className='bg-primary h-2 w-2 shrink-0 rounded-full' aria-hidden />
                                )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align='end'
                                className='bg-card/90 border-border/40 max-h-[min(60vh,400px)] w-64 overflow-y-auto rounded-2xl p-2 backdrop-blur-xl'
                            >
                                {filterOptions.map((option) => (
                                    <DropdownMenuItem
                                        key={option.id}
                                        onClick={() => setSelectedEventFilter(option.id)}
                                        className={cn(
                                            'flex cursor-pointer items-center justify-between gap-3 rounded-xl p-3',
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
                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3 text-red-500 focus:bg-red-500/10 focus:text-red-500'
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
                                className='h-14 w-14 rounded-xl hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500'
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
                    <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
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
                                    className='h-14 rounded-xl px-10 text-lg'
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
                                    className='animate-in slide-in-from-bottom-2 fill-mode-both duration-500'
                                    icon={getEventIcon(activity.event)}
                                    iconWrapperClassName={getEventIconClass(activity.event)}
                                    title={formatEvent(activity.event)}
                                    badges={
                                        <span className='bg-background/50 border-border/40 rounded-full border px-3 py-1 text-[10px] leading-none font-black tracking-widest uppercase'>
                                            {activity.id}
                                        </span>
                                    }
                                    description={
                                        <>
                                            <p className='text-muted-foreground mb-2 line-clamp-1 w-full font-medium opacity-80 transition-opacity group-hover:opacity-100'>
                                                {displayMessage(activity)}
                                            </p>
                                            <div className='border-border/10 flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t pt-1'>
                                                <div className='text-muted-foreground flex items-center gap-2'>
                                                    <User className='h-4 w-4 opacity-50' />
                                                    <span className='text-sm font-bold tracking-tight uppercase'>
                                                        {activity.user?.username ||
                                                            t('serverActivities.details.system')}
                                                    </span>
                                                </div>
                                                <div className='text-muted-foreground flex items-center gap-2'>
                                                    <Clock className='h-4 w-4 opacity-50' />
                                                    <span className='text-sm font-semibold'>
                                                        {activity.timestamp ? formatItemTime(activity.timestamp) : '-'}
                                                    </span>
                                                </div>
                                                {activity.ip && (
                                                    <div className='text-muted-foreground flex items-center gap-2'>
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
                                                className='group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl transition-colors outline-none'
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className='text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors' />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align='end'
                                                className='bg-card/90 border-border/40 w-56 rounded-2xl p-2 backdrop-blur-xl'
                                            >
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSelectedItem(activity);
                                                        setDetailsOpen(true);
                                                    }}
                                                    className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                >
                                                    <Eye className='text-primary h-4 w-4' />
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
                    <div className='border-border/40 flex items-center justify-between border-t px-6 py-8'>
                        <p className='text-sm font-bold tracking-widest uppercase opacity-40'>
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
                                className='h-10 w-10 rounded-xl p-0'
                            >
                                <ChevronLeft className='h-5 w-5' />
                            </Button>
                            <span className='bg-primary/5 text-primary border-primary/20 flex h-10 min-w-12 items-center justify-center rounded-xl border px-4 text-sm font-black'>
                                {pagination.current_page} / {pagination.total_pages}
                            </span>
                            <Button
                                variant='glass'
                                size='sm'
                                disabled={!pagination.has_next || loading}
                                onClick={() => changePage(pagination.current_page + 1)}
                                className='h-10 w-10 rounded-xl p-0'
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
                                <div className='bg-primary/10 border-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border'>
                                    {React.createElement(getEventIcon(selectedItem.event), {
                                        className: 'h-6 w-6 text-primary',
                                    })}
                                </div>
                                <div className='min-w-0 flex-1 space-y-1'>
                                    <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                                        <DialogTitle className='text-foreground text-xl leading-tight font-bold'>
                                            {formatEvent(selectedItem.event)}
                                        </DialogTitle>
                                        <span className='text-muted-foreground text-xs font-medium tabular-nums'>
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
                            <div className='border-border/50 bg-card/40 space-y-4 rounded-2xl border p-5'>
                                <h3 className='text-muted-foreground text-[10px] font-semibold tracking-widest uppercase'>
                                    {t('serverActivities.details.eventSummary')}
                                </h3>
                                <dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                    <div className='space-y-1.5'>
                                        <dt className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                                            {t('serverActivities.details.executingUser')}
                                        </dt>
                                        <dd className='flex items-center gap-2 text-sm font-semibold'>
                                            <div className='bg-primary/10 border-primary/15 text-primary flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold'>
                                                {selectedItem.user?.username?.substring(0, 2).toUpperCase() || 'S'}
                                            </div>
                                            <span className='truncate'>
                                                {selectedItem.user?.username || t('serverActivities.details.system')}
                                            </span>
                                        </dd>
                                    </div>
                                    <div className='space-y-1.5'>
                                        <dt className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                                            {t('serverActivities.details.timestamp')}
                                        </dt>
                                        <dd className='flex items-center gap-2 text-sm font-semibold'>
                                            <Clock className='text-muted-foreground h-4 w-4 shrink-0' />
                                            <span>
                                                {selectedItem.timestamp
                                                    ? formatDateTimeInTz(selectedItem.timestamp, dateOpts)
                                                    : '—'}
                                            </span>
                                        </dd>
                                    </div>
                                    {selectedItem.ip ? (
                                        <div className='space-y-1.5 sm:col-span-2'>
                                            <dt className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                                                {t('serverActivities.details.ipAddress')}
                                            </dt>
                                            <dd className='flex items-center gap-2 text-sm'>
                                                <Globe className='text-muted-foreground h-4 w-4 shrink-0' />
                                                <BlurredIp ip={selectedItem.ip} className='text-sm opacity-90' />
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </div>

                            {detailsPairs.length > 0 ? (
                                <div className='border-border/50 bg-card/40 space-y-3 rounded-2xl border p-5'>
                                    <div className='flex items-center justify-between gap-2'>
                                        <h3 className='text-muted-foreground text-[10px] font-semibold tracking-widest uppercase'>
                                            {t('serverActivities.details.metadataPayload')}
                                        </h3>
                                        <span className='text-muted-foreground text-[10px] tabular-nums'>
                                            {t('serverActivities.details.fieldsCount', {
                                                count: String(detailsPairs.length),
                                            })}
                                        </span>
                                    </div>
                                    <dl className='space-y-4'>
                                        {detailsPairs.map((pair) => (
                                            <div
                                                key={pair.key}
                                                className='border-border/30 space-y-1.5 border-b pb-4 last:border-0 last:pb-0'
                                            >
                                                <dt className='text-muted-foreground text-[10px] font-bold tracking-widest wrap-break-word uppercase'>
                                                    {pair.key}
                                                </dt>
                                                <dd
                                                    className={cn(
                                                        'text-foreground font-mono text-sm break-all',
                                                        shouldBlurIpMetadata(pair.key, pair.value) &&
                                                            'blur-sm transition-all duration-200 hover:blur-none',
                                                    )}
                                                >
                                                    {pair.value}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            ) : null}

                            <div className='border-border/50 bg-muted/30 space-y-3 rounded-2xl border p-4'>
                                <div className='flex items-center justify-between gap-2'>
                                    <h3 className='text-muted-foreground text-[10px] font-semibold tracking-widest uppercase'>
                                        {t('serverActivities.details.diagnosticOutput')}
                                    </h3>
                                    <Button
                                        type='button'
                                        variant='glass'
                                        size='sm'
                                        className='h-8 shrink-0 rounded-lg font-medium'
                                        onClick={() => {
                                            navigator.clipboard.writeText(rawJson || '');
                                            toast.success(t('serverActivities.details.payloadCopied'));
                                        }}
                                    >
                                        <Copy className='mr-2 h-3.5 w-3.5' />
                                        {t('serverActivities.details.copyPayload')}
                                    </Button>
                                </div>
                                <pre className='border-border/40 bg-background/80 text-muted-foreground custom-scrollbar max-h-56 overflow-auto rounded-xl border px-3 py-3 font-mono text-xs leading-relaxed'>
                                    {rawJson || t('serverActivities.details.noMetadata')}
                                </pre>
                            </div>
                        </div>

                        <DialogFooter className='border-border/40 mt-2 border-t px-1 pt-6'>
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
