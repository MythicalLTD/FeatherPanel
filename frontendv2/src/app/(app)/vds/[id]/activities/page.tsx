/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import { useParams, useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { useVmInstance } from '@/contexts/VmInstanceContext';
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
    Play,
    Pause,
    RotateCcw,
    Trash2,
    Users,
    User,
    Globe,
    Loader2,
    Server,
    Monitor,
    Copy,
    AlertTriangle,
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
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface VmActivityUser {
    username: string;
    avatar: string | null;
    role: string | null;
}

interface VmActivityItem {
    id: number;
    vm_instance_id: number;
    vm_node_id: number;
    user_id: number | null;
    event: string;
    metadata?: Record<string, unknown> | null;
    ip?: string | null;
    timestamp?: string;
    user?: VmActivityUser | null;
}

function formatEvent(event: string) {
    return event
        .replace(/_/g, ' ')
        .replace(/:/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function getEventIcon(event: string) {
    const e = event.toLowerCase();
    if (e.includes('backup')) return Activity; // VM backups share the same page styling
    if (['start', 'play'].some((x) => e.includes(x))) return Play;
    if (['stop', 'kill'].some((x) => e.includes(x))) return Pause;
    if (e.includes('reboot') || e.includes('restart')) return RotateCcw;
    if (['subuser', 'user'].some((x) => e.includes(x))) return Users;
    if (e.includes('console') || e.includes('vnc')) return Monitor;
    if (['delete', 'deleted'].some((x) => e.includes(x))) return Trash2;
    if (e.includes('reinstall')) return RotateCcw;
    return Server;
}

function getEventIconClass(event: string) {
    const e = event.toLowerCase();
    if (e.includes('backup')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    if (['start', 'play'].some((x) => e.includes(x))) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (['stop', 'kill'].some((x) => e.includes(x))) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (e.includes('reboot') || e.includes('restart')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (['subuser', 'user'].some((x) => e.includes(x))) return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    if (e.includes('console') || e.includes('vnc')) return 'text-violet-500 bg-violet-500/10 border-violet-500/20';
    if (['delete', 'deleted'].some((x) => e.includes(x))) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (e.includes('reinstall')) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-primary bg-primary/10 border-primary/20';
}

export default function VdsActivitiesPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { instance, loading: instanceLoading, hasPermission } = useVmInstance();
    const { fetchWidgets, getWidgets } = usePluginWidgets('vds-activities');

    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<VmActivityItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEventFilter, setSelectedEventFilter] = useState<
        'all' | 'power' | 'subuser' | 'console' | 'reinstall'
    >('all');
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

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<VmActivityItem | null>(null);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [pendingFilter, setPendingFilter] = useState<'all' | 'power' | 'subuser' | 'console' | 'reinstall'>('all');

    const normalizeMetadata = (m: unknown): Record<string, unknown> | undefined => {
        if (m == null) return undefined;
        if (typeof m === 'object') return m as Record<string, unknown>;
        if (typeof m === 'string') {
            try {
                return JSON.parse(m) as Record<string, unknown>;
            } catch {
                return undefined;
            }
        }
        return undefined;
    };

    const fetchActivities = useCallback(
        async (page = 1) => {
            if (!id) return;
            try {
                setLoading(true);
                const params: Record<string, string | number> = {
                    page,
                    per_page: 10,
                };
                if (searchQuery.trim()) {
                    params.search = searchQuery.trim();
                }

                const { data } = await axios.get(`/api/user/vm-instances/${id}/activities`, { params });
                if (!data.success) {
                    toast.error(data.message || 'Failed to fetch activities');
                    return;
                }

                let items: VmActivityItem[] = (data.data.activities || []).map((item: VmActivityItem) => ({
                    ...item,
                    metadata: normalizeMetadata(item.metadata),
                }));

                if (selectedEventFilter !== 'all') {
                    items = items.filter((a) => {
                        const e = a.event.toLowerCase();
                        switch (selectedEventFilter) {
                            case 'power':
                                return ['power', 'start', 'stop', 'reboot', 'restart', 'kill'].some((x) =>
                                    e.includes(x),
                                );
                            case 'subuser':
                                return ['subuser', 'user'].some((x) => e.includes(x));
                            case 'console':
                                return e.includes('console') || e.includes('vnc');
                            case 'reinstall':
                                return e.includes('reinstall');
                            default:
                                return true;
                        }
                    });
                }

                setActivities(items);

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
            } catch {
                toast.error(t('vds.activities.fetch_failed'));
            } finally {
                setLoading(false);
            }
        },
        [id, searchQuery, selectedEventFilter, t],
    );

    useEffect(() => {
        if (!instanceLoading) {
            if (!hasPermission('activity.read')) {
                toast.error(t('vds.activities.permission_denied'));
                router.push(`/vds/${id}`);
                return;
            }
            fetchActivities(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceLoading]);

    useEffect(() => {
        const timer = setTimeout(() => fetchActivities(1), 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, selectedEventFilter]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const changePage = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPagination((p) => ({ ...p, current_page: newPage }));
            fetchActivities(newPage);
        }
    };

    const rawJson = selectedItem?.metadata ? JSON.stringify(selectedItem.metadata, null, 2) : '';

    const filterOptions = [
        { id: 'all', name: t('serverActivities.allEvents') },
        { id: 'power', name: t('serverActivities.filterNames.power') },
        { id: 'subuser', name: t('serverActivities.filterNames.subuser') },
        { id: 'console', name: t('serverActivities.filterNames.file') || 'Console' },
        { id: 'reinstall', name: t('vds.activities.filter.reinstall') || 'Reinstall' },
    ] as const;

    const selectedFilterLabel =
        filterOptions.find((o) => o.id === selectedEventFilter)?.name ?? t('serverActivities.allEvents');

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

    if (instanceLoading || (loading && activities.length === 0)) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <AlertTriangle className='text-destructive mb-4 h-12 w-12' />
                <h2 className='text-xl font-black'>{t('vds.console.not_found_title')}</h2>
            </div>
        );
    }

    return (
        <div key={pathname} className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('vds-activities', 'top-of-page')} />

            <PageHeader
                title={t('navigation.items.activities') || 'VDS Activity Log'}
                description={
                    <div className='flex items-center gap-3'>
                        <span>
                            {t('vds.activities.description') ||
                                'All power, subuser, backup and console actions for this VDS instance.'}
                        </span>
                        <span className='bg-primary/5 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase'>
                            {pagination.total_records} {t('serverActivities.events') || 'events'}
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

            <div className='flex flex-col gap-4 md:flex-row'>
                <div className='group relative flex-1'>
                    <Search className='text-muted-foreground/80 group-focus-within:text-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('serverActivities.searchPlaceholder') || 'Search events…'}
                        className='h-14 pl-12 text-base'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className='flex w-full gap-2 md:w-auto'>
                    <Button
                        variant='glass'
                        size='default'
                        onClick={openFilterDialog}
                        className='flex h-14 min-w-48 items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#0A0A0A]/20 px-6 text-base font-medium backdrop-blur-md transition-colors hover:bg-[#0A0A0A]/40 md:min-w-56'
                    >
                        <SlidersHorizontal className='text-muted-foreground h-5 w-5 shrink-0' />
                        <span className='truncate'>{selectedFilterLabel}</span>
                        {(selectedEventFilter !== 'all' || searchQuery) && (
                            <span className='bg-primary h-2 w-2 shrink-0 rounded-full' aria-hidden />
                        )}
                    </Button>
                    {(searchQuery || selectedEventFilter !== 'all') && (
                        <Button
                            variant='glass'
                            size='icon'
                            className='h-14 w-14 rounded-xl hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500'
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

            {pagination.total_records > pagination.per_page && (
                <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
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
                    title={t('serverActivities.noActivitiesFound') || 'No Activity Found'}
                    description={
                        searchQuery || selectedEventFilter !== 'all'
                            ? t('serverActivities.noActivitiesSearchDescription') ||
                              'No events match your current filters or search.'
                            : t('serverActivities.noActivitiesDescription') ||
                              'No activity has been recorded for this instance yet.'
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
                                className='h-14 rounded-xl px-10 text-lg'
                            >
                                {t('common.clear')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className='space-y-4'>
                    {activities.map((activity, index) => (
                        <ResourceCard
                            key={activity.id}
                            onClick={() => {
                                setSelectedItem(activity);
                                setDetailsOpen(true);
                            }}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className='animate-in slide-in-from-bottom-2 fill-mode-both cursor-pointer duration-500'
                            icon={getEventIcon(activity.event)}
                            iconWrapperClassName={getEventIconClass(activity.event)}
                            title={formatEvent(activity.event)}
                            badges={
                                <span className='bg-background/50 border-border/40 rounded-full border px-3 py-1 text-[10px] leading-none font-black tracking-widest uppercase'>
                                    #{activity.id}
                                </span>
                            }
                            description={
                                <>
                                    <div className='border-border/10 mt-2 flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t pt-2'>
                                        <div className='text-muted-foreground flex items-center gap-2'>
                                            <User className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-bold tracking-tight uppercase'>
                                                {activity.user?.username || t('serverActivities.details.system')}
                                            </span>
                                        </div>
                                        <div className='text-muted-foreground flex items-center gap-2'>
                                            <Clock className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-semibold'>
                                                {activity.timestamp
                                                    ? formatRelativeTime(activity.timestamp, dateOpts)
                                                    : '—'}
                                            </span>
                                        </div>
                                        {activity.ip && (
                                            <div className='text-muted-foreground flex items-center gap-2'>
                                                <Globe className='h-4 w-4 opacity-50' />
                                                <span className='font-mono text-xs font-bold italic opacity-60'>
                                                    {activity.ip}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            }
                            actions={
                                <div className='group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary flex h-12 w-12 items-center justify-center rounded-xl transition-all'>
                                    <Eye className='h-6 w-6' />
                                </div>
                            }
                        />
                    ))}
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

            <WidgetRenderer widgets={getWidgets('vds-activities', 'bottom-of-page')} />

            {/* Filter & view options dialog */}
            <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} className='max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-xl font-bold'>{t('serverActivities.filterDialog.title')}</DialogTitle>
                    <DialogDescription className='text-muted-foreground'>
                        {t('serverActivities.filterDialog.whatToShow')}
                    </DialogDescription>
                </DialogHeader>
                <div className='custom-scrollbar mt-6 max-h-[min(60vh,400px)] space-y-2 overflow-y-auto pr-1'>
                    {filterOptions.map((option) => (
                        <button
                            key={option.id}
                            type='button'
                            onClick={() => setPendingFilter(option.id)}
                            className={cn(
                                'flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left font-medium transition-all',
                                pendingFilter === option.id
                                    ? 'bg-primary/15 border-primary/40 text-primary'
                                    : 'bg-muted/20 border-border/30 text-foreground hover:bg-muted/40 hover:border-border/50',
                            )}
                        >
                            <span>{option.name}</span>
                            {pendingFilter === option.id && <Check className='text-primary h-5 w-5 shrink-0' />}
                        </button>
                    ))}
                </div>
                <DialogFooter className='mt-6 flex flex-wrap gap-2 sm:gap-3'>
                    <Button variant='glass' size='default' onClick={clearFilterInDialog} className='order-2 sm:order-1'>
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
                    <Button size='default' onClick={applyFilter} className='order-1 px-8 font-semibold sm:order-3'>
                        {t('serverActivities.filterDialog.apply')}
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Detail dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} className='max-w-[1200px]'>
                {selectedItem && (
                    <div className='w-full space-y-8 p-2'>
                        <DialogHeader>
                            <div className='flex items-center gap-6'>
                                <div
                                    className={cn(
                                        'flex h-20 w-20 shrink-0 items-center justify-center rounded-4xl border-4 transition-transform group-hover:scale-105 group-hover:rotate-2',
                                        getEventIconClass(selectedItem.event),
                                    )}
                                >
                                    {React.createElement(getEventIcon(selectedItem.event), { className: 'h-10 w-10' })}
                                </div>
                                <div className='flex-1 space-y-1.5'>
                                    <div className='flex items-center gap-3'>
                                        <DialogTitle className='text-4xl leading-none font-black tracking-tighter uppercase'>
                                            {formatEvent(selectedItem.event)}
                                        </DialogTitle>
                                        <span className='rounded-full border border-white/5 bg-white/10 px-4 py-1.5 text-xs font-black tracking-[0.2em] uppercase opacity-40'>
                                            #{selectedItem.id}
                                        </span>
                                    </div>
                                    <DialogDescription className='text-xl font-medium opacity-70'>
                                        VDS Activity —{' '}
                                        {selectedItem.timestamp
                                            ? formatDateTimeInTz(selectedItem.timestamp, dateOpts)
                                            : '—'}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className='grid grid-cols-1 gap-8 xl:grid-cols-2'>
                            <div className='space-y-6'>
                                <div className='flex items-center justify-between border-b border-white/5 pb-4'>
                                    <h3 className='text-primary flex items-center gap-3 text-xs font-black tracking-[0.3em] uppercase'>
                                        <div className='bg-primary h-4 w-1.5 rounded-full' />
                                        Metadata
                                    </h3>
                                </div>
                                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                    <div className='flex shrink-0 flex-col gap-2 rounded-3xl border border-white/5 bg-white/5 p-5'>
                                        <span className='text-primary/50 text-[10px] font-black tracking-widest uppercase'>
                                            User
                                        </span>
                                        <span className='text-lg font-bold'>
                                            {selectedItem.user?.username || t('serverActivities.details.system')}
                                        </span>
                                    </div>
                                    <div className='flex shrink-0 flex-col gap-2 rounded-3xl border border-white/5 bg-white/5 p-5'>
                                        <span className='text-primary/50 text-[10px] font-black tracking-widest uppercase'>
                                            Timestamp
                                        </span>
                                        <span className='text-lg font-bold'>
                                            {selectedItem.timestamp
                                                ? formatDateTimeInTz(selectedItem.timestamp, dateOpts)
                                                : '—'}
                                        </span>
                                    </div>
                                    {selectedItem.ip && (
                                        <div className='col-span-2 flex flex-col gap-2 rounded-3xl border border-white/5 bg-white/5 p-5'>
                                            <span className='text-primary/50 text-[10px] font-black tracking-widest uppercase'>
                                                IP Address
                                            </span>
                                            <span className='font-mono text-lg font-bold'>{selectedItem.ip}</span>
                                        </div>
                                    )}
                                    {selectedItem.metadata &&
                                        Object.entries(selectedItem.metadata).map(([k, v]) => (
                                            <div
                                                key={k}
                                                className='group flex flex-col gap-2 rounded-3xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/10'
                                            >
                                                <span className='text-primary/50 decoration-primary/20 text-[10px] font-black tracking-widest uppercase underline decoration-2 underline-offset-4'>
                                                    {k}
                                                </span>
                                                <span className='font-mono text-base leading-tight font-bold break-all opacity-90 group-hover:opacity-100'>
                                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className='space-y-6'>
                                <div className='flex items-center justify-between border-b border-white/5 pb-4'>
                                    <h3 className='text-primary flex items-center gap-3 text-xs font-black tracking-[0.3em] uppercase'>
                                        <div className='bg-primary h-4 w-1.5 rounded-full' />
                                        Raw Payload
                                    </h3>
                                    <Button
                                        variant='glass'
                                        size='sm'
                                        className='h-8 border-white/5 px-4 font-black tracking-wider uppercase opacity-40 hover:opacity-100'
                                        onClick={() => {
                                            navigator.clipboard.writeText(rawJson);
                                            toast.success(t('vds.activities.payload_copied'));
                                        }}
                                    >
                                        <Copy className='mr-2 h-3.5 w-3.5' />
                                        Copy
                                    </Button>
                                </div>
                                <pre className='custom-scrollbar max-h-[500px] overflow-x-auto rounded-4xl border border-white/5 bg-black/40 p-8 font-mono text-sm leading-relaxed text-emerald-400 backdrop-blur-3xl'>
                                    {rawJson || '// No additional metadata'}
                                </pre>
                            </div>
                        </div>

                        <DialogFooter className='mt-4 flex items-center justify-end border-t border-white/5 pt-8'>
                            <Button
                                size='default'
                                className='h-14 rounded-2xl px-12 font-black tracking-[0.2em] uppercase'
                                onClick={() => setDetailsOpen(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
