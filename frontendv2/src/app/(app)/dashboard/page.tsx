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

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { BookOpen, Gamepad2, Globe, History, LifeBuoy, MonitorCog, Server, Settings2 } from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatRelativeTime, parseApiDate } from '@/lib/dateUtils';
import { getModuleStates } from '@/lib/modules';
import { formatDisk, getServerDiskLimit } from '@/lib/server-utils';
import { cn, isEnabled } from '@/lib/utils';
import { serversApi } from '@/lib/servers-api';
import { vmsApi, type VmInstance } from '@/lib/vms-api';

import type { Server as ServerData } from '@/types/server';
import type { Activity } from '@/types/activity';
import type { DashboardWebSpace } from '@/components/webspace/WebSpaceCard';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AnnouncementBanner } from '@/components/dashboard/AnnouncementBanner';
import { TicketList, type DashboardTicket } from '@/components/dashboard/TicketList';
import { KnowledgeBaseList } from '@/components/dashboard/KnowledgeBaseList';
import { DashboardRecentMails } from '@/components/dashboard/DashboardRecentMails';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
    DashboardAttention,
    DashboardPanel,
    DashboardStatTile,
    type AttentionItem,
} from '@/components/dashboard/DashboardOverview';
import {
    DashboardServerCard,
    DashboardServerRow,
    DashboardVmRow,
    DashboardWebSpaceRow,
    serverRowStatus,
} from '@/components/dashboard/DashboardResourceRows';
import {
    BackupsWidget,
    NetworkWidget,
    QUICK_ACTION_ICONS,
    QuickActionsWidget,
    SchedulesWidget,
    StatusWidget,
    UptimeWidget,
    UsageWidget,
    type DashboardOverview,
    type QuickAction,
    type WebSpaceUsageFields,
} from '@/components/dashboard/DashboardWidgets';
import { DashboardCustomizeSheet } from '@/components/dashboard/DashboardCustomizeSheet';
import { DashboardRun } from '@/components/dashboard/DashboardRun';
import { RoleBadge } from '@/components/RoleBadge';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { useServersWebSocket, type ServerLiveData } from '@/hooks/useServersWebSocket';
import { useFavoriteServerUuids } from '@/hooks/useFavoriteServerUuids';
import { useDashboardConfig, type DashboardWidgetId, type DashboardWidgetSize } from '@/hooks/useDashboardConfig';

/** Rows shown per VDS / web space section; the rest is one click away on the full list. */
const SECTION_LIMIT = 6;
const RECENT_SERVERS_KEY = 'featherpanel_recent_servers_v1';
const DAY_MS = 86_400_000;
const EXPIRY_WARNING_DAYS = 7;
const DISK_WARNING_PERCENT = 90;
const OVERVIEW_REFRESH_MS = 30_000;

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

/** Servers in the order the user last opened them, unknown ones after. */
function orderByRecent(servers: ServerData[]): ServerData[] {
    try {
        const raw = window.localStorage.getItem(RECENT_SERVERS_KEY);
        const recent = raw ? (JSON.parse(raw) as { uuidShort?: string }[]) : [];
        if (!Array.isArray(recent) || recent.length === 0) return servers;
        const rank = new Map<string, number>();
        recent.forEach((entry, i) => {
            if (entry?.uuidShort && !rank.has(entry.uuidShort)) rank.set(entry.uuidShort, i);
        });
        return [...servers].sort(
            (a, b) =>
                (rank.get(a.uuidShort) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.uuidShort) ?? Number.MAX_SAFE_INTEGER),
        );
    } catch {
        return servers;
    }
}

