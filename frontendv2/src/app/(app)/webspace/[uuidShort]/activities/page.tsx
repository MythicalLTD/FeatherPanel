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

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import {
    Activity,
    Archive,
    CalendarClock,
    Clock,
    ChevronLeft,
    ChevronRight,
    Database,
    Edit,
    Eye,
    FileText,
    Loader2,
    Mail,
    MoreVertical,
    Pause,
    Play,
    RefreshCw,
    RotateCcw,
    Search,
    Server,
    Trash2,
    User,
    Users,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';

type ActivityMetadata = Record<string, unknown>;

interface ActivityItem {
    id: number;
    event: string;
    message?: string;
    metadata?: ActivityMetadata | string | null;
    ip?: string | null;
    timestamp?: string;
    user?: { username: string; avatar?: string | null; role?: string | null } | null;
}

function normalizeMetadata(m: unknown): ActivityMetadata | null {
    if (m == null) return null;
    if (typeof m === 'object' && !Array.isArray(m)) return m as ActivityMetadata;
    if (typeof m === 'string') {
        try {
            const parsed = JSON.parse(m) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as ActivityMetadata;
        } catch {
            return { value: m };
        }
    }
    return null;
}

function formatEvent(event: string) {
    return event
        .replace(/_/g, ' ')
        .replace(/[.:]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getEventIcon(event: string) {
    const e = event.toLowerCase();
    if (e.includes('backup')) return Archive;
    if (['start', 'play'].some((x) => e.includes(x))) return Play;
    if (['stop', 'kill'].some((x) => e.includes(x))) return Pause;
    if (e.includes('restart')) return RotateCcw;
    if (e.includes('file') || e.includes('download') || e.includes('wordpress') || e.includes('app')) return FileText;
    if (e.includes('database')) return Database;
    if (e.includes('schedule')) return CalendarClock;
    if (e.includes('mail')) return Mail;
    if (['subuser', 'user'].some((x) => e.includes(x))) return Users;
    if (['setting', 'updated', 'update'].some((x) => e.includes(x))) return Edit;
    if (['delete', 'deleted'].some((x) => e.includes(x))) return Trash2;
    return Server;
}

function getEventIconClass(event: string) {
    const e = event.toLowerCase();
    if (e.includes('backup')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    if (['start', 'play'].some((x) => e.includes(x))) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (['stop', 'kill'].some((x) => e.includes(x))) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (e.includes('restart')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    if (e.includes('file') || e.includes('wordpress') || e.includes('app'))
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (e.includes('database')) return 'text-primary bg-primary/10 border-primary/20';
    if (e.includes('schedule')) return 'text-primary bg-primary/10 border-primary/20';
    if (e.includes('mail')) return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
    if (['subuser', 'user'].some((x) => e.includes(x))) return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    if (e.includes('delete')) return 'text-red-500 bg-red-500/10 border-red-500/20';
    return 'text-primary bg-primary/10 border-primary/20';
}

function humanValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function displayMessage(item: ActivityItem): string {
    if (item.message) return item.message;
    const meta = normalizeMetadata(item.metadata);
    if (!meta) return formatEvent(item.event);

    const preferred = ['schedule_name', 'database_name', 'filename', 'path', 'directory', 'domain', 'email', 'name'];
    for (const key of preferred) {
        const value = meta[key];
        if (value != null && String(value).trim()) return String(value);
    }

    const skip = new Set(['schedule_id', 'database_id', 'user_id', 'id', 'uuid']);
    const bits = Object.entries(meta)
        .filter(([k, v]) => !skip.has(k) && v != null && typeof v !== 'object')
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
    return bits.length ? bits.join(' · ') : formatEvent(item.event);
}

export default function WebSpaceActivitiesPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const [items, setItems] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 10,
        from: 0,
        to: 0,
    });
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/activities`, {
                params: { page, per_page: 10, search: search.trim() || undefined },
            });
            const body = data.data || data;
            setItems(body.activities || []);
            const p = body.pagination || {};
            setPagination({
                current_page: p.current_page || page,
                last_page: p.last_page || 1,
                total: p.total || 0,
                per_page: p.per_page || 10,
                from: p.from || 0,
                to: p.to || 0,
            });
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [uuidShort, page, search]);

    useEffect(() => {
        void load();
    }, [load]);

    const selectedMeta = selectedItem ? normalizeMetadata(selectedItem.metadata) : null;
    const detailsPairs = selectedMeta
        ? Object.entries(selectedMeta).map(([key, value]) => ({ key, value: humanValue(value) }))
        : [];

    if (loading && items.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <WebSpacePageWidgets pageId='webspace-activities'>
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('webSpaces.activities.title')}
                    description={
                        <div className='flex items-center gap-3'>
                            <span>{t('webSpaces.activities.description')}</span>
                            <span className='bg-primary/5 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase'>
                                {pagination.total} {t('serverActivities.events')}
                            </span>
                        </div>
                    }
                    actions={
                        <Button
                            variant='glass'
                            onClick={() => void load()}
                            disabled={loading}
                            aria-label={t('common.refresh')}
                        >
                            <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('common.refresh')}</span>
                        </Button>
                    }
                />

                <div className='group relative'>
                    <Search className='text-muted-foreground/80 group-focus-within:text-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('webSpaces.activities.searchPlaceholder')}
                        className='h-14 pl-12 text-base'
                        value={search}
                        onChange={(e) => {
                            setPage(1);
                            setSearch(e.target.value);
                        }}
                    />
                </div>

                {items.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title={t('webSpaces.activities.empty')}
                        description={
                            search
                                ? t('serverActivities.noActivitiesSearchDescription')
                                : t('webSpaces.activities.emptyHelp')
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {items.map((item) => (
                            <ResourceCard
                                key={item.id}
                                icon={getEventIcon(item.event)}
                                iconWrapperClassName={getEventIconClass(item.event)}
                                title={formatEvent(item.event)}
                                description={
                                    <>
                                        <p className='text-muted-foreground mb-2 line-clamp-1 w-full font-medium opacity-80'>
                                            {displayMessage(item)}
                                        </p>
                                        <div className='border-border/10 flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t pt-1'>
                                            <div className='text-muted-foreground flex items-center gap-2'>
                                                <User className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-bold tracking-tight uppercase'>
                                                    {item.user?.username || t('webSpaces.activities.system')}
                                                </span>
                                            </div>
                                            <div className='text-muted-foreground flex items-center gap-2'>
                                                <Clock className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-semibold'>
                                                    {item.timestamp
                                                        ? formatRelativeTime(item.timestamp, dateOpts)
                                                        : '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                }
                                actions={
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className='group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl transition-colors outline-none'>
                                            <MoreVertical className='text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors' />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align='end'
                                            className='bg-card/90 border-border/40 w-56 rounded-2xl p-2 backdrop-blur-xl'
                                        >
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setDetailsOpen(true);
                                                }}
                                                className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                            >
                                                <Eye className='text-primary h-4 w-4' />
                                                <span className='font-bold'>{t('serverActivities.viewDetails')}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                }
                            />
                        ))}
                    </div>
                )}

                {pagination.last_page > 1 && (
                    <div className='border-border/40 flex items-center justify-between border-t px-6 py-8'>
                        <p className='text-sm font-bold tracking-widest uppercase opacity-40'>
                            {t('serverActivities.pagination.showing', {
                                from: String(pagination.from || (page - 1) * pagination.per_page + 1),
                                to: String(pagination.to || Math.min(page * pagination.per_page, pagination.total)),
                                total: String(pagination.total),
                            })}
                        </p>
                        <div className='flex items-center gap-3'>
                            <Button
                                variant='glass'
                                size='sm'
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((p) => p - 1)}
                                className='h-10 w-10 rounded-xl p-0'
                            >
                                <ChevronLeft className='h-5 w-5' />
                            </Button>
                            <span className='bg-primary/5 text-primary border-primary/20 flex h-10 min-w-12 items-center justify-center rounded-xl border px-4 text-sm font-black'>
                                {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button
                                variant='glass'
                                size='sm'
                                disabled={page >= pagination.last_page || loading}
                                onClick={() => setPage((p) => p + 1)}
                                className='h-10 w-10 rounded-xl p-0'
                            >
                                <ChevronRight className='h-5 w-5' />
                            </Button>
                        </div>
                    </div>
                )}

                <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} className='max-w-3xl'>
                    {selectedItem && (
                        <div className='space-y-6 p-2'>
                            <DialogHeader className='mb-0'>
                                <div className='flex items-start gap-4'>
                                    <div
                                        className={cn(
                                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
                                            getEventIconClass(selectedItem.event),
                                        )}
                                    >
                                        {React.createElement(getEventIcon(selectedItem.event), {
                                            className: 'h-6 w-6',
                                        })}
                                    </div>
                                    <div className='min-w-0 flex-1 space-y-1'>
                                        <DialogTitle className='text-foreground text-xl leading-tight font-bold'>
                                            {formatEvent(selectedItem.event)}
                                        </DialogTitle>
                                        <DialogDescription className='text-sm'>
                                            {displayMessage(selectedItem)}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className='border-border/50 bg-card/40 space-y-4 rounded-2xl border p-5'>
                                <dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                    <div className='space-y-1.5'>
                                        <dt className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                                            {t('serverActivities.details.executingUser')}
                                        </dt>
                                        <dd className='text-sm font-semibold'>
                                            {selectedItem.user?.username || t('webSpaces.activities.system')}
                                        </dd>
                                    </div>
                                    <div className='space-y-1.5'>
                                        <dt className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                                            {t('serverActivities.details.timestamp')}
                                        </dt>
                                        <dd className='flex items-center gap-2 text-sm font-semibold'>
                                            <Clock className='text-muted-foreground h-4 w-4 shrink-0' />
                                            {selectedItem.timestamp
                                                ? formatDateTimeInTz(selectedItem.timestamp, dateOpts)
                                                : '—'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            {detailsPairs.length > 0 && (
                                <div className='border-border/50 bg-card/40 space-y-3 rounded-2xl border p-5'>
                                    <h3 className='text-muted-foreground text-[10px] font-semibold tracking-widest uppercase'>
                                        {t('serverActivities.details.metadataPayload')}
                                    </h3>
                                    <dl className='space-y-4'>
                                        {detailsPairs.map((pair) => (
                                            <div
                                                key={pair.key}
                                                className='border-border/30 space-y-1.5 border-b pb-4 last:border-0 last:pb-0'
                                            >
                                                <dt className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                                                    {pair.key.replace(/_/g, ' ')}
                                                </dt>
                                                <dd className='text-foreground font-mono text-sm break-all'>
                                                    {pair.value}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            )}
                        </div>
                    )}
                </Dialog>
            </div>
        </WebSpacePageWidgets>
    );
}
