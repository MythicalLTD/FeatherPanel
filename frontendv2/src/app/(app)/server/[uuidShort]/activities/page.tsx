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

'use client';

import React, { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions, useHideServerIps } from '@/contexts/PreferencesContext';
import { HIDDEN_IP_PLACEHOLDER, maskIpsInText } from '@/lib/ip-mask';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    Activity,
    Archive,
    CalendarClock,
    ChevronRight,
    Clock,
    Copy,
    Database,
    Download,
    Edit,
    FileText,
    Globe,
    HardDrive,
    ListTodo,
    Loader2,
    Lock,
    Network,
    Pause,
    Play,
    PlayCircle,
    Power,
    RefreshCw,
    RotateCcw,
    Search,
    Server,
    Settings,
    SquareTerminal,
    Trash2,
    Unlock,
    User,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ListPagination } from '@/components/featherui/ListPagination';
import { ServerPageHeader, ServerPageToolbar } from '@/components/server/ServerPageHeader';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';

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
    const hideIps = useHideServerIps();

    // Hard mask for users who switched on "hide IP addresses": no hover reveal,
    // so a screen recording cannot pick the value up again.
    if (hideIps) {
        return (
            <span className={cn('text-muted-foreground font-mono text-xs font-bold opacity-70', className)}>
                {HIDDEN_IP_PLACEHOLDER}
            </span>
        );
    }

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
function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type='button'
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors',
                active
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border/60 bg-background/40 text-muted-foreground hover:text-foreground hover:border-border',
            )}
        >
            {children}
        </button>
    );
}

const PAGE_SIZE = 20;

const CATEGORIES: { id: string; icon: LucideIcon }[] = [
    { id: 'console', icon: SquareTerminal },
    { id: 'power', icon: Power },
    { id: 'files', icon: FileText },
    { id: 'sftp', icon: HardDrive },
    { id: 'backups', icon: Archive },
    { id: 'databases', icon: Database },
    { id: 'schedules', icon: CalendarClock },
    { id: 'tasks', icon: ListTodo },
    { id: 'users', icon: Users },
    { id: 'network', icon: Network },
    { id: 'startup', icon: PlayCircle },
    { id: 'settings', icon: Settings },
    { id: 'reinstall', icon: RotateCcw },
];

/** Metadata keys worth surfacing on the row itself, in priority order. */
const SUMMARY_KEYS = [
    'command',
    'files',
    'file',
    'path',
    'filename',
    'backup_name',
    'name',
    'database_name',
    'database',
    'schedule_name',
    'email',
    'subdomain',
    'variable',
    'allocation_port',
    'port',
] as const;

function summarizeMetadata(metadata?: ActivityMetadata | null): string {
    if (!metadata) return '';
    for (const key of SUMMARY_KEYS) {
        const value = metadata[key];
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) {
            const strings = value.filter((v): v is string => typeof v === 'string');
            if (strings.length) return strings.join(', ');
            continue;
        }
        if (typeof value === 'string' || typeof value === 'number') return String(value);
    }
    return '';
}

type ActorOption = { id: number; username: string; avatar: string | null };

const fieldClass =
    'border-border/60 bg-background/60 focus-visible:ring-primary/40 h-10 rounded-lg border px-3 text-sm outline-none transition-colors focus-visible:ring-2';