/** Folder names and assignments from the server list page (stored in this browser, synced with the account). */
function readFolders(): { names: Map<number, string>; assignments: Record<string, number> } {
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

function daysUntil(value?: string | null): number | null {
    const date = parseApiDate(value);
    if (!date) return null;
    return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

interface PlacedWidget {
    id: DashboardWidgetId;
    size: DashboardWidgetSize;
    order: number;
    node: ReactNode;
}

type Run = { kind: 'full'; widget: PlacedWidget } | { kind: 'run'; widgets: PlacedWidget[] };

/** Full-width widgets stand alone; the widgets between them share a main (medium) and a side (small) column. */
function toRuns(widgets: PlacedWidget[]): Run[] {
    const runs: Run[] = [];
    for (const w of widgets) {
        if (w.size === 'full') {
            runs.push({ kind: 'full', widget: w });
            continue;
        }
        const last = runs[runs.length - 1];
        if (last?.kind === 'run') last.widgets.push(w);
        else runs.push({ kind: 'run', widgets: [w] });
    }
    return runs;
}

export default function DashboardPage() {
    const { t } = useTranslation();
    const { user, isLoading: sessionLoading } = useSession();
    const { settings } = useSettings();
    const dateOpts = useDateFormatOptions();
    const { fetchWidgets, getWidgets } = usePluginWidgets('dashboard');
    const modules = getModuleStates(settings);
    const ticketsEnabled = isEnabled(settings?.ticket_system_enabled);
    const kbEnabled = isEnabled(settings?.knowledgebase_enabled);

    const [rawServers, setServers] = useState<ServerData[]>([]);
    const [rawServerTotal, setServerTotal] = useState(0);
    const [rawVms, setVms] = useState<VmInstance[]>([]);
    const [rawVmTotal, setVmTotal] = useState(0);
    const [rawWebspaces, setWebspaces] = useState<DashboardWebSpace[]>([]);
    const [rawWebspaceTotal, setWebspaceTotal] = useState(0);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [tickets, setTickets] = useState<DashboardTicket[]>([]);
    const [ticketTotal, setTicketTotal] = useState(0);
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [loadingResources, setLoadingResources] = useState(true);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [customizeOpen, setCustomizeOpen] = useState(false);

    // A disabled module's resources are left out (its API refuses anyway).
    const servers = useMemo(() => (modules.game ? rawServers : []), [modules.game, rawServers]);
    const vms = useMemo(() => (modules.vds ? rawVms : []), [modules.vds, rawVms]);
    const webspaces = useMemo(() => (modules.web ? rawWebspaces : []), [modules.web, rawWebspaces]);
    const serverTotal = modules.game ? rawServerTotal : 0;
    const vmTotal = modules.vds ? rawVmTotal : 0;
    const webspaceTotal = modules.web ? rawWebspaceTotal : 0;

    const { serverLiveData, connectServers, disconnectAll } = useServersWebSocket();
    const { favoriteUuids, toggleFavorite, isFavorite } = useFavoriteServerUuids();
    const dashboard = useDashboardConfig();
    const { config } = dashboard;
    const compact = config.density === 'compact';

    const pluginWidgetProps = {
        isCustomizing: customizeOpen,
        hiddenWidgets: config.hiddenPluginWidgets,
        onToggleHidden: dashboard.toggleHiddenPluginWidget,
    };

    useEffect(() => {
        fetchWidgets();
        const load = async () => {
            await Promise.allSettled([
                serversApi.getServers(false, 1, 50).then((res) => {
                    const list = Array.isArray(res.servers) ? res.servers : [];
                    setServers(orderByRecent(list));
                    setServerTotal(
                        typeof res.pagination?.total_records === 'number' ? res.pagination.total_records : list.length,
                    );
                }),
                vmsApi.getVms(1, 50).then((res) => {
                    const list = Array.isArray(res.data?.instances) ? res.data.instances : [];
                    setVms(list);
                    setVmTotal(
                        typeof res.data?.pagination?.total_records === 'number'
                            ? res.data.pagination.total_records
                            : list.length,
                    );
                }),
                axios.get('/api/user/webspaces').then(({ data }) => {
                    const list = Array.isArray(data?.data?.webspaces)
                        ? (data.data.webspaces as DashboardWebSpace[])
                        : [];
                    setWebspaces(list);
                    const total = data?.data?.pagination?.total ?? data?.data?.pagination?.total_records;
                    setWebspaceTotal(typeof total === 'number' ? total : list.length);
                }),
            ]);
            setLoadingResources(false);
        };
        void load();

        axios
            .get('/api/user/activities?limit=5')
            .then(({ data }) => setActivities(data?.data?.activities || []))
            .catch(() => setActivities([]))
            .finally(() => setLoadingActivity(false));

        return () => disconnectAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Usage, status, backups and schedules for every server, refreshed while the tab is visible.
    useEffect(() => {
        if (!modules.game) {
            setLoadingOverview(false);
            return;
        }
        let cancelled = false;
        const fetchOverview = async () => {
            try {
                const { data } = await axios.get('/api/user/dashboard/overview');
                if (!cancelled && data?.success) setOverview(data.data as DashboardOverview);
            } catch {
                // Widgets fall back to the per-server data they already have.
            } finally {
                if (!cancelled) setLoadingOverview(false);
            }
        };
        void fetchOverview();
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void fetchOverview();
        }, OVERVIEW_REFRESH_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [modules.game]);

    const fetchTickets = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/user/tickets', { params: { limit: 5, page: 1, scope: 'mine' } });
            setTickets(data?.data?.tickets || []);
            setTicketTotal(data?.data?.pagination?.total_records ?? 0);
        } catch {
            setTickets([]);
        } finally {
            setLoadingTickets(false);
        }
    }, []);

    useEffect(() => {
        if (!ticketsEnabled) return;
        void fetchTickets();
        const onReplied = () => void fetchTickets();
        window.addEventListener('featherpanel:ticket-replied', onReplied);
        return () => window.removeEventListener('featherpanel:ticket-replied', onReplied);
    }, [ticketsEnabled, fetchTickets]);

    /** Websocket data when connected, otherwise the last overview snapshot. */
    const overviewByShort = useMemo(() => {
        const map = new Map<string, ServerLiveData>();
        for (const item of overview?.servers.items ?? []) {
            if (item.status === 'unknown' || item.cpu === null) continue;
            map.set(item.uuidShort, {
                status: item.status,
                stats: {
                    cpuUsage: item.cpu ?? 0,
                    memoryUsage: item.memory_bytes ?? 0,
                    diskUsage: item.disk_bytes ?? 0,
                    networkRx: item.rx_bytes ?? 0,
                    networkTx: item.tx_bytes ?? 0,
                    diskIoRead: 0,
                    diskIoWrite: 0,
                    state: item.status,
                    uptime: item.uptime_ms ?? 0,
                },
                lastUpdate: null,
            });
        }
        return map;
    }, [overview]);

    const liveFor = useCallback(
        (server: ServerData) => serverLiveData[server.uuidShort] ?? overviewByShort.get(server.uuidShort),
        [serverLiveData, overviewByShort],
    );

    const { sort, favoritesFirst, limit, group } = config.servers;
    const shownServers = useMemo(() => {
        let list = [...servers];
        if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
        if (sort === 'status') {
            list.sort(
                (a, b) =>
                    (STATUS_RANK[serverRowStatus(a, liveFor(a))] ?? 9) -
                    (STATUS_RANK[serverRowStatus(b, liveFor(b))] ?? 9),
            );
        }
        if (favoritesFirst) {
            const favorites = favoriteUuids
                .map((uuid) => list.find((s) => s.uuid === uuid))
                .filter((s): s is ServerData => Boolean(s));
            list = [...favorites, ...list.filter((s) => !favoriteUuids.includes(s.uuid))];
        }
        return list.slice(0, limit);
    }, [servers, sort, favoritesFirst, favoriteUuids, limit, liveFor]);

    const serverGroups = useMemo(() => {
        if (group === 'none') return [{ key: 'all', label: null as string | null, servers: shownServers }];
        const folders = group === 'folder' ? readFolders() : null;
        const groups = new Map<string, { key: string; label: string; servers: ServerData[] }>();
        for (const s of shownServers) {
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
            if (!groups.has(key)) groups.set(key, { key, label, servers: [] });
            groups.get(key)!.servers.push(s);
        }
        return [...groups.values()].sort((a, b) => (a.key.endsWith('none') ? 1 : b.key.endsWith('none') ? -1 : 0));
    }, [group, shownServers, t]);

    useEffect(() => {
        if (shownServers.length === 0) return;
        void connectServers(shownServers.map((s) => s.uuidShort));
    }, [shownServers, connectServers]);

    const serverStatusCounts = useMemo(() => {
        let running = 0;
        let known = 0;
        for (const s of servers) {
            const status = serverRowStatus(s, liveFor(s));
            if (status === 'unknown') continue;
            known++;
            if (status === 'running' || status === 'starting') running++;
        }
        return { running, known };
    }, [servers, liveFor]);

    const attention = useMemo<AttentionItem[]>(() => {
        const items: AttentionItem[] = [];
        const expiry = (id: string, name: string, href: string, expiresAt?: string | null) => {
            const days = daysUntil(expiresAt);
            if (days === null || days > EXPIRY_WARNING_DAYS) return;
            items.push({
                id: `expiry-${id}`,
                tone: days <= 1 ? 'danger' : 'warning',
                title:
                    days < 0
                        ? t('dashboard.home.attention.expired', { name })
                        : days <= 1
                          ? t('dashboard.home.attention.expires_today', { name })
                          : t('dashboard.home.attention.expires_in', { name, days: String(days) }),
                description: t('dashboard.home.attention.expires_hint'),
                href,
            });
        };

        for (const s of servers) {
            const href = `/server/${s.uuidShort}`;
            const status = serverRowStatus(s, liveFor(s));
            if (status === 'suspended') {
                items.push({
                    id: `suspended-${s.uuid}`,
                    tone: 'danger',
                    title: t('dashboard.home.attention.suspended', { name: s.name }),
                    description: s.suspension_reason || t('dashboard.home.attention.suspended_hint'),
                    href,
                });
                continue;
            }
            if (status === 'install_failed') {
                items.push({
                    id: `install-${s.uuid}`,
                    tone: 'danger',
                    title: t('dashboard.home.attention.install_failed', { name: s.name }),
                    description: t('dashboard.home.attention.install_failed_hint'),
                    href,
                });
            }
            if (s.node?.maintenance_mode) {
                items.push({
                    id: `maintenance-${s.uuid}`,
                    tone: 'info',
                    title: t('dashboard.home.attention.maintenance', { name: s.name }),
                    description: t('dashboard.home.attention.maintenance_hint'),
                    href,
                });
            }
            const disk = liveFor(s)?.stats?.diskUsage;
            const diskLimit = getServerDiskLimit(s);
            if (typeof disk === 'number' && diskLimit > 0 && (disk / diskLimit) * 100 >= DISK_WARNING_PERCENT) {
                items.push({
                    id: `disk-${s.uuid}`,
                    tone: 'warning',
                    title: t('dashboard.home.attention.disk_full', { name: s.name }),
                    description: t('dashboard.home.attention.disk_full_hint', {
                        used: formatDisk(disk),
                        limit: formatDisk(diskLimit),
                    }),
                    href: `/server/${s.uuidShort}/files`,
                });
            }
            expiry(s.uuid, s.name, href, s.expires_at);
        }

        for (const backup of overview?.backups ?? []) {
            if (backup.state !== 'failed') continue;
            const days = daysUntil(backup.completed_at);
            if (days === null || days < -1) continue; // Only failures from the last day or so.
            items.push({
                id: `backup-${backup.uuid}`,
                tone: 'warning',
                title: t('dashboard.home.attention.backup_failed', { name: backup.server.name }),
                description: backup.name,
                href: `/server/${backup.server.uuidShort}/backups`,
            });
        }

        for (const vm of vms) {
            const href = `/vds/${vm.id}`;
            if (vm.suspended === 1 || vm.status === 'suspended') {
                items.push({
                    id: `vm-suspended-${vm.id}`,
                    tone: 'danger',
                    title: t('dashboard.home.attention.suspended', { name: vm.hostname }),
                    description: t('dashboard.home.attention.suspended_hint'),
                    href,
                });
                continue;
            }
            expiry(`vm-${vm.id}`, vm.hostname, href, vm.expires_at);
        }

        for (const ws of webspaces) {
            if (ws.suspended === 1 || ws.status === 'suspended') {
                items.push({
                    id: `ws-suspended-${ws.uuid}`,
                    tone: 'danger',
                    title: t('dashboard.home.attention.suspended', { name: ws.name }),
                    description: t('dashboard.home.attention.suspended_hint'),
                    href: `/webspace/${ws.uuidShort || ws.uuid.slice(0, 8)}`,
                });
            }
        }

        if (ticketsEnabled) {
            for (const ticket of tickets) {
                if (!ticket.has_unread_messages_since_last_reply) continue;
                items.push({
                    id: `ticket-${ticket.uuid}`,
                    tone: 'info',
                    title: t('dashboard.home.attention.ticket_reply', { id: String(ticket.id) }),
                    description: ticket.title,
                    href: `/dashboard/tickets/${ticket.uuid}`,
                });
            }
        }
        return items;
    }, [servers, vms, webspaces, tickets, ticketsEnabled, overview, liveFor, t]);

    const unreadTickets = tickets.filter((ticket) => ticket.has_unread_messages_since_last_reply).length;
    const resourceTotal = serverTotal + vmTotal + webspaceTotal;

    // Greeting + one-line summary.
    const hour = new Date().getHours();
    const greetingKey =
        hour < 12
            ? 'dashboard.home.greeting_morning'
            : hour < 18
              ? 'dashboard.home.greeting_afternoon'
              : 'dashboard.home.greeting_evening';
    const greeting = user ? (
        t(greetingKey, { name: user.first_name || user.username })
    ) : sessionLoading ? (
        <span className='bg-muted/50 inline-block h-7 w-56 animate-pulse rounded-md align-middle' aria-busy='true' />
    ) : (
        t('dashboard.home.greeting_fallback')
    );

    let statusLine: string | null = null;
    let statusTone: 'neutral' | 'good' | 'warning' = 'neutral';
    if (!loadingResources) {
        const parts: string[] = [];
        if (serverTotal > 0 && serverStatusCounts.known === servers.length && servers.length === serverTotal) {
            parts.push(
                t('dashboard.home.status.servers_running', {
                    running: String(serverStatusCounts.running),
                    total: String(serverTotal),
                }),
            );
        }
        if (attention.length > 0) {
            parts.push(
                attention.length === 1
                    ? t('dashboard.home.status.attention_one')
                    : t('dashboard.home.status.attention_many', { count: String(attention.length) }),
            );
            statusTone = 'warning';
        } else if (resourceTotal > 0) {
            parts.push(t('dashboard.home.status.all_good'));
            statusTone = 'good';
        } else {
            parts.push(t('dashboard.home.status.empty'));
        }
        statusLine = parts.join(' · ');
    }

    // ---- Widgets ------------------------------------------------------------------------------

    const statTiles = [
        modules.game &&
            serverTotal > 0 && {
                key: 'game' as const,
                icon: Gamepad2,
                label: t('dashboard.home.stats.game'),
                value: String(serverTotal),
                hint:
                    serverTotal > 0 && serverStatusCounts.known === serverTotal
                        ? t('dashboard.home.stats.running', { count: String(serverStatusCounts.running) })
                        : undefined,
                href: '/dashboard/servers',
            },
        modules.vds &&
            vmTotal > 0 && {
                key: 'vds' as const,
                icon: MonitorCog,
                label: t('dashboard.home.stats.vds'),
                value: String(vmTotal),
                hint:
                    vmTotal > 0 && vms.length === vmTotal
                        ? t('dashboard.home.stats.running', {
                              count: String(vms.filter((vm) => vm.status === 'running').length),
                          })
                        : undefined,
                href: '/dashboard/vms',
            },
        modules.web &&
            webspaceTotal > 0 && {
                key: 'web' as const,
                icon: Globe,
                label: t('dashboard.home.stats.web'),
                value: String(webspaceTotal),
                href: '/dashboard/webspaces',
            },
        ticketsEnabled && {
            key: 'support' as const,
            icon: LifeBuoy,
            label: t('dashboard.home.stats.support'),
            value: String(ticketTotal),
            hint:
                unreadTickets > 0
                    ? t('dashboard.home.stats.new_replies', { count: String(unreadTickets) })
                    : t('dashboard.home.stats.no_new_replies'),
            tone: unreadTickets > 0 ? ('warning' as const) : ('default' as const),
            href: '/dashboard/tickets',
        },
    ]
        .filter(Boolean)
        .filter((tile) => tile && config.statTiles.includes(tile.key)) as {
        key: string;
        icon: typeof Server;
        label: string;
        value: string;
        hint?: string;
        tone?: 'default' | 'warning';
        href: string;
    }[];

    // Modules without resources get no tile; support stays as the way to ask for help.
    const statsBlock = loadingResources ? (
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4' aria-busy='true'>
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className='fp-surface h-[6.25rem] animate-pulse rounded-xl border' />
            ))}
        </div>
    ) : statTiles.length > 0 ? (
        <div className={cn('grid grid-cols-2 lg:grid-cols-4', compact ? 'gap-2' : 'gap-3')}>
            {statTiles.map(({ key, ...tile }) => (
                <DashboardStatTile key={key} {...tile} />
            ))}
        </div>
    ) : null;

    const attentionBlock =
        attention.length > 0 ? (
            <DashboardAttention
                title={t('dashboard.home.attention.title')}
                items={attention}
                moreLabel={(count) => t('dashboard.home.attention.more', { count: String(count) })}
            />
        ) : null;

    const sectionSkeleton = (
        <div className='fp-surface space-y-2 rounded-xl border p-4' aria-busy='true'>
            <div className='bg-muted h-4 w-32 animate-pulse rounded' />
            {[0, 1, 2].map((i) => (
                <div key={i} className='bg-muted/40 h-14 animate-pulse rounded-lg' style={{ opacity: 1 - i * 0.2 }} />
            ))}
        </div>
    );

    // Nothing to manage yet: one calm welcome card with a way forward instead of empty sections.
    const resourceWidgetIds = config.widgets
        .map((w) => w.id)
        .filter((id) => id === 'servers' || id === 'vds' || id === 'webspaces');
    const onboarding = (
        <section className='fp-surface rounded-xl border p-6 text-center sm:p-8'>
            <span className='fp-icon-tile mx-auto flex h-12 w-12 items-center justify-center rounded-xl'>
                <Server className='h-6 w-6' aria-hidden />
            </span>
            <h2 className='mt-4 text-base font-semibold'>{t('dashboard.home.onboarding.title')}</h2>
            <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm'>
                {t('dashboard.home.onboarding.description')}
            </p>
            <div className='mt-5 flex flex-wrap justify-center gap-2'>
                {ticketsEnabled && (
                    <Link
                        href='/dashboard/tickets/create'
                        className='bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium'
                    >
                        <LifeBuoy className='h-4 w-4' aria-hidden />
                        {t('dashboard.home.onboarding.contact')}
                    </Link>
                )}
                {kbEnabled && (
                    <Link
                        href='/dashboard/knowledgebase'
                        className='fp-surface hover:text-foreground inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium'
                    >
                        <BookOpen className='h-4 w-4' aria-hidden />
                        {t('dashboard.home.onboarding.guides')}
                    </Link>
                )}
                <Link
                    href='/dashboard/account'
                    className='fp-surface hover:text-foreground inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium'
                >
                    <Settings2 className='h-4 w-4' aria-hidden />
                    {t('dashboard.home.onboarding.account')}
                </Link>
            </div>
        </section>
    );

    const serverRow = (s: ServerData) => (
        <DashboardServerRow
            key={s.uuid}
            server={s}
            live={liveFor(s)}
            isFavorite={isFavorite(s.uuid)}
            onToggleFavorite={() => toggleFavorite(s.uuid)}
            view={config.servers.view === 'list' ? 'list' : 'detailed'}
            images={config.servers.images}
            meters={config.servers.meters}
            compact={compact}
        />
    );

    const serversSize = config.widgets.find((w) => w.id === 'servers')?.size ?? 'medium';
    const serversBlock =
        serverTotal === 0 ? null : config.servers.view === 'grid' ? (
            <DashboardPanel
                title={t('dashboard.home.sections.game')}
                icon={Gamepad2}
                count={serverTotal}
                action={{ label: t('dashboard.resources.view_all'), href: '/dashboard/servers' }}
            >
                <div className='space-y-4'>
                    {serverGroups.map((g) => (
                        <div key={g.key} className='space-y-2'>
                            {g.label && (
                                <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                                    {g.label}
                                </p>
                            )}
                            <div
                                className={cn(
                                    'grid grid-cols-1 sm:grid-cols-2',
                                    serversSize === 'full' ? 'lg:grid-cols-3 2xl:grid-cols-4' : 'xl:grid-cols-3',
                                    compact ? 'gap-2' : 'gap-3',
                                )}
                            >
                                {g.servers.map((s) => (
                                    <DashboardServerCard
                                        key={s.uuid}
                                        server={s}
                                        live={liveFor(s)}
                                        isFavorite={isFavorite(s.uuid)}
                                        onToggleFavorite={() => toggleFavorite(s.uuid)}
                                        images={config.servers.images}
                                        meters={config.servers.meters}
                                        compact={compact}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DashboardPanel>
        ) : (
            <DashboardPanel
                title={t('dashboard.home.sections.game')}
                icon={Gamepad2}
                count={serverTotal}
                action={{ label: t('dashboard.resources.view_all'), href: '/dashboard/servers' }}
                flush
            >
                {serverGroups.map((g) =>
                    g.label ? (
                        <div key={g.key}>
                            <p className='text-muted-foreground bg-muted/30 px-4 py-1.5 text-[11px] font-semibold tracking-wide uppercase'>
                                {g.label}
                            </p>
                            <div className='divide-border/50 divide-y'>{g.servers.map(serverRow)}</div>
                        </div>
                    ) : (
                        g.servers.map(serverRow)
                    ),
                )}
            </DashboardPanel>
        );

    const vdsBlock =
        vmTotal > 0 ? (
            <DashboardPanel
                title={t('dashboard.home.sections.vds')}
                icon={MonitorCog}
                count={vmTotal}
                action={{ label: t('dashboard.resources.view_all'), href: '/dashboard/vms' }}
                flush
            >
                {vms.slice(0, SECTION_LIMIT).map((vm) => (
                    <DashboardVmRow key={vm.id} vm={vm} compact={compact} />
                ))}
            </DashboardPanel>
        ) : null;

    const webspacesBlock =
        webspaceTotal > 0 ? (
            <DashboardPanel
                title={t('dashboard.home.sections.web')}
                icon={Globe}
                count={webspaceTotal}
                action={{ label: t('dashboard.resources.view_all'), href: '/dashboard/webspaces' }}
                flush
            >
                {webspaces.slice(0, SECTION_LIMIT).map((ws) => (
                    <DashboardWebSpaceRow key={ws.uuid} webspace={ws} compact={compact} />
                ))}
            </DashboardPanel>
        ) : null;

    const resourceBlock = (id: 'servers' | 'vds' | 'webspaces'): ReactNode => {
        if (loadingResources) return id === resourceWidgetIds[0] ? sectionSkeleton : null;
        if (resourceTotal === 0) return id === resourceWidgetIds[0] ? onboarding : null;
        return id === 'servers' ? serversBlock : id === 'vds' ? vdsBlock : webspacesBlock;
    };

    const activityBlock = loadingActivity ? (
        <div className='fp-surface space-y-2 rounded-xl border p-4' aria-busy='true'>
            <div className='bg-muted h-4 w-28 animate-pulse rounded' />
            {[0, 1, 2].map((i) => (
                <div key={i} className='bg-muted/40 h-10 animate-pulse rounded-lg' />
            ))}
        </div>
    ) : activities.length > 0 ? (
        <DashboardPanel
            title={t('dashboard.activity.title')}
            icon={History}
            action={{ label: t('dashboard.activity.view_all'), href: '/dashboard/account?tab=activity' }}
        >
            <ActivityFeed compact activities={activities} formatDate={(value) => formatRelativeTime(value, dateOpts)} />
        </DashboardPanel>
    ) : null;

    const profileBlock = user ? (
        <Link
            href='/dashboard/account'
            className='fp-surface fp-surface-interactive flex min-w-0 items-center gap-3 rounded-xl border p-4'
        >
            {user.avatar ? (
                <Image
                    src={user.avatar}
                    alt=''
                    width={48}
                    height={48}
                    unoptimized
                    className='border-primary/20 h-12 w-12 rounded-full border object-cover'
                />
            ) : (
                <span className='fp-icon-tile flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold'>
                    {`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}
                </span>
            )}
            <div className='min-w-0 flex-1'>
                <p className='truncate font-semibold'>
                    {user.first_name} {user.last_name}
                </p>
                <p className='text-muted-foreground truncate text-sm'>@{user.username}</p>
            </div>
            {user.role && <RoleBadge role={user.role} size='sm' />}
        </Link>
    ) : null;

    const quickActions: QuickAction[] = [
        serverTotal > 1 && {
            key: 'servers',
            label: t('dashboard.widgets.quick_actions.all_servers'),
            href: '/dashboard/servers',
            icon: QUICK_ACTION_ICONS.servers,
        },
        ticketsEnabled && {
            key: 'ticket',
            label: t('dashboard.widgets.quick_actions.new_ticket'),
            href: '/dashboard/tickets/create',
            icon: QUICK_ACTION_ICONS.ticket,
        },
        kbEnabled && {
            key: 'kb',
            label: t('dashboard.widgets.quick_actions.guides'),
            href: '/dashboard/knowledgebase',
            icon: QUICK_ACTION_ICONS.knowledgebase,
        },
        {
            key: 'account',
            label: t('dashboard.widgets.quick_actions.account'),
            href: '/dashboard/account',
            icon: QUICK_ACTION_ICONS.account,
        },
        {
            key: 'ssh',
            label: t('dashboard.widgets.quick_actions.ssh_keys'),
            href: '/dashboard/account?tab=ssh-keys',
            icon: QUICK_ACTION_ICONS.ssh,
        },
        {
            key: 'activity',
            label: t('dashboard.widgets.quick_actions.activity'),
            href: '/dashboard/account?tab=activity',
            icon: QUICK_ACTION_ICONS.activity,
        },
    ].filter(Boolean) as QuickAction[];

    const webspaceUsage = webspaces as unknown as WebSpaceUsageFields[];

    /** Widgets that make sense on this panel (disabled modules and features are not offered). */
    const availableWidgets = useMemo<DashboardWidgetId[]>(() => {
        const ids: DashboardWidgetId[] = ['stats', 'attention'];
        if (modules.game) ids.push('servers');
        if (modules.vds) ids.push('vds');
        if (modules.web) ids.push('webspaces');
        if (modules.game || modules.vds || modules.web) ids.push('usage');
        if (modules.game) ids.push('status', 'uptime', 'network', 'backups', 'schedules');
        ids.push('quick_actions', 'announcements', 'activity');
        if (ticketsEnabled) ids.push('tickets');
        if (kbEnabled) ids.push('knowledgebase');
        if (modules.web) ids.push('recent_mails');
        ids.push('profile');
        return ids;
    }, [modules.game, modules.vds, modules.web, ticketsEnabled, kbEnabled]);

    const renderWidget = (id: DashboardWidgetId): ReactNode => {
        switch (id) {
            case 'stats':
                return statsBlock;
            case 'attention':
                return attentionBlock;
            case 'servers':
            case 'vds':
            case 'webspaces':
                return resourceBlock(id);
            case 'usage':
                return (
                    <UsageWidget
                        overview={overview}
                        loading={loadingOverview || loadingResources}
                        vms={vms}
                        webspaces={webspaceUsage}
                    />
                );
            case 'status':
                return <StatusWidget overview={overview} loading={loadingOverview} />;
            case 'uptime':
                return <UptimeWidget overview={overview} loading={loadingOverview} />;
            case 'network':
                return <NetworkWidget overview={overview} loading={loadingOverview} webspaces={webspaceUsage} />;
            case 'backups':
                return <BackupsWidget overview={overview} loading={loadingOverview} />;
            case 'schedules':
                return <SchedulesWidget overview={overview} loading={loadingOverview} />;
            case 'quick_actions':
                return <QuickActionsWidget actions={quickActions} />;
            case 'announcements':
                return <AnnouncementBanner compact />;
            case 'activity':
                return activityBlock;
            case 'tickets':
                return <TicketList t={t} tickets={tickets} loading={loadingTickets} />;
            case 'knowledgebase':
                return <KnowledgeBaseList t={t} />;
            case 'recent_mails':
                return <DashboardRecentMails />;
            case 'profile':
                return profileBlock;
            default:
                return null;
        }
    };

    const placed: PlacedWidget[] = config.widgets
        .filter((w) => availableWidgets.includes(w.id))
        .map((w, order) => ({ ...w, order, node: renderWidget(w.id) }))
        .filter((w) => w.node !== null && w.node !== undefined && w.node !== false);

    // Hidden until the stored layout is read, so the default layout never flashes first.
    const gap = compact ? 'gap-3' : 'gap-4 lg:gap-5';
    // Inside a run the order style keeps list order on mobile, where both columns flow as one.
    const wrap = (w: PlacedWidget, inRun = true) => (
        <div
            key={w.id}
            style={inRun ? ({ order: w.order } as CSSProperties) : undefined}
            className='fp-collapse-empty-block min-w-0'
        >
            {w.node}
        </div>
    );

    const runs = toRuns(placed);

    return (
        <div className={cn(compact ? 'space-y-3' : 'space-y-5')}>
            <WidgetRenderer widgets={getWidgets('dashboard', 'top-of-page')} {...pluginWidgetProps} />

            <DashboardHeader
                greeting={greeting}
                statusLine={statusLine}
                statusTone={statusTone}
                onCustomize={() => setCustomizeOpen(true)}
            />

            <WidgetRenderer widgets={getWidgets('dashboard', 'before-server-list')} {...pluginWidgetProps} />

            <div className={cn('flex flex-col', dashboard.loaded ? null : 'opacity-0', gap)}>
                {runs.map((run, i) => {
                    if (run.kind === 'full') return wrap(run.widget, false);
                    const main = run.widgets.filter((w) => w.size === 'medium');
                    const side = run.widgets.filter((w) => w.size === 'small');
                    if (main.length === 0) {
                        return (
                            <div
                                key={`run-${i}`}
                                className={cn('grid grid-cols-1 items-start sm:grid-cols-2 lg:grid-cols-3', gap)}
                            >
                                {side.map((w) => wrap(w))}
                            </div>
                        );
                    }
                    if (side.length === 0) {
                        return (
                            <div key={`run-${i}`} className={cn('flex flex-col', gap)}>
                                {main.map((w) => wrap(w))}
                            </div>
                        );
                    }
                    return (
                        <DashboardRun
                            key={`run-${i}`}
                            main={main}
                            side={side}
                            sideFirst={config.sideFirst}
                            compact={compact}
                        />
                    );
                })}
            </div>

            <WidgetRenderer widgets={getWidgets('dashboard', 'after-server-list')} {...pluginWidgetProps} />
            <WidgetRenderer widgets={getWidgets('dashboard', 'bottom-of-page')} {...pluginWidgetProps} />

            <DashboardCustomizeSheet
                open={customizeOpen}
                onOpenChange={setCustomizeOpen}
                api={dashboard}
                availableWidgets={availableWidgets}
            />
        </div>
    );
}
