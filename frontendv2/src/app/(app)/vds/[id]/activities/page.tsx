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

function formatRelativeTime(timestamp?: string, t?: (key: string, vars?: Record<string, string>) => string): string {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (!t) {
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

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

export default function VdsActivitiesPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading, hasPermission } = useVmInstance();

    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<VmActivityItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEventFilter, setSelectedEventFilter] = useState<'all' | 'power' | 'subuser' | 'console' | 'reinstall'>(
        'all',
    );
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
    const [pendingFilter, setPendingFilter] =
        useState<'all' | 'power' | 'subuser' | 'console' | 'reinstall'>('all');

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
                toast.error('Failed to fetch activity log');
            } finally {
                setLoading(false);
            }
        },
        [id, searchQuery, selectedEventFilter],
    );

    useEffect(() => {
        if (!instanceLoading) {
            if (!hasPermission('activity.read')) {
                toast.error('You do not have permission to view this activity log');
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
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <AlertTriangle className='h-12 w-12 text-destructive mb-4' />
                <h2 className='text-xl font-black'>Instance Not Found</h2>
            </div>
        );
    }

    return (
        <div key={pathname} className='space-y-8 pb-12 '>
            <PageHeader
                title={t('navigation.items.activities') || 'VDS Activity Log'}
                description={
                    <div className='flex items-center gap-3'>
                        <span>
                            {t('vds.activities.description') ||
                                'All power, subuser, backup and console actions for this VDS instance.'}
                        </span>
                        <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20'>
                            {pagination.total_records} {t('serverActivities.events') || 'events'}
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

            <div className='flex flex-col md:flex-row gap-4'>
                <div className='relative flex-1 group'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/80 group-focus-within:text-foreground transition-colors' />
                    <Input
                        placeholder={t('serverActivities.searchPlaceholder') || 'Search events…'}
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

            {pagination.total_records > pagination.per_page && (
                <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50 mb-4'>
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
                                className='h-14 px-10 text-lg rounded-xl'
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
                            className='cursor-pointer animate-in slide-in-from-bottom-2 duration-500 fill-mode-both'
                            icon={getEventIcon(activity.event)}
                            iconWrapperClassName={getEventIconClass(activity.event)}
                            title={formatEvent(activity.event)}
                            badges={
                                <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40'>
                                    #{activity.id}
                                </span>
                            }
                            description={
                                <>
                                    <div className='flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-border/10 w-full mt-2'>
                                        <div className='flex items-center gap-2 text-muted-foreground'>
                                            <User className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-bold uppercase tracking-tight'>
                                                {activity.user?.username || t('serverActivities.details.system')}
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-2 text-muted-foreground'>
                                            <Clock className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-semibold'>
                                                {activity.timestamp ? formatRelativeTime(activity.timestamp, t) : '—'}
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
                    ))}
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

            {/* Filter & view options dialog */}
            <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} className='max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-xl font-bold'>{t('serverActivities.filterDialog.title')}</DialogTitle>
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
                    <Button size='default' onClick={applyFilter} className='order-1 sm:order-3 px-8 font-semibold'>
                        {t('serverActivities.filterDialog.apply')}
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Detail dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} className='max-w-[1200px]'>
                {selectedItem && (
                    <div className='space-y-8 p-2 w-full'>
                        <DialogHeader>
                            <div className='flex items-center gap-6'>
                                <div
                                    className={cn(
                                        'h-20 w-20 rounded-4xl flex items-center justify-center border-4 transition-transform group-hover:scale-105 group-hover:rotate-2 shrink-0',
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
                                    <DialogDescription className='text-xl font-medium opacity-70'>
                                        VDS Activity —{' '}
                                        {selectedItem.timestamp
                                            ? new Date(selectedItem.timestamp).toLocaleString()
                                            : '—'}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className='grid grid-cols-1 xl:grid-cols-2 gap-8'>
                            <div className='space-y-6'>
                                <div className='flex items-center justify-between border-b border-white/5 pb-4'>
                                    <h3 className='text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3'>
                                        <div className='w-1.5 h-4 bg-primary rounded-full' />
                                        Metadata
                                    </h3>
                                </div>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <div className='flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 shrink-0'>
                                        <span className='text-[10px] font-black text-primary/50 uppercase tracking-widest'>
                                            User
                                        </span>
                                        <span className='text-lg font-bold'>
                                            {selectedItem.user?.username || t('serverActivities.details.system')}
                                        </span>
                                    </div>
                                    <div className='flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 shrink-0'>
                                        <span className='text-[10px] font-black text-primary/50 uppercase tracking-widest'>
                                            Timestamp
                                        </span>
                                        <span className='text-lg font-bold'>
                                            {selectedItem.timestamp
                                                ? new Date(selectedItem.timestamp).toLocaleString()
                                                : '—'}
                                        </span>
                                    </div>
                                    {selectedItem.ip && (
                                        <div className='flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 col-span-2'>
                                            <span className='text-[10px] font-black text-primary/50 uppercase tracking-widest'>
                                                IP Address
                                            </span>
                                            <span className='text-lg font-mono font-bold'>{selectedItem.ip}</span>
                                        </div>
                                    )}
                                    {selectedItem.metadata &&
                                        Object.entries(selectedItem.metadata).map(([k, v]) => (
                                            <div
                                                key={k}
                                                className='flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all'
                                            >
                                                <span className='text-[10px] font-black text-primary/50 uppercase tracking-widest underline decoration-primary/20 decoration-2 underline-offset-4'>
                                                    {k}
                                                </span>
                                                <span className='text-base font-mono font-bold break-all leading-tight opacity-90 group-hover:opacity-100'>
                                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className='space-y-6'>
                                <div className='flex items-center justify-between border-b border-white/5 pb-4'>
                                    <h3 className='text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3'>
                                        <div className='w-1.5 h-4 bg-primary rounded-full' />
                                        Raw Payload
                                    </h3>
                                    <Button
                                        variant='glass'
                                        size='sm'
                                        className='h-8 px-4 font-black uppercase tracking-wider opacity-40 hover:opacity-100 border-white/5'
                                        onClick={() => {
                                            navigator.clipboard.writeText(rawJson);
                                            toast.success('Payload copied');
                                        }}
                                    >
                                        <Copy className='h-3.5 w-3.5 mr-2' />
                                        Copy
                                    </Button>
                                </div>
                                <pre className='max-h-[500px] bg-black/40 text-emerald-400 p-8 rounded-4xl overflow-x-auto font-mono text-sm border border-white/5 custom-scrollbar leading-relaxed backdrop-blur-3xl'>
                                    {rawJson || '// No additional metadata'}
                                </pre>
                            </div>
                        </div>

                        <DialogFooter className='border-t border-white/5 pt-8 mt-4 flex items-center justify-end'>
                            <Button
                                size='default'
                                className='px-12 h-14 rounded-2xl font-black uppercase tracking-[0.2em]'
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