function csvCell(value: unknown): string {
    const text =
        value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function ServerActivityPage() {
    const params = useParams();
    const uuidShort = params.uuidShort as string;
    const router = useRouter();
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const hideIps = useHideServerIps();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [category, setCategory] = useState('');
    const [actor, setActor] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(1);
    const [actors, setActors] = useState<{ users: ActorOption[]; has_system: boolean }>({
        users: [],
        has_system: false,
    });
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const actorsLoaded = useRef(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('server-activities');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const hasFilters = Boolean(debouncedSearch || category || actor || fromDate || toDate);

    const buildQuery = useCallback(
        (targetPage: number, perPage: number) => {
            const query: Record<string, string | number> = { page: targetPage, per_page: perPage };
            if (debouncedSearch) query.search = debouncedSearch;
            if (category) query.category = category;
            if (actor) query.user = actor;
            if (fromDate) query.from = fromDate;
            if (toDate) query.to = toDate;
            return query;
        },
        [debouncedSearch, category, actor, fromDate, toDate],
    );

    const fetchActivities = useCallback(
        async (targetPage: number) => {
            try {
                setLoading(true);
                const query = buildQuery(targetPage, PAGE_SIZE);
                if (!actorsLoaded.current) query.include_actors = 1;
                const { data } = await axios.get(`/api/user/servers/${uuidShort}/activities`, { params: query });

                if (!data.success) {
                    toast.error(getApiErrorMessageFromPayload(data, t, 'serverActivities.failedToFetch'));
                    return;
                }

                setActivities(
                    (data.data.activities.data || data.data.activities || []).map((item: ActivityItem) => ({
                        ...item,
                        metadata: normalizeMetadata(item.metadata),
                    })),
                );
                if (data.data.actors) {
                    actorsLoaded.current = true;
                    setActors(data.data.actors);
                }
                const p = data.data.pagination || {};
                setPagination({
                    total: p.total || p.total_records || 0,
                    totalPages: p.total_pages || p.last_page || 1,
                });
            } catch (error) {
                console.error(error);
                toast.error(getApiErrorMessage(error, t, 'serverActivities.failedToFetch'));
            } finally {
                setLoading(false);
            }
        },
        [uuidShort, buildQuery, t],
    );

    useEffect(() => {
        if (permissionsLoading) return;
        if (!hasPermission('activity.read')) {
            toast.error(t('serverActivities.noActivityPermission'));
            router.push(`/server/${uuidShort}`);
            return;
        }
        fetchActivities(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permissionsLoading, fetchActivities, page]);

    // Any filter change starts again from the first page.
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, category, actor, fromDate, toDate]);

    const clearFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setCategory('');
        setActor('');
        setFromDate('');
        setToDate('');
    };

    const exportCsv = async () => {
        try {
            setExporting(true);
            const rows: ActivityItem[] = [];
            // Up to 1000 rows with the current filters, newest first.
            for (let p = 1; p <= 10; p++) {
                const { data } = await axios.get(`/api/user/servers/${uuidShort}/activities`, {
                    params: buildQuery(p, 100),
                });
                if (!data.success) break;
                const items: ActivityItem[] = data.data.activities.data || [];
                rows.push(...items);
                if (p >= (data.data.pagination?.total_pages || 1)) break;
            }
            const header = ['id', 'timestamp', 'event', 'user', 'ip', 'metadata'];
            const lines = rows.map((row) =>
                [
                    row.id,
                    row.timestamp,
                    row.event,
                    row.user?.username ?? t('serverActivities.details.system'),
                    hideIps ? '' : row.ip,
                    hideIps
                        ? maskIpsInText(JSON.stringify(normalizeMetadata(row.metadata) ?? {}), true)
                        : normalizeMetadata(row.metadata),
                ]
                    .map(csvCell)
                    .join(','),
            );
            const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `activity-${uuidShort}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(t('serverActivities.exported', { count: String(rows.length) }));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'serverActivities.failedToFetch'));
        } finally {
            setExporting(false);
        }
    };

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
        if (event === 'server:power.autostart') {
            return t('serverActivities.autostartEvent');
        }
        return event
            .replace(/_/g, ' ')
            .replace(/:/g, ' ')
            .replace(/\./g, ' ')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function getEventIcon(event: string): LucideIcon {
        const e = event.toLowerCase();
        if (e.includes('console') || e === 'command_sent') return SquareTerminal;
        if (e.includes('sftp')) return HardDrive;
        if (e.includes('backup')) return Archive;
        if (e.includes('restart') || e.includes('reinstall')) return RotateCcw;
        if (['stop', 'kill'].some((x) => e.includes(x))) return Pause;
        if (e.includes('power') || e.includes('start')) return Play;
        if (e.includes('file') || e.includes('download') || e.includes('director') || e.includes('archive'))
            return FileText;
        if (e.includes('database')) return Database;
        if (e.includes('schedule')) return CalendarClock;
        if (e.includes('task')) return ListTodo;
        if (e.includes('user')) return Users;
        if (['allocation', 'subdomain', 'proxy', 'firewall'].some((x) => e.includes(x))) return Network;
        if (e.includes('variable') || e.includes('startup')) return PlayCircle;
        if (e.includes('delete')) return Trash2;
        if (e.includes('unlock')) return Unlock;
        if (e.includes('lock')) return Lock;
        if (e.includes('update') || e.includes('setting')) return Edit;
        return Server;
    }

    function getEventTone(event: string) {
        const e = event.toLowerCase();
        if (['stop', 'kill', 'delete', 'abort', 'wipe'].some((x) => e.includes(x))) return 'text-red-500 bg-red-500/10';
        if (e.includes('restart') || e.includes('reinstall'))
            return 'text-amber-600 dark:text-amber-400 bg-amber-500/10';
        if (e.includes('power') || e.includes('start') || e.includes('created') || e.includes('restored'))
            return 'text-emerald-500 bg-emerald-500/10';
        if (e.includes('backup')) return 'text-sky-500 bg-sky-500/10';
        if (e.includes('console') || e === 'command_sent') return 'text-violet-500 bg-violet-500/10';
        return 'text-primary bg-primary/10';
    }

    const detailsPairs =
        selectedItem && selectedItem.metadata
            ? Object.entries(selectedItem.metadata).map(([k, v]) => ({
                  key: k,
                  value: typeof v === 'object' ? JSON.stringify(v) : String(v),
              }))
            : [];

    const rawJson = selectedItem?.metadata ? JSON.stringify(selectedItem.metadata, null, 2) : '';
    // Raw payload is shown in a <pre>: mask embedded addresses so the block
    // cannot be read off a recording either.
    const displayRawJson = maskIpsInText(rawJson, hideIps);
    const today = new Date().toISOString().slice(0, 10);

    if (permissionsLoading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className='space-y-6 pb-12'>
            <ServerPageHeader
                title={t('serverActivities.title')}
                description={t('serverActivities.description')}
                actions={
                    <>
                        <Button variant='glass' size='sm' onClick={() => fetchActivities(page)} disabled={loading}>
                            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                            {t('common.refresh')}
                        </Button>
                        <Button
                            variant='glass'
                            size='sm'
                            onClick={exportCsv}
                            disabled={exporting || pagination.total === 0}
                        >
                            {exporting ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Download className='mr-2 h-4 w-4' />
                            )}
                            {t('serverActivities.export')}
                        </Button>
                    </>
                }
            />

            <WidgetRenderer widgets={getWidgets('server-activities', 'activity-top')} />

            <ServerPageToolbar>
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_auto]'>
                    <div className='relative min-w-0 sm:col-span-2 lg:col-span-1'>
                        <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                        <Input
                            placeholder={t('serverActivities.searchPlaceholder')}
                            aria-label={t('serverActivities.searchPlaceholder')}
                            className='h-10 pl-9 text-sm'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        aria-label={t('serverActivities.filters.user')}
                        className={cn(fieldClass, 'min-w-0')}
                        value={actor}
                        onChange={(e) => setActor(e.target.value)}
                    >
                        <option value=''>{t('serverActivities.filters.allUsers')}</option>
                        {actors.has_system && <option value='system'>{t('serverActivities.details.system')}</option>}
                        {actors.users.map((u) => (
                            <option key={u.id} value={String(u.id)}>
                                {u.username}
                            </option>
                        ))}
                    </select>
                    <div className='flex min-w-0 items-center gap-2'>
                        <input
                            type='date'
                            aria-label={t('serverActivities.filters.from')}
                            className={cn(fieldClass, 'min-w-0 flex-1 lg:w-36 lg:flex-none')}
                            value={fromDate}
                            max={toDate || today}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                        <span className='text-muted-foreground text-xs'>{t('serverActivities.filters.to')}</span>
                        <input
                            type='date'
                            aria-label={t('serverActivities.filters.until')}
                            className={cn(fieldClass, 'min-w-0 flex-1 lg:w-36 lg:flex-none')}
                            value={toDate}
                            min={fromDate || undefined}
                            max={today}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    <div
                        role='group'
                        aria-label={t('serverActivities.filters.category')}
                        className='-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0'
                    >
                        <CategoryChip active={category === ''} onClick={() => setCategory('')}>
                            {t('serverActivities.allEvents')}
                        </CategoryChip>
                        {CATEGORIES.map(({ id, icon: Icon }) => (
                            <CategoryChip
                                key={id}
                                active={category === id}
                                onClick={() => setCategory(category === id ? '' : id)}
                            >
                                <Icon className='h-3.5 w-3.5' />
                                {t(`serverActivities.categories.${id}`)}
                            </CategoryChip>
                        ))}
                    </div>
                    {hasFilters && (
                        <Button variant='ghost' size='sm' className='shrink-0' onClick={clearFilters}>
                            <X className='mr-1 h-4 w-4' />
                            {t('common.clear')}
                        </Button>
                    )}
                </div>
            </ServerPageToolbar>

            {!loading && activities.length === 0 ? (
                <EmptyState
                    title={t('serverActivities.noActivitiesFound')}
                    description={
                        hasFilters
                            ? t('serverActivities.noActivitiesSearchDescription')
                            : t('serverActivities.noActivitiesDescription')
                    }
                    icon={Activity}
                    action={
                        hasFilters ? (
                            <Button variant='glass' onClick={clearFilters}>
                                {t('common.clear')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className='fp-surface overflow-hidden rounded-xl border'>
                    <div className='text-muted-foreground border-border/60 flex items-center justify-between gap-2 border-b px-4 py-2.5 text-xs'>
                        <span className='font-medium'>
                            {t('serverActivities.eventCount', { count: String(pagination.total) })}
                        </span>
                        {loading && <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden />}
                    </div>
                    <ul className={cn('divide-border/50 divide-y transition-opacity', loading && 'opacity-60')}>
                        {activities.map((activity) => {
                            const Icon = getEventIcon(activity.event);
                            const summary = activity.message || summarizeMetadata(activity.metadata);
                            const who = activity.user?.username || t('serverActivities.details.system');
                            return (
                                <li key={activity.id}>
                                    <button
                                        type='button'
                                        onClick={() => {
                                            setSelectedItem(activity);
                                            setDetailsOpen(true);
                                        }}
                                        aria-label={`${formatEvent(activity.event)}, ${t('serverActivities.viewDetails')}`}
                                        className='hover:bg-primary/5 focus-visible:bg-primary/5 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none'
                                    >
                                        <span
                                            className={cn(
                                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                                getEventTone(activity.event),
                                            )}
                                        >
                                            <Icon className='h-4 w-4' />
                                        </span>
                                        <span className='min-w-0 flex-1'>
                                            <span className='flex min-w-0 items-baseline gap-2'>
                                                <span className='truncate text-sm font-medium'>
                                                    {formatEvent(activity.event)}
                                                </span>
                                                <span className='text-muted-foreground hidden font-mono text-[11px] md:inline'>
                                                    {activity.event}
                                                </span>
                                            </span>
                                            <span className='text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs'>
                                                <span className='shrink-0 sm:hidden'>{who}</span>
                                                {summary && <span className='shrink-0 sm:hidden'>·</span>}
                                                {summary && (
                                                    <span className='truncate font-mono'>
                                                        {maskIpsInText(summary, hideIps)}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                        <span className='hidden w-36 shrink-0 items-center gap-2 sm:flex'>
                                            {activity.user?.avatar ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={activity.user.avatar}
                                                    alt=''
                                                    className='h-5 w-5 rounded-full'
                                                />
                                            ) : (
                                                <span className='bg-muted text-muted-foreground flex h-5 w-5 items-center justify-center rounded-full'>
                                                    <User className='h-3 w-3' />
                                                </span>
                                            )}
                                            <span className='truncate text-xs font-medium'>{who}</span>
                                        </span>
                                        {activity.ip && (
                                            <span className='hidden w-28 shrink-0 lg:block'>
                                                <BlurredIp ip={activity.ip} />
                                            </span>
                                        )}
                                        <time
                                            dateTime={activity.timestamp}
                                            title={
                                                activity.timestamp
                                                    ? formatDateTimeInTz(activity.timestamp, dateOpts)
                                                    : undefined
                                            }
                                            className='text-muted-foreground w-20 shrink-0 text-right text-xs tabular-nums sm:w-24'
                                        >
                                            {activity.timestamp
                                                ? formatRelativeTime(activity.timestamp, dateOpts)
                                                : '-'}
                                        </time>
                                        <ChevronRight className='text-muted-foreground/60 hidden h-4 w-4 shrink-0 sm:block' />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {pagination.totalPages > 1 && (
                <ListPagination
                    page={page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    pageSize={PAGE_SIZE}
                    disabled={loading}
                    onPageChange={setPage}
                />
            )}

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
                                                    : '-'}
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
                                                        !hideIps &&
                                                            shouldBlurIpMetadata(pair.key, pair.value) &&
                                                            'blur-sm transition-all duration-200 hover:blur-none',
                                                    )}
                                                >
                                                    {hideIps ? maskIpsInText(pair.value, true) : pair.value}
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
                                    {displayRawJson || t('serverActivities.details.noMetadata')}
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
