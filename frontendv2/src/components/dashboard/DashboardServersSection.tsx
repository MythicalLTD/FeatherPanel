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

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlignJustify,
    ArrowDownUp,
    ArrowRight,
    Check,
    CheckSquare,
    Folder,
    LayoutGrid,
    List,
    Search,
    Star,
    X,
} from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { serversApi } from '@/lib/servers-api';
import { getServerCpuLimit, getServerMemoryLimit } from '@/lib/server-utils';
import type { ServerTrendSeries } from '@/lib/resource-history';
import type { Server as ServerData } from '@/types/server';
import type { ServerLiveData } from '@/hooks/useServersWebSocket';
import type { DashboardServerOptions, DashboardServerSort, DashboardServerView } from '@/hooks/useDashboardConfig';
import { DashboardMenu, DashboardMenuItem } from '@/components/dashboard/DashboardMenu';
import {
    DashboardServerGaugeCard,
    DashboardServerRow,
    serverRowStatus,
} from '@/components/dashboard/DashboardResourceRows';
import { formatUptime } from '@/components/dashboard/DashboardWidgets';
import { BulkServerActions } from '@/components/servers/BulkServerActions';
import { ResourceTrendStrip } from '@/components/dashboard/ResourceTrends';

const RECENT_SERVERS_KEY = 'featherpanel_recent_servers_v1';

/** Running first, then the ones that need a look, offline last. */
const STATUS_RANK: Record<string, number> = {
    running: 0,
    starting: 1,
    stopping: 2,
    install_failed: 3,
    installing: 4,
    restoring_backup: 5,
    transferring: 6,
    suspended: 7,
    offline: 8,
    stopped: 8,
    unknown: 9,
};

const ONLINE = new Set(['running', 'starting']);

type Filter = 'all' | 'online' | 'offline' | 'favorites';
type Scope = 'mine' | 'others';

const FILTER_LABEL_KEYS: Record<Filter, string> = {
    all: 'dashboard.servers_section.filter_all',
    online: 'dashboard.servers_section.filter_online',
    offline: 'dashboard.servers_section.filter_offline',
    favorites: 'dashboard.servers_section.filter_favorites',
};

const SORT_LABEL_KEYS: Record<DashboardServerSort, string> = {
    recent: 'dashboard.customize.sort_recent',
    name: 'dashboard.customize.sort_name',
    status: 'dashboard.customize.sort_status',
};

/** Grid shows gauge cards, list the detailed rows, compact one line per server. */
const VIEW_OPTIONS: { view: DashboardServerView; icon: typeof LayoutGrid; labelKey: string }[] = [
    { view: 'grid', icon: LayoutGrid, labelKey: 'dashboard.servers_section.view_grid' },
    { view: 'detailed', icon: List, labelKey: 'dashboard.servers_section.view_list' },
    { view: 'list', icon: AlignJustify, labelKey: 'dashboard.servers_section.view_compact' },
];

function recentRank(): Map<string, number> {
    const rank = new Map<string, number>();
    try {
        const recent = JSON.parse(window.localStorage.getItem(RECENT_SERVERS_KEY) || '[]') as { uuidShort?: string }[];
        if (Array.isArray(recent)) {
            recent.forEach((entry, i) => {
                if (entry?.uuidShort && !rank.has(entry.uuidShort)) rank.set(entry.uuidShort, i);
            });
        }
    } catch {
        // Corrupt storage: no recent order.
    }
    return rank;
}

/** Folder names and assignments from the server list page (stored in this browser, synced with the account). */
export function readFolders(): { names: Map<number, string>; assignments: Record<string, number> } {
    const names = new Map<number, string>();
    let assignments: Record<string, number> = {};
    try {
        const folders = JSON.parse(localStorage.getItem('server_folders') || '[]') as { id?: number; name?: string }[];
        if (Array.isArray(folders)) {
            for (const f of folders) if (typeof f?.id === 'number' && f.name) names.set(f.id, f.name);
        }
        const parsed = JSON.parse(localStorage.getItem('server_folder_assignments') || '{}');
        if (parsed && typeof parsed === 'object') assignments = parsed as Record<string, number>;
    } catch {
        // Corrupt storage: no folders.
    }
    return { names, assignments };
}

