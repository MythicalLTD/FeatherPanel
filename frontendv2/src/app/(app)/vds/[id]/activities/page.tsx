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
import { useParams, useRouter } from 'next/navigation';
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
    if (['start', 'play'].some((x) => e.includes(x))) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (['stop', 'kill'].some((x) => e.includes(x))) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (e.includes('reboot') || e.includes('restart')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (['subuser', 'user'].some((x) => e.includes(x))) return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    if (e.includes('console') || e.includes('vnc')) return 'text-violet-500 bg-violet-500/10 border-violet-500/20';
    if (['delete', 'deleted'].some((x) => e.includes(x))) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (e.includes('reinstall')) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-primary bg-primary/10 border-primary/20';
}

function formatRelativeTime(timestamp?: string): string {
    if (!timestamp) return '';
    const diffInSeconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

export default function VdsActivitiesPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading, hasPermission } = useVmInstance();

    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<VmActivityItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
    });

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<VmActivityItem | null>(null);

    const fetchActivities = useCallback(
        async (page = 1) => {
            if (!id) return;
            setLoading(true);
            try {
                const params: Record<string, string | number> = { page, per_page: 10 };
                if (searchQuery.trim()) params.search = searchQuery.trim();

                const { data } = await axios.get(`/api/user/vm-instances/${id}/activities`, { params });
                if (!data.success) {
                    toast.error(data.message || 'Failed to fetch activities');
                    return;
                }

                setActivities(data.data.activities || []);
                const p = data.data.pagination || {};
                setPagination({
                    current_page: p.current_page || 1,
                    per_page: p.per_page || 10,
                    total: p.total || 0,
                    last_page: p.last_page || 1,
                    from: p.from || 0,
                    to: p.to || 0,
                });
            } catch {
                toast.error('Failed to fetch activity log');
            } finally {
                setLoading(false);
            }
        },
        [id, searchQuery],
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
    }, [searchQuery]);

    const changePage = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.last_page) {
            fetchActivities(newPage);
        }
    };

    const rawJson = selectedItem?.metadata ? JSON.stringify(selectedItem.metadata, null, 2) : '';

    if (instanceLoading || (loading && activities.length === 0)) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>Loading activity log…</p>
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
        <div className='space-y-8 pb-12'>
            <PageHeader
                title={t('navigation.items.activities') || 'VDS Activity Log'}
                description={
                    <div className='flex items-center gap-3'>
                        <span>
                            {t('vds.activities.description') ||
                                'All power, subuser and console actions for this VDS instance.'}
                        </span>
                        <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20'>
                            {pagination.total} {t('common.events') || 'events'}
                        </span>
                    </div>
                }
                actions={
                    <Button
                        variant='glass'
                        size='default'
                        onClick={() => fetchActivities(pagination.current_page)}
                        disabled={loading}
                        className='rounded-2xl'
                    >
                        <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                        {t('common.refresh') || 'Refresh'}
                    </Button>
                }
            />

            <div className='flex flex-col md:flex-row gap-4'>
                <div className='relative flex-1 group'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/80 group-focus-within:text-foreground transition-colors' />
                    <Input
                        placeholder='Search events…'
                        className='pl-12 h-14 text-base'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {searchQuery && (
                    <Button
                        variant='glass'
                        size='icon'
                        className='h-14 w-14 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50'
                        onClick={() => setSearchQuery('')}
                    >
                        <X className='h-6 w-6' />
                    </Button>
                )}
            </div>

            {pagination.total > pagination.per_page && (
                <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50'>
                    <Button
                        variant='glass'
                        size='sm'
                        disabled={pagination.current_page <= 1 || loading}
                        onClick={() => changePage(pagination.current_page - 1)}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {pagination.current_page} / {pagination.last_page}
                    </span>
                    <Button
                        variant='glass'
                        size='sm'
                        disabled={pagination.current_page >= pagination.last_page || loading}
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
                    title='No Activity Found'
                    description={
                        searchQuery
                            ? 'No events match your search.'
                            : 'No activity has been recorded for this VDS instance yet.'
                    }
                    icon={Activity}
                    action={
                        searchQuery ? (
                            <Button
                                variant='glass'
                                size='default'
                                onClick={() => setSearchQuery('')}
                                className='h-14 px-10 text-lg rounded-xl'
                            >
                                Clear Search
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
                                                {activity.user?.username || 'System'}
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-2 text-muted-foreground'>
                                            <Clock className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-semibold'>
                                                {activity.timestamp ? formatRelativeTime(activity.timestamp) : '—'}
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

            {pagination.total > pagination.per_page && (
                <div className='flex items-center justify-between py-8 border-t border-border/40 px-6'>
                    <p className='text-sm font-bold opacity-40 uppercase tracking-widest'>
                        Showing {pagination.from}–{pagination.to} of {pagination.total}
                    </p>
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={pagination.current_page <= 1 || loading}
                            onClick={() => changePage(pagination.current_page - 1)}
                            className='h-10 w-10 p-0 rounded-xl'
                        >
                            <ChevronLeft className='h-5 w-5' />
                        </Button>
                        <span className='h-10 px-4 rounded-xl text-sm font-black bg-primary/5 text-primary border border-primary/20 flex items-center justify-center min-w-12'>
                            {pagination.current_page} / {pagination.last_page}
                        </span>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={pagination.current_page >= pagination.last_page || loading}
                            onClick={() => changePage(pagination.current_page + 1)}
                            className='h-10 w-10 p-0 rounded-xl'
                        >
                            <ChevronRight className='h-5 w-5' />
                        </Button>
                    </div>
                </div>
            )}

            {/* Detail dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} className='max-w-[1200px]'>
                {selectedItem && (
                    <div className='space-y-8 p-2 w-full'>
                        <DialogHeader>
                            <div className='flex items-center gap-6'>
                                <div
                                    className={cn(
                                        'h-20 w-20 rounded-4xl flex items-center justify-center border-4 shrink-0',
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
                                            {selectedItem.user?.username || 'System'}
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
                                                className='flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all'
                                            >
                                                <span className='text-[10px] font-black text-primary/50 uppercase tracking-widest'>
                                                    {k}
                                                </span>
                                                <span className='text-base font-mono font-bold break-all'>
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
