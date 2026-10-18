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
import {
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Gamepad2,
    Globe,
    History,
    LifeBuoy,
    MonitorCog,
    Server,
    X,
} from 'lucide-react';

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
    DashboardServerRow,
    DashboardVmRow,
    DashboardWebSpaceRow,
    serverRowStatus,
} from '@/components/dashboard/DashboardResourceRows';
import { EmptyState } from '@/components/featherui/EmptyState';
import { RoleBadge } from '@/components/RoleBadge';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { useServersWebSocket } from '@/hooks/useServersWebSocket';
import { useFavoriteServerUuids } from '@/hooks/useFavoriteServerUuids';
import {
    useDashboardLayout,
    type DashboardBlockId,
    type DashboardLeftBlockId,
    type DashboardRightBlockId,
} from '@/hooks/useDashboardLayout';

/** Rows shown per module section; the rest is one click away on the full list. */
const SECTION_LIMIT = 6;
const RECENT_SERVERS_KEY = 'featherpanel_recent_servers_v1';
const DAY_MS = 86_400_000;
const EXPIRY_WARNING_DAYS = 7;
const DISK_WARNING_PERCENT = 90;

/** Single-column (mobile) order. Desktop keeps the user's column layout. */
const MOBILE_ORDER: Record<DashboardLeftBlockId | DashboardRightBlockId, number> = {
    announcements: 1,
    resources: 2,
    activity: 3,
    tickets: 4,
    knowledgebase: 5,
    recent_mails: 6,
    profile: 7,
};