function Chip({
    active,
    onClick,
    children,
    count,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    count?: number;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                active
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border/70 bg-background/40 text-muted-foreground hover:text-foreground hover:border-border',
            )}
        >
            {active && <Check className='h-3.5 w-3.5' aria-hidden />}
            {children}
            {typeof count === 'number' && (
                <span
                    className={cn(
                        'rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                        active ? 'bg-primary/20' : 'bg-muted',
                    )}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

function ToolbarButton({
    active,
    onClick,
    icon: Icon,
    children,
}: {
    active?: boolean;
    onClick: () => void;
    icon: typeof LayoutGrid;
    children: React.ReactNode;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                active
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border/70 bg-background/40 text-muted-foreground hover:text-foreground',
            )}
        >
            <Icon className='h-3.5 w-3.5' aria-hidden />
            {children}
        </button>
    );
}

export interface DashboardServersSectionProps {
    servers: ServerData[];
    total: number;
    liveFor: (server: ServerData) => ServerLiveData | undefined;
    uptimeFor: (server: ServerData) => number | null;
    isFavorite: (uuid: string) => boolean;
    toggleFavorite: (uuid: string) => void;
    options: DashboardServerOptions;
    onOptionsChange: (patch: Partial<DashboardServerOptions>) => void;
    /** Admins can switch to servers owned by other users. */
    canViewOthers: boolean;
    compact: boolean;
    /** Wide placement: more cards per row. */
    wide: boolean;
    connectServers: (uuidShorts: string[]) => void;
    /** Last 24 hours of CPU and RAM per server, when history is available. */
    historyFor?: (uuidShort: string) => ServerTrendSeries | null;
}