const BLOCK_LABEL_KEYS: Record<DashboardBlockId, string> = {
    stats: 'dashboard.layout.block_labels.stats',
    attention: 'dashboard.layout.block_labels.attention',
    announcements: 'dashboard.layout.block_labels.announcements',
    recent_mails: 'dashboard.layout.block_labels.recent_mails',
    resources: 'dashboard.layout.block_labels.resources',
    tickets: 'dashboard.layout.block_labels.tickets',
    knowledgebase: 'dashboard.layout.block_labels.knowledgebase',
    profile: 'dashboard.layout.block_labels.profile',
    activity: 'dashboard.layout.block_labels.activity',
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

function daysUntil(value?: string | null): number | null {
    const date = parseApiDate(value);
    if (!date) return null;
    return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

function BlockChrome({
    blockId,
    isCustomizing,
    hidden,
    onToggleHidden,
    moveControls,
    onRemove,
    children,
}: {
    blockId: DashboardBlockId;
    isCustomizing: boolean;
    hidden: boolean;
    onToggleHidden: (id: DashboardBlockId) => void;
    moveControls?: { canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void };
    onRemove?: () => void;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    const button =
        'bg-background border-border text-muted-foreground hover:text-foreground rounded-full border p-1.5 shadow-sm disabled:opacity-30';

    return (
        <div
            className={cn(
                'relative',
                isCustomizing && 'outline-primary/30 rounded-xl outline-1 outline-offset-4 outline-dashed',
            )}
        >
            {isCustomizing && (
                <div className='absolute -top-3 right-2 z-20 flex items-center gap-1'>
                    <span className='bg-background text-muted-foreground border-border mr-1 hidden rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-sm sm:inline'>
                        {t(BLOCK_LABEL_KEYS[blockId])}
                    </span>
                    <button
                        type='button'
                        onClick={() => onToggleHidden(blockId)}
                        title={hidden ? t('common.show') : t('common.hide')}
                        aria-label={hidden ? t('common.show') : t('common.hide')}
                        className={button}
                    >
                        {hidden ? <Eye className='h-3.5 w-3.5' /> : <EyeOff className='h-3.5 w-3.5' />}
                    </button>
                    {moveControls && (
                        <>
                            <button
                                type='button'
                                disabled={!moveControls.canUp}
                                onClick={moveControls.onUp}
                                title={t('dashboard.layout.move_up')}
                                aria-label={t('dashboard.layout.move_up')}
                                className={button}
                            >
                                <ChevronUp className='h-3.5 w-3.5' />
                            </button>
                            <button
                                type='button'
                                disabled={!moveControls.canDown}
                                onClick={moveControls.onDown}
                                title={t('dashboard.layout.move_down')}
                                aria-label={t('dashboard.layout.move_down')}
                                className={button}
                            >
                                <ChevronDown className='h-3.5 w-3.5' />
                            </button>
                        </>
                    )}
                    {onRemove && (
                        <button
                            type='button'
                            onClick={onRemove}
                            title={t('dashboard.layout.remove_block')}
                            aria-label={t('dashboard.layout.remove_block')}
                            className={cn(button, 'border-destructive/40 text-destructive hover:text-destructive')}
                        >
                            <X className='h-3.5 w-3.5' />
                        </button>
                    )}
                </div>
            )}
            {/* While customizing, a widget with nothing to show keeps a placeholder so it can still be
                moved or hidden. */}
            <div
                className={cn(
                    hidden && isCustomizing && 'opacity-30 grayscale',
                    isCustomizing &&
                        'empty:border-border/60 empty:bg-muted/20 empty:h-14 empty:rounded-xl empty:border empty:border-dashed',
                )}
            >
                {children}
            </div>
        </div>
    );
}

function FeatureOff() {
    const { t } = useTranslation();
    return (
        <p className='text-muted-foreground border-border/60 rounded-lg border border-dashed p-4 text-sm'>
            {t('dashboard.layout.feature_disabled')}
        </p>
    );
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
    const [loadingResources, setLoadingResources] = useState(true);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [isCustomizing, setIsCustomizing] = useState(false);

    // A disabled module's resources are left out (its API refuses anyway).
    const servers = useMemo(() => (modules.game ? rawServers : []), [modules.game, rawServers]);
    const vms = useMemo(() => (modules.vds ? rawVms : []), [modules.vds, rawVms]);
    const webspaces = useMemo(() => (modules.web ? rawWebspaces : []), [modules.web, rawWebspaces]);
    const serverTotal = modules.game ? rawServerTotal : 0;
    const vmTotal = modules.vds ? rawVmTotal : 0;
    const webspaceTotal = modules.web ? rawWebspaceTotal : 0;

    const { serverLiveData, connectServers, disconnectAll } = useServersWebSocket();
    const { favoriteUuids, toggleFavorite, isFavorite } = useFavoriteServerUuids();
    const layout = useDashboardLayout();
    const { hidden, leftOrder, rightOrder, columnsReversed, isVisible } = layout;

    const pluginWidgetProps = {
        isCustomizing,
        hiddenWidgets: layout.hiddenPluginWidgets,
        onToggleHidden: layout.toggleHiddenPluginWidget,
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

    /** Favourites first, then most recently opened. */
    const shownServers = useMemo(() => {
        const favorites = favoriteUuids
            .map((uuid) => servers.find((s) => s.uuid === uuid))
            .filter((s): s is ServerData => Boolean(s));
        const rest = servers.filter((s) => !favoriteUuids.includes(s.uuid));
        return [...favorites, ...rest].slice(0, SECTION_LIMIT);
    }, [servers, favoriteUuids]);

    useEffect(() => {
        if (shownServers.length === 0) return;
        void connectServers(shownServers.map((s) => s.uuidShort));
    }, [shownServers, connectServers]);

    const liveFor = useCallback((server: ServerData) => serverLiveData[server.uuidShort], [serverLiveData]);

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
    }, [servers, vms, webspaces, tickets, ticketsEnabled, liveFor, t]);

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

    // ---- Blocks -------------------------------------------------------------------------------

    const statTiles = [
        modules.game &&
            serverTotal > 0 && {
                key: 'game',
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
                key: 'vds',
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
                key: 'web',
                icon: Globe,
                label: t('dashboard.home.stats.web'),
                value: String(webspaceTotal),
                href: '/dashboard/webspaces',
            },
        ticketsEnabled && {
            key: 'support',
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
    ].filter(Boolean) as {
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
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            {statTiles.map(({ key, ...tile }) => (
                <DashboardStatTile key={key} {...tile} />
            ))}
        </div>
    ) : null;

    const attentionBlock = (
        <DashboardAttention
            title={t('dashboard.home.attention.title')}
            items={attention}
            moreLabel={(count) => t('dashboard.home.attention.more', { count: String(count) })}
        />
    );

    const resourcesBlock = (
        <div className='space-y-4'>
            <WidgetRenderer widgets={getWidgets('dashboard', 'before-server-list')} {...pluginWidgetProps} />
            {loadingResources ? (
                <div className='fp-surface space-y-2 rounded-xl border p-4' aria-busy='true'>
                    <div className='bg-muted h-4 w-32 animate-pulse rounded' />
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className='bg-muted/40 h-14 animate-pulse rounded-lg'
                            style={{ opacity: 1 - i * 0.2 }}
                        />
                    ))}
                </div>
            ) : resourceTotal === 0 ? (
                <EmptyState
                    icon={Server}
                    title={t('dashboard.resources.no_resources')}
                    description={t('dashboard.home.no_resources_hint')}
                />
            ) : (
                <>
                    {serverTotal > 0 && (
                        <DashboardPanel
                            title={t('dashboard.home.sections.game')}
                            icon={Gamepad2}
                            count={serverTotal}
                            action={{ label: t('dashboard.resources.view_all'), href: '/dashboard/servers' }}
                            flush
                        >
                            {shownServers.map((s) => (
                                <DashboardServerRow
                                    key={s.uuid}
                                    server={s}
                                    live={liveFor(s)}
                                    isFavorite={isFavorite(s.uuid)}
                                    onToggleFavorite={() => toggleFavorite(s.uuid)}
                                />
                            ))}
                        </DashboardPanel>
                    )}
                    {vmTotal > 0 && (
                        <DashboardPanel
                            title={t('dashboard.home.sections.vds')}
                            icon={MonitorCog}
                            count={vmTotal}
                            action={{ label: t('dashboard.resources.view_all'), href: '/dashboard/vms' }}
                            flush
                        >
                            {vms.slice(0, SECTION_LIMIT).map((vm) => (
                                <DashboardVmRow key={vm.id} vm={vm} />
                            ))}
                        </DashboardPanel>
                    )}
                    {webspaceTotal > 0 && (
                        <DashboardPanel
                            title={t('dashboard.home.sections.web')}
                            icon={Globe}
                            count={webspaceTotal}
                            action={{ label: t('dashboard.resources.view_all'), href: '/dashboard/webspaces' }}
                            flush
                        >
                            {webspaces.slice(0, SECTION_LIMIT).map((ws) => (
                                <DashboardWebSpaceRow key={ws.uuid} webspace={ws} />
                            ))}
                        </DashboardPanel>
                    )}
                </>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard', 'after-server-list')} {...pluginWidgetProps} />
        </div>
    );

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

    const renderBlock = (id: DashboardLeftBlockId | DashboardRightBlockId): ReactNode => {
        switch (id) {
            case 'resources':
                return resourcesBlock;
            case 'recent_mails':
                return <DashboardRecentMails />;
            case 'announcements':
                return <AnnouncementBanner compact />;
            case 'activity':
                return activityBlock;
            case 'tickets':
                if (!ticketsEnabled) return isCustomizing ? <FeatureOff /> : null;
                return <TicketList t={t} tickets={tickets} loading={loadingTickets} />;
            case 'knowledgebase':
                if (!kbEnabled) return isCustomizing ? <FeatureOff /> : null;
                return <KnowledgeBaseList t={t} />;
            case 'profile':
                return profileBlock;
            default:
                return null;
        }
    };

    const renderColumn = <T extends DashboardLeftBlockId | DashboardRightBlockId>(
        order: T[],
        move: (id: T, dir: -1 | 1) => void,
        remove: (id: T) => void,
    ) =>
        order.map((id, idx) => {
            const node = renderBlock(id);
            if (!node) return null;
            const isHidden = hidden.includes(id);
            return (
                <div
                    key={id}
                    style={{ order: MOBILE_ORDER[id] } as CSSProperties}
                    className={cn('fp-collapse-empty-block min-w-0', !isVisible(id, isCustomizing) && 'hidden')}
                >
                    <BlockChrome
                        blockId={id}
                        isCustomizing={isCustomizing}
                        hidden={isHidden}
                        onToggleHidden={layout.toggleHidden}
                        moveControls={
                            isCustomizing
                                ? {
                                      canUp: idx > 0,
                                      canDown: idx < order.length - 1,
                                      onUp: () => move(id, -1),
                                      onDown: () => move(id, 1),
                                  }
                                : undefined
                        }
                        onRemove={isCustomizing ? () => remove(id) : undefined}
                    >
                        {node}
                    </BlockChrome>
                </div>
            );
        });

    const topBlock = (id: 'stats' | 'attention', node: ReactNode) =>
        node && isVisible(id, isCustomizing) ? (
            <div className='fp-collapse-empty-block'>
                <BlockChrome
                    blockId={id}
                    isCustomizing={isCustomizing}
                    hidden={hidden.includes(id)}
                    onToggleHidden={layout.toggleHidden}
                >
                    {node}
                </BlockChrome>
            </div>
        ) : null;

    const availablePanel =
        isCustomizing && (layout.leftAvailable.length > 0 || layout.rightAvailable.length > 0) ? (
            <div className='border-primary/30 bg-primary/5 space-y-3 rounded-xl border border-dashed p-4'>
                <p className='text-sm font-medium'>{t('dashboard.layout.available_widgets')}</p>
                <div className='flex flex-wrap gap-2'>
                    {layout.leftAvailable.map((id) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => layout.addToLeft(id)}
                            className='bg-background border-border hover:border-primary/40 rounded-lg border px-3 py-1.5 text-xs'
                        >
                            {t(BLOCK_LABEL_KEYS[id])} {t('dashboard.layout.add_to_main')}
                        </button>
                    ))}
                    {layout.rightAvailable.map((id) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => layout.addToRight(id)}
                            className='bg-background border-border hover:border-primary/40 rounded-lg border px-3 py-1.5 text-xs'
                        >
                            {t(BLOCK_LABEL_KEYS[id])} {t('dashboard.layout.add_to_side')}
                        </button>
                    ))}
                </div>
            </div>
        ) : null;

    return (
        <div className='space-y-5'>
            <WidgetRenderer widgets={getWidgets('dashboard', 'top-of-page')} {...pluginWidgetProps} />

            <DashboardHeader
                greeting={greeting}
                statusLine={statusLine}
                statusTone={statusTone}
                isCustomizing={isCustomizing}
                onToggleCustomizing={() => setIsCustomizing((v) => !v)}
                onSwapColumns={layout.toggleColumnsReversed}
                onReset={layout.resetLayout}
            />

            {topBlock('stats', statsBlock)}
            {topBlock('attention', attentionBlock)}

            {/* Mobile: one column ordered by MOBILE_ORDER (columns use display: contents).
                Desktop: main column plus a narrower side column. */}
            <div className='flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-5'>
                <div
                    className={cn(
                        'contents lg:col-span-2 lg:flex lg:flex-col lg:gap-5',
                        columnsReversed ? 'lg:order-2' : 'lg:order-1',
                    )}
                >
                    {renderColumn(leftOrder, layout.moveInLeft, layout.removeFromLeft)}
                </div>
                <div
                    className={cn(
                        'contents lg:flex lg:flex-col lg:gap-4',
                        columnsReversed ? 'lg:order-1' : 'lg:order-2',
                    )}
                >
                    {renderColumn(rightOrder, layout.moveInRight, layout.removeFromRight)}
                </div>
            </div>

            {availablePanel}

            <WidgetRenderer widgets={getWidgets('dashboard', 'bottom-of-page')} {...pluginWidgetProps} />
        </div>
    );
}