/** "Your servers": search, filter chips, scope, select mode, folders, view and sort, then the servers. */
export function DashboardServersSection({
    servers,
    total,
    liveFor,
    uptimeFor,
    isFavorite,
    toggleFavorite,
    options,
    onOptionsChange,
    canViewOthers,
    compact,
    wide,
    connectServers,
    historyFor,
}: DashboardServersSectionProps) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [scope, setScope] = useState<Scope>('mine');
    const [others, setOthers] = useState<ServerData[] | null>(null);
    const [othersTotal, setOthersTotal] = useState(0);
    const [selecting, setSelecting] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);

    // Other users' servers load the first time an admin looks at them.
    useEffect(() => {
        if (scope !== 'others' || others !== null) return;
        let cancelled = false;
        serversApi
            .getAdminAllOtherServers(1, 50)
            .then((res) => {
                if (cancelled) return;
                const list = Array.isArray(res.servers) ? res.servers : [];
                setOthers(list);
                setOthersTotal(
                    typeof res.pagination?.total_records === 'number' ? res.pagination.total_records : list.length,
                );
            })
            .catch(() => {
                if (!cancelled) setOthers([]);
            });
        return () => {
            cancelled = true;
        };
    }, [scope, others]);

    const pool = useMemo(() => (scope === 'others' ? (others ?? []) : servers), [scope, others, servers]);
    const poolTotal = scope === 'others' ? othersTotal : total;

    const counts = useMemo(() => {
        let online = 0;
        let favorites = 0;
        for (const s of pool) {
            if (ONLINE.has(serverRowStatus(s, liveFor(s)))) online++;
            if (isFavorite(s.uuid)) favorites++;
        }
        return { all: pool.length, online, offline: pool.length - online, favorites };
    }, [pool, liveFor, isFavorite]);

    const { sort, favoritesFirst, limit, group, view } = options;

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        let list = pool.filter((s) => {
            if (query) {
                const haystack = [
                    s.name,
                    s.description,
                    s.node?.name,
                    s.spell?.name,
                    s.allocation ? `${s.allocation.ip}:${s.allocation.port}` : '',
                    s.allocation?.ip_alias,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(query)) return false;
            }
            const online = ONLINE.has(serverRowStatus(s, liveFor(s)));
            if (filter === 'online') return online;
            if (filter === 'offline') return !online;
            if (filter === 'favorites') return isFavorite(s.uuid);
            return true;
        });
        if (sort === 'recent') {
            const rank = recentRank();
            list.sort(
                (a, b) =>
                    (rank.get(a.uuidShort) ?? Number.MAX_SAFE_INTEGER) -
                    (rank.get(b.uuidShort) ?? Number.MAX_SAFE_INTEGER),
            );
        }
        if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
        if (sort === 'status') {
            list.sort(
                (a, b) =>
                    (STATUS_RANK[serverRowStatus(a, liveFor(a))] ?? 9) -
                    (STATUS_RANK[serverRowStatus(b, liveFor(b))] ?? 9),
            );
        }
        if (favoritesFirst) {
            list = [...list.filter((s) => isFavorite(s.uuid)), ...list.filter((s) => !isFavorite(s.uuid))];
        }
        return list;
    }, [pool, search, filter, sort, favoritesFirst, liveFor, isFavorite]);

    const shown = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
    const hiddenCount = filtered.length - shown.length;

    const shownKey = shown.map((s) => s.uuidShort).join(',');
    useEffect(() => {
        if (shownKey) connectServers(shownKey.split(','));
    }, [shownKey, connectServers]);

    const groups = useMemo(() => {
        if (group === 'none') return [{ key: 'all', label: null as string | null, servers: shown }];
        const folders = group === 'folder' ? readFolders() : null;
        const map = new Map<string, { key: string; label: string; servers: ServerData[] }>();
        for (const s of shown) {
            let key: string;
            let label: string;
            if (folders) {
                const folderId = folders.assignments[s.uuidShort] ?? s.folder_id;
                const name = typeof folderId === 'number' ? folders.names.get(folderId) : undefined;
                key = name ? `f-${folderId}` : 'f-none';
                label = name ?? t('dashboard.home.group_no_folder');
            } else {
                key = `n-${s.node?.id ?? s.node_id ?? 'none'}`;
                label = s.node?.name || t('dashboard.home.group_unknown_node');
            }
            if (!map.has(key)) map.set(key, { key, label, servers: [] });
            map.get(key)!.servers.push(s);
        }
        return [...map.values()].sort((a, b) => (a.key.endsWith('none') ? 1 : b.key.endsWith('none') ? -1 : 0));
    }, [group, shown, t]);

    const toggleSelected = (uuidShort: string) =>
        setSelected((prev) => (prev.includes(uuidShort) ? prev.filter((x) => x !== uuidShort) : [...prev, uuidShort]));
    const stopSelecting = () => {
        setSelecting(false);
        setSelected([]);
    };
    const selectedServers = pool
        .filter((s) => selected.includes(s.uuidShort))
        .map((s) => ({ uuidShort: s.uuidShort, name: s.name }));

    const card = (s: ServerData) => {
        const uptimeMs = uptimeFor(s);
        const history = historyFor?.(s.uuidShort);
        return (
            <DashboardServerGaugeCard
                key={s.uuid}
                server={s}
                live={liveFor(s)}
                isFavorite={isFavorite(s.uuid)}
                onToggleFavorite={() => toggleFavorite(s.uuid)}
                images={options.images}
                tag={s.node?.name ?? s.spell?.name ?? null}
                uptime={uptimeMs && uptimeMs > 0 ? formatUptime(uptimeMs, t) : null}
                selectable={selecting}
                selected={selected.includes(s.uuidShort)}
                onToggleSelect={() => toggleSelected(s.uuidShort)}
                trend={
                    history ? (
                        <ResourceTrendStrip
                            cpu={history.cpu}
                            memory={history.memory}
                            cpuLimit={getServerCpuLimit(s)}
                            memoryLimit={getServerMemoryLimit(s)}
                        />
                    ) : null
                }
            />
        );
    };

    const row = (s: ServerData) => (
        <DashboardServerRow
            key={s.uuid}
            server={s}
            live={liveFor(s)}
            isFavorite={isFavorite(s.uuid)}
            onToggleFavorite={() => toggleFavorite(s.uuid)}
            view={view === 'list' ? 'list' : 'detailed'}
            images={options.images}
            meters={options.meters}
            compact={compact || view === 'list'}
            selectable={selecting}
            selected={selected.includes(s.uuidShort)}
            onToggleSelect={() => toggleSelected(s.uuidShort)}
        />
    );

    const title =
        scope === 'others' ? t('dashboard.servers_section.others_title') : t('dashboard.servers_section.title');

    return (
        <section className='min-w-0 space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex min-w-0 items-center gap-2'>
                    <h2 className='truncate text-lg font-semibold tracking-tight'>{title}</h2>
                    <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums'>
                        {poolTotal}
                    </span>
                    <Link
                        href='/dashboard/servers'
                        className='text-primary hover:text-primary/80 ml-1 hidden items-center gap-1 text-xs font-medium sm:inline-flex'
                    >
                        {t('dashboard.resources.view_all')}
                        <ArrowRight className='h-3 w-3' aria-hidden />
                    </Link>
                </div>
                <div className='flex flex-wrap items-center gap-1.5'>
                    <ToolbarButton
                        icon={CheckSquare}
                        active={selecting}
                        onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                    >
                        {t('dashboard.servers_section.select')}
                    </ToolbarButton>
                    <ToolbarButton
                        icon={Folder}
                        active={group === 'folder'}
                        onClick={() => onOptionsChange({ group: group === 'folder' ? 'none' : 'folder' })}
                    >
                        {t('dashboard.servers_section.folders')}
                    </ToolbarButton>
                    {canViewOthers && (
                        <div
                            role='radiogroup'
                            aria-label={t('dashboard.servers_section.scope')}
                            className='border-border/70 bg-background/40 inline-flex h-8 rounded-lg border p-0.5'
                        >
                            {(['mine', 'others'] as const).map((value) => (
                                <button
                                    key={value}
                                    type='button'
                                    role='radio'
                                    aria-checked={scope === value}
                                    onClick={() => {
                                        setScope(value);
                                        setSelected([]);
                                    }}
                                    className={cn(
                                        'rounded-md px-2.5 text-xs font-medium transition-colors',
                                        scope === value
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {value === 'mine'
                                        ? t('dashboard.servers_section.scope_mine')
                                        : t('dashboard.servers_section.scope_others')}
                                </button>
                            ))}
                        </div>
                    )}
                    <div
                        role='radiogroup'
                        aria-label={t('dashboard.servers_section.view')}
                        className='border-border/70 bg-background/40 inline-flex h-8 rounded-lg border p-0.5'
                    >
                        {VIEW_OPTIONS.map(({ view: value, icon: Icon, labelKey }) => (
                            <button
                                key={value}
                                type='button'
                                role='radio'
                                aria-checked={view === value}
                                aria-label={t(labelKey)}
                                title={t(labelKey)}
                                onClick={() => onOptionsChange({ view: value })}
                                className={cn(
                                    'flex w-8 items-center justify-center rounded-md transition-colors',
                                    view === value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Icon className='h-3.5 w-3.5' aria-hidden />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
                <label className='border-border/70 bg-background/40 focus-within:border-primary/50 relative flex h-8 min-w-48 flex-1 items-center rounded-lg border sm:max-w-sm'>
                    <Search
                        className='text-muted-foreground pointer-events-none absolute left-2.5 h-3.5 w-3.5'
                        aria-hidden
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('dashboard.servers_section.search')}
                        aria-label={t('dashboard.servers_section.search')}
                        className='h-full w-full bg-transparent pr-8 pl-8 text-xs outline-none'
                    />
                    {search && (
                        <button
                            type='button'
                            onClick={() => setSearch('')}
                            className='text-muted-foreground hover:text-foreground absolute right-1.5 rounded p-1'
                            aria-label={t('common.clear')}
                        >
                            <X className='h-3.5 w-3.5' />
                        </button>
                    )}
                </label>
                <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
                    {(['all', 'online', 'offline', 'favorites'] as const).map((value) => (
                        <Chip
                            key={value}
                            active={filter === value}
                            onClick={() => setFilter(value)}
                            count={counts[value]}
                        >
                            {value === 'favorites' && filter !== value && <Star className='h-3.5 w-3.5' aria-hidden />}
                            {t(FILTER_LABEL_KEYS[value])}
                        </Chip>
                    ))}
                </div>
                <div className='ml-auto'>
                    <DashboardMenu
                        label={t('dashboard.servers_section.sort')}
                        trigger={
                            <>
                                <ArrowDownUp className='h-3.5 w-3.5' aria-hidden />
                                {t(SORT_LABEL_KEYS[sort])}
                            </>
                        }
                    >
                        {(['recent', 'name', 'status'] as const).map((value) => (
                            <DashboardMenuItem
                                key={value}
                                checked={sort === value}
                                onClick={() => onOptionsChange({ sort: value })}
                            >
                                {t(SORT_LABEL_KEYS[value])}
                            </DashboardMenuItem>
                        ))}
                        <DashboardMenuItem
                            separator
                            checked={favoritesFirst}
                            onClick={() => onOptionsChange({ favoritesFirst: !favoritesFirst })}
                        >
                            {t('dashboard.customize.favorites_first')}
                        </DashboardMenuItem>
                    </DashboardMenu>
                </div>
            </div>

            {selecting && selected.length === 0 && (
                <div className='border-primary/30 bg-primary/8 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs'>
                    <span>{t('dashboard.servers_section.select_hint')}</span>
                    <button type='button' onClick={stopSelecting} className='text-primary font-medium hover:underline'>
                        {t('common.done')}
                    </button>
                </div>
            )}

            {scope === 'others' && others === null ? (
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3' aria-busy='true'>
                    {[0, 1, 2].map((i) => (
                        <div key={i} className='fp-surface h-64 animate-pulse rounded-2xl border' />
                    ))}
                </div>
            ) : shown.length === 0 ? (
                <div className='fp-surface rounded-xl border px-4 py-8 text-center'>
                    <p className='text-sm font-medium'>
                        {pool.length === 0
                            ? t('dashboard.servers_section.none_others')
                            : t('dashboard.servers_section.no_match')}
                    </p>
                    {pool.length > 0 && (
                        <button
                            type='button'
                            onClick={() => {
                                setSearch('');
                                setFilter('all');
                            }}
                            className='text-primary mt-2 text-xs font-medium hover:underline'
                        >
                            {t('dashboard.servers_section.clear_filters')}
                        </button>
                    )}
                </div>
            ) : (
                <div className='space-y-4'>
                    {groups.map((g) => (
                        <div key={g.key} className='space-y-2'>
                            {g.label && (
                                <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                                    {g.label}
                                </p>
                            )}
                            {view === 'grid' ? (
                                <div
                                    className={cn(
                                        'grid grid-cols-1 sm:grid-cols-2',
                                        wide ? 'lg:grid-cols-3 2xl:grid-cols-4' : 'xl:grid-cols-3',
                                        compact ? 'gap-2' : 'gap-3',
                                    )}
                                >
                                    {g.servers.map(card)}
                                </div>
                            ) : (
                                <div className='fp-surface divide-border/50 divide-y overflow-hidden rounded-xl border'>
                                    {g.servers.map(row)}
                                </div>
                            )}
                        </div>
                    ))}
                    {hiddenCount > 0 && (
                        <Link
                            href='/dashboard/servers'
                            className='text-muted-foreground hover:text-foreground block text-center text-xs font-medium'
                        >
                            {t('dashboard.servers_section.more', { count: String(hiddenCount) })}
                        </Link>
                    )}
                </div>
            )}

            {selecting && (
                <BulkServerActions
                    selected={selectedServers}
                    onClear={stopSelecting}
                    onFinished={(failed) => setSelected(failed)}
                />
            )}
        </section>
    );
}
