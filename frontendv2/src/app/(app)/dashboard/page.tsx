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

import { useState, useEffect, type ReactNode } from 'react';
import {
    Server,
    Clock,
    Eye,
    EyeOff,
    ChevronUp,
    ChevronDown,
    X,
    RotateCcw,
    ArrowLeftRight,
    LayoutDashboard,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';

import type { Server as ServerData } from '@/types/server';
import type { Activity } from '@/types/activity';
import type { VmInstance } from '@/lib/vms-api';

import { ServerCard } from '@/components/servers/ServerCard';
import { VmCard } from '@/components/vms/VmCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AnnouncementBanner } from '@/components/dashboard/AnnouncementBanner';
import { TicketList } from '@/components/dashboard/TicketList';
import { KnowledgeBaseList } from '@/components/dashboard/KnowledgeBaseList';
import { DashboardRecentMails } from '@/components/dashboard/DashboardRecentMails';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

import { serversApi } from '@/lib/servers-api';
import { vmsApi } from '@/lib/vms-api';
import { useServersWebSocket } from '@/hooks/useServersWebSocket';
import { RoleBadge } from '@/components/RoleBadge';
import { cn } from '@/lib/utils';

import { isEnabled } from '@/lib/utils';

import {
    useDashboardLayout,
    type DashboardBlockId,
    type DashboardLeftBlockId,
    type DashboardRightBlockId,
} from '@/hooks/useDashboardLayout';
import { useFavoriteServerUuids } from '@/hooks/useFavoriteServerUuids';

type ResourceFilter = 'all' | 'servers' | 'vds';

type BlockChromeProps = {
    blockId: DashboardBlockId;
    isCustomizing: boolean;
    hiddenBlocks: DashboardBlockId[];
    onToggleHidden: (id: DashboardBlockId) => void;
    children: ReactNode;
    moveControls?: {
        canUp: boolean;
        canDown: boolean;
        onUp: () => void;
        onDown: () => void;
    };
    onRemoveFromLayout?: () => void;
    removeLabel: string;
    moveUpLabel: string;
    moveDownLabel: string;
};

function DashboardBlockChrome({
    blockId,
    isCustomizing,
    hiddenBlocks,
    onToggleHidden,
    children,
    moveControls,
    onRemoveFromLayout,
    removeLabel,
    moveUpLabel,
    moveDownLabel,
}: BlockChromeProps) {
    const { t } = useTranslation();
    const hidden = hiddenBlocks.includes(blockId);

    return (
        <div className='relative'>
            {isCustomizing && (
                <div className='absolute -top-2 -right-2 z-20 flex max-w-[min(100%,12rem)] flex-wrap items-center justify-end gap-1'>
                    <button
                        type='button'
                        onClick={() => onToggleHidden(blockId)}
                        title={hidden ? t('common.show') : t('common.hide')}
                        className='bg-background border-border text-muted-foreground rounded-full border p-2 shadow-sm transition-transform hover:scale-105'
                    >
                        {hidden ? (
                            <Eye className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                        ) : (
                            <EyeOff className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                        )}
                    </button>
                    {moveControls && (
                        <>
                            <button
                                type='button'
                                disabled={!moveControls.canUp}
                                onClick={moveControls.onUp}
                                title={moveUpLabel}
                                className='bg-background border-border text-muted-foreground rounded-full border p-2 shadow-sm transition-transform hover:scale-105 disabled:opacity-30 disabled:hover:scale-100'
                            >
                                <ChevronUp className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                            </button>
                            <button
                                type='button'
                                disabled={!moveControls.canDown}
                                onClick={moveControls.onDown}
                                title={moveDownLabel}
                                className='bg-background border-border text-muted-foreground rounded-full border p-2 shadow-sm transition-transform hover:scale-105 disabled:opacity-30 disabled:hover:scale-100'
                            >
                                <ChevronDown className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                            </button>
                        </>
                    )}
                    {onRemoveFromLayout && (
                        <button
                            type='button'
                            onClick={onRemoveFromLayout}
                            title={removeLabel}
                            className='bg-background border-destructive/40 text-destructive rounded-full border p-2 shadow-sm transition-transform hover:scale-105'
                        >
                            <X className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                        </button>
                    )}
                </div>
            )}
            <div className={cn(hidden && isCustomizing && 'rounded-xl opacity-30 grayscale')}>{children}</div>
        </div>
    );
}

export default function DashboardPage() {
    const { t } = useTranslation();
    const { user } = useSession();
    const dateOpts = useDateFormatOptions();
    const [allServers, setAllServers] = useState<ServerData[]>([]);
    const [vms, setVms] = useState<VmInstance[]>([]);
    const [serverTotal, setServerTotal] = useState(0);
    const [vmTotal, setVmTotal] = useState(0);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loadingServers, setLoadingServers] = useState(true);
    const [loadingVms, setLoadingVms] = useState(true);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');
    const { settings } = useSettings();
    const { fetchWidgets, getWidgets } = usePluginWidgets('dashboard');

    const { serverLiveData, isServerConnected, connectServers, disconnectAll } = useServersWebSocket();

    const { favoriteUuids, toggleFavorite, isFavorite } = useFavoriteServerUuids();

    const {
        hidden,
        leftOrder,
        rightOrder,
        columnsReversed,
        heroAtBottom,
        toggleHidden,
        moveInLeft,
        moveInRight,
        removeFromLeft,
        removeFromRight,
        addToLeft,
        addToRight,
        toggleColumnsReversed,
        toggleHeroAtBottom,
        resetLayout,
        isVisible,
        leftAvailable,
        rightAvailable,
    } = useDashboardLayout();

    const [isCustomizing, setIsCustomizing] = useState(false);

    useEffect(() => {
        fetchWidgets();

        const fetchData = async () => {
            try {
                // Fetch Servers
                const serversResponse = await serversApi.getServers();
                const serversArray = Array.isArray(serversResponse.servers) ? serversResponse.servers : [];

                let orderedServers: ServerData[] = [];

                try {
                    if (typeof window !== 'undefined') {
                        const STORAGE_KEY = 'featherpanel_recent_servers_v1';
                        interface RecentEntry {
                            uuidShort: string;
                            lastViewedAt: string;
                        }

                        const raw = window.localStorage.getItem(STORAGE_KEY);
                        if (raw) {
                            const recent = JSON.parse(raw) as RecentEntry[];

                            if (Array.isArray(recent) && recent.length > 0) {
                                const byUuid = new Map<string, ServerData>();
                                for (const s of serversArray) {
                                    if (s?.uuidShort) {
                                        byUuid.set(s.uuidShort, s);
                                    }
                                }

                                orderedServers = recent
                                    .map((entry) => byUuid.get(entry.uuidShort))
                                    .filter((s): s is ServerData => Boolean(s));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to load recent servers ordering', e);
                }

                if (orderedServers.length === 0) {
                    orderedServers = serversArray;
                }

                setAllServers(orderedServers);
                setServerTotal(
                    typeof serversResponse.pagination?.total_records === 'number'
                        ? serversResponse.pagination.total_records
                        : serversArray.length,
                );
            } catch (err) {
                console.error('Failed to fetch servers', err);
            } finally {
                setLoadingServers(false);
            }

            // Fetch VMs
            try {
                const vmsResponse = await vmsApi.getVms(1, 50);
                const instances = vmsResponse.data?.instances;
                if (Array.isArray(instances)) {
                    setVms(instances.slice(0, 5));
                    setVmTotal(
                        typeof vmsResponse.data?.pagination?.total_records === 'number'
                            ? vmsResponse.data.pagination.total_records
                            : instances.length,
                    );
                } else {
                    setVmTotal(0);
                }
            } catch (err) {
                console.error('Failed to fetch VMs', err);
            } finally {
                setLoadingVms(false);
            }

            // Fetch Activity
            try {
                const { data } = await axios.get('/api/user/activities?limit=5');
                if (data.success && data.data) {
                    setActivities(data.data.activities || []);
                }
            } catch (err) {
                console.error('Failed to fetch activity', err);
            } finally {
                setLoadingActivity(false);
            }
        };

        fetchData();

        return () => {
            disconnectAll();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (loadingServers) return;
        const favSet = new Set(favoriteUuids);
        const favoriteList = favoriteUuids
            .map((u) => allServers.find((s) => s.uuid === u))
            .filter((s): s is ServerData => Boolean(s));
        const recent = allServers.filter((s) => !favSet.has(s.uuid)).slice(0, 5);
        const ids = [...new Set([...favoriteList, ...recent].map((s) => s.uuidShort))];
        if (ids.length === 0) return;
        void connectServers(ids);
    }, [loadingServers, allServers, favoriteUuids, connectServers]);

    const getServerLiveStats = (server: ServerData) => {
        const liveData = serverLiveData[server.uuidShort];
        if (!liveData?.stats) return null;

        return {
            memory: liveData.stats.memoryUsage,
            disk: liveData.stats.diskUsage,
            cpu: liveData.stats.cpuUsage,
            status: liveData.status || server.status,
        };
    };

    const formatDate = (dateString: string): string => formatRelativeTime(dateString, dateOpts);

    const BLOCK_LABEL_KEYS: Record<DashboardBlockId, string> = {
        hero: 'dashboard.layout.block_labels.hero',
        announcements: 'dashboard.layout.block_labels.announcements',
        recent_mails: 'dashboard.layout.block_labels.recent_mails',
        resources: 'dashboard.layout.block_labels.resources',
        tickets: 'dashboard.layout.block_labels.tickets',
        knowledgebase: 'dashboard.layout.block_labels.knowledgebase',
        profile: 'dashboard.layout.block_labels.profile',
        activity: 'dashboard.layout.block_labels.activity',
    };

    useEffect(() => {
        if (loadingServers || loadingVms) {
            return;
        }
        if (serverTotal > 0 && vmTotal > 0) {
            return;
        }
        setResourceFilter('all');
    }, [loadingServers, loadingVms, serverTotal, vmTotal]);

    const blockLabel = (id: DashboardBlockId) => t(BLOCK_LABEL_KEYS[id]);

    const showResourceFilterTabs = !loadingServers && !loadingVms && serverTotal > 0 && vmTotal > 0;

    const resourcesSection = (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('dashboard', 'before-server-list')} />
            <div className='space-y-3'>
                <h2 className='truncate text-lg font-bold sm:text-xl'>{t('dashboard.resources.title')}</h2>
                {showResourceFilterTabs ? (
                    <div className='-mx-0.5 w-full min-w-0 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0'>
                        <div className='bg-background/30 border-border/50 inline-flex w-max max-w-full items-center gap-0.5 rounded-lg border p-1 sm:flex sm:w-auto'>
                            {(['all', 'servers', 'vds'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    type='button'
                                    onClick={() => setResourceFilter(filter)}
                                    className={cn(
                                        'shrink-0 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-all sm:px-4 sm:text-sm',
                                        resourceFilter === filter
                                            ? 'bg-primary text-primary-foreground shadow-md'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                                    )}
                                >
                                    {filter === 'all'
                                        ? t('dashboard.resources.filter_all')
                                        : filter === 'servers'
                                          ? t('dashboard.resources.filter_servers')
                                          : t('dashboard.resources.filter_vms')}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>

            {loadingServers || loadingVms ? (
                <div className='flex items-center justify-center py-12'>
                    <Server className='text-muted-foreground h-8 w-8 animate-spin' />
                </div>
            ) : (
                <>
                    {(() => {
                        const favSet = new Set(favoriteUuids);
                        const favoriteServerList = favoriteUuids
                            .map((u) => allServers.find((s) => s.uuid === u))
                            .filter((s): s is ServerData => Boolean(s));

                        const showFavoriteBlock =
                            (resourceFilter === 'all' || resourceFilter === 'servers') && favoriteServerList.length > 0;

                        const displayServers =
                            resourceFilter === 'all' || resourceFilter === 'servers'
                                ? allServers.filter((s) => !favSet.has(s.uuid)).slice(0, 5)
                                : [];
                        const displayVms = resourceFilter === 'all' || resourceFilter === 'vds' ? vms : [];
                        const otherResources = [
                            ...displayServers.map((s) => ({ type: 'server' as const, data: s })),
                            ...displayVms.map((v) => ({ type: 'vm' as const, data: v })),
                        ];

                        if (!showFavoriteBlock && otherResources.length === 0) {
                            return (
                                <div className='border-border/50 bg-card/50 rounded-xl border p-12 text-center backdrop-blur-xl'>
                                    <Server className='text-muted-foreground/50 mx-auto mb-3 h-12 w-12' />
                                    <p className='text-muted-foreground font-medium'>
                                        {resourceFilter === 'all'
                                            ? t('dashboard.resources.no_resources')
                                            : resourceFilter === 'servers'
                                              ? t('dashboard.resources.no_servers')
                                              : t('dashboard.resources.no_vms')}
                                    </p>
                                    <p className='text-muted-foreground/70 mt-1 text-sm'>
                                        {t('dashboard.resources.create_first')}
                                    </p>
                                </div>
                            );
                        }

                        const serverCardProps = (s: ServerData) => ({
                            server: s,
                            layout: 'list' as const,
                            serverUrl: `/server/${s.uuidShort}`,
                            liveStats: getServerLiveStats(s),
                            isConnected: isServerConnected(s.uuidShort),
                            t,
                            folders: [],
                            onAssignFolder: () => {},
                            onUnassignFolder: () => {},
                            showFavoriteToggle: true,
                            isFavorite: isFavorite(s.uuid),
                            onToggleFavorite: () => toggleFavorite(s.uuid),
                        });

                        return (
                            <div className='space-y-6'>
                                {showFavoriteBlock ? (
                                    <div className='space-y-3'>
                                        <div className='flex min-w-0 items-center justify-between gap-3'>
                                            <h3 className='text-foreground truncate text-sm font-semibold'>
                                                {t('dashboard.favorite_servers.title')}
                                            </h3>
                                        </div>
                                        <div className='stagger-children space-y-3'>
                                            {favoriteServerList.map((s) => (
                                                <div key={`fav-${s.uuid}`} className='stagger-child'>
                                                    <ServerCard {...serverCardProps(s)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                {otherResources.length > 0 ? (
                                    <div className='stagger-children space-y-4'>
                                        {otherResources.map((resource, idx) => (
                                            <div key={`${resource.type}-${idx}`} className='stagger-child'>
                                                {resource.type === 'server' ? (
                                                    <ServerCard {...serverCardProps(resource.data as ServerData)} />
                                                ) : (
                                                    <VmCard vm={resource.data as VmInstance} layout='list' />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })()}
                </>
            )}

            <WidgetRenderer widgets={getWidgets('dashboard', 'after-server-list')} />
        </div>
    );

    const heroHidden = hidden.includes('hero');

    const heroSection = (
        <div
            className={cn(
                'from-primary/10 via-primary/5 border-primary/20 relative overflow-hidden rounded-2xl border bg-linear-to-br to-transparent p-4 transition-[opacity,filter] sm:p-6 md:p-8',
                isCustomizing && heroHidden && 'opacity-30 grayscale',
            )}
        >
            <div className='relative z-10 flex flex-col gap-4 sm:gap-5'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6'>
                    <div className='min-w-0 flex-1 space-y-2'>
                        <h1 className='text-foreground text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl'>
                            {t('dashboard.welcome')}
                            {user ? `, ${user.first_name}` : ''}
                        </h1>
                        <p className='text-muted-foreground max-w-2xl text-sm sm:text-base md:text-lg'>
                            {t('dashboard.subtitle')}
                        </p>
                    </div>

                    <div className='flex w-full flex-col gap-2 lg:w-auto lg:max-w-md lg:shrink-0 lg:items-end'>
                        {isCustomizing && (
                            <div className='flex w-full flex-wrap items-center justify-end gap-2'>
                                <button
                                    type='button'
                                    onClick={() => toggleHidden('hero')}
                                    title={heroHidden ? t('common.show') : t('common.hide')}
                                    className='border-border/60 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium shadow-sm'
                                >
                                    {heroHidden ? <Eye className='h-3.5 w-3.5' /> : <EyeOff className='h-3.5 w-3.5' />}
                                    <span className='hidden sm:inline'>{t('dashboard.layout.block_labels.hero')}</span>
                                </button>
                                <button
                                    type='button'
                                    onClick={toggleColumnsReversed}
                                    className='border-border/60 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium shadow-sm'
                                >
                                    <ArrowLeftRight className='h-3.5 w-3.5 shrink-0' />
                                    <span className='hidden sm:inline'>{t('dashboard.layout.swap_columns')}</span>
                                </button>
                                <button
                                    type='button'
                                    onClick={toggleHeroAtBottom}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium shadow-sm transition-colors',
                                        heroAtBottom
                                            ? 'border-primary/40 bg-primary/15 text-foreground'
                                            : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
                                    )}
                                >
                                    {heroAtBottom ? t('dashboard.layout.hero_top') : t('dashboard.layout.hero_bottom')}
                                </button>
                                <button
                                    type='button'
                                    onClick={resetLayout}
                                    title={t('dashboard.layout.reset')}
                                    className='border-border/60 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium shadow-sm'
                                >
                                    <RotateCcw className='h-3.5 w-3.5' />
                                    <span className='hidden sm:inline'>{t('dashboard.layout.reset')}</span>
                                </button>
                            </div>
                        )}
                        <button
                            type='button'
                            onClick={() => setIsCustomizing(!isCustomizing)}
                            className={cn(
                                'inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors sm:w-auto lg:ml-auto',
                                'border-primary/25 bg-background/65 text-foreground backdrop-blur-sm',
                                'hover:bg-background/90 hover:border-primary/40',
                                isCustomizing &&
                                    'border-amber-500/45 bg-amber-500/10 text-amber-950 dark:border-amber-500/35 dark:text-amber-100',
                            )}
                        >
                            <LayoutDashboard className='h-4 w-4 shrink-0' />
                            <span>
                                {isCustomizing
                                    ? t('dashboard.layout.stop_customizing')
                                    : t('dashboard.layout.customize_layout')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div className='bg-primary/5 pointer-events-none absolute top-0 right-0 z-0 h-64 w-64 rounded-full blur-3xl' />
            <div className='bg-primary/5 pointer-events-none absolute bottom-0 left-0 z-0 h-48 w-48 rounded-full blur-3xl' />
        </div>
    );

    const profileBlock = user && (
        <div className='border-border/50 bg-card/50 rounded-xl border p-6 backdrop-blur-xl'>
            <div className='flex items-center gap-4'>
                {user.avatar ? (
                    <Image
                        src={user.avatar}
                        alt={`${user.first_name} ${user.last_name}`}
                        width={64}
                        height={64}
                        unoptimized
                        className='border-primary/20 h-16 w-16 rounded-full border-2 object-cover'
                    />
                ) : (
                    <div className='from-primary/20 to-primary/10 border-primary/20 flex h-16 w-16 items-center justify-center rounded-full border-2 bg-linear-to-br'>
                        <span className='text-primary text-2xl font-semibold'>
                            {`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}
                        </span>
                    </div>
                )}
                <div className='min-w-0 flex-1'>
                    <h2 className='text-foreground mb-1 truncate text-xl font-semibold'>
                        {user.first_name} {user.last_name}
                    </h2>
                    {user.role && (
                        <div className='mb-1'>
                            <RoleBadge role={user.role} size='sm' className='font-semibold' />
                        </div>
                    )}
                    <p className='text-muted-foreground truncate text-sm'>@{user.username}</p>
                </div>
            </div>
        </div>
    );

    const activityBlock = (
        <div className='border-border/50 bg-card/50 rounded-xl border p-6 backdrop-blur-xl'>
            <div className='mb-6 flex items-center justify-between'>
                <h2 className='text-lg font-bold'>{t('dashboard.activity.title')}</h2>
                <Link
                    href='/dashboard/account?tab=activity'
                    className='text-primary hover:text-primary/80 text-xs font-medium transition-colors'
                >
                    {t('dashboard.activity.view_all')} &rarr;
                </Link>
            </div>

            {loadingActivity ? (
                <div className='flex items-center justify-center py-8'>
                    <Clock className='text-muted-foreground h-6 w-6 animate-spin' />
                </div>
            ) : activities.length > 0 ? (
                <ActivityFeed activities={activities} formatDate={formatDate} />
            ) : (
                <div className='py-8 text-center'>
                    <Clock className='text-muted-foreground/50 mx-auto mb-3 h-10 w-10' />
                    <p className='text-muted-foreground text-sm'>{t('dashboard.activity.no_activity')}</p>
                </div>
            )}
        </div>
    );

    const renderLeftBlock = (id: DashboardLeftBlockId) => {
        const idx = leftOrder.indexOf(id);
        const chromeProps = {
            blockId: id as DashboardBlockId,
            isCustomizing,
            hiddenBlocks: hidden,
            onToggleHidden: toggleHidden,
            removeLabel: t('dashboard.layout.remove_block'),
            moveUpLabel: t('dashboard.layout.move_up'),
            moveDownLabel: t('dashboard.layout.move_down'),
            moveControls: isCustomizing
                ? {
                      canUp: idx > 0,
                      canDown: idx >= 0 && idx < leftOrder.length - 1,
                      onUp: () => moveInLeft(id, -1),
                      onDown: () => moveInLeft(id, 1),
                  }
                : undefined,
            onRemoveFromLayout: isCustomizing ? () => removeFromLeft(id) : undefined,
        };

        switch (id) {
            case 'recent_mails':
                return (
                    <DashboardBlockChrome key={id} {...chromeProps}>
                        <DashboardRecentMails />
                    </DashboardBlockChrome>
                );
            case 'announcements':
                return (
                    <DashboardBlockChrome key={id} {...chromeProps}>
                        <AnnouncementBanner />
                    </DashboardBlockChrome>
                );
            case 'resources':
                return (
                    <DashboardBlockChrome key={id} {...chromeProps}>
                        {resourcesSection}
                    </DashboardBlockChrome>
                );
            case 'tickets': {
                const enabled = isEnabled(settings?.ticket_system_enabled);
                if (!enabled && !isCustomizing) return null;
                return (
                    <DashboardBlockChrome key={id} {...chromeProps}>
                        {enabled ? (
                            <div className='space-y-6'>
                                <TicketList t={t} />
                            </div>
                        ) : (
                            <p className='text-muted-foreground border-border/60 rounded-lg border border-dashed p-4 text-sm'>
                                {t('dashboard.layout.feature_disabled')}
                            </p>
                        )}
                    </DashboardBlockChrome>
                );
            }
            case 'knowledgebase': {
                const enabled = isEnabled(settings?.knowledgebase_enabled);
                if (!enabled && !isCustomizing) return null;
                return (
                    <DashboardBlockChrome key={id} {...chromeProps}>
                        {enabled ? (
                            <div className='space-y-6'>
                                <KnowledgeBaseList t={t} />
                            </div>
                        ) : (
                            <p className='text-muted-foreground border-border/60 rounded-lg border border-dashed p-4 text-sm'>
                                {t('dashboard.layout.feature_disabled')}
                            </p>
                        )}
                    </DashboardBlockChrome>
                );
            }
            default:
                return null;
        }
    };

    const renderRightBlock = (id: DashboardRightBlockId) => {
        const idx = rightOrder.indexOf(id);
        const chromeProps = {
            blockId: id as DashboardBlockId,
            isCustomizing,
            hiddenBlocks: hidden,
            onToggleHidden: toggleHidden,
            removeLabel: t('dashboard.layout.remove_block'),
            moveUpLabel: t('dashboard.layout.move_up'),
            moveDownLabel: t('dashboard.layout.move_down'),
            moveControls: isCustomizing
                ? {
                      canUp: idx > 0,
                      canDown: idx >= 0 && idx < rightOrder.length - 1,
                      onUp: () => moveInRight(id, -1),
                      onDown: () => moveInRight(id, 1),
                  }
                : undefined,
            onRemoveFromLayout: isCustomizing ? () => removeFromRight(id) : undefined,
        };

        if (id === 'profile') {
            if (!user) return null;
            return (
                <DashboardBlockChrome key={id} {...chromeProps}>
                    {profileBlock}
                </DashboardBlockChrome>
            );
        }

        return (
            <DashboardBlockChrome key={id} {...chromeProps}>
                {activityBlock}
            </DashboardBlockChrome>
        );
    };

    const availablePanel =
        isCustomizing && (leftAvailable.length > 0 || rightAvailable.length > 0) ? (
            <div className='border-primary/30 bg-primary/5 space-y-3 rounded-xl border border-dashed p-4'>
                <p className='text-foreground text-sm font-medium'>{t('dashboard.layout.available_widgets')}</p>
                <div className='flex flex-wrap gap-2'>
                    {leftAvailable.map((id) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => addToLeft(id)}
                            className='bg-background border-border hover:border-primary/40 rounded-lg border px-3 py-1.5 text-xs transition-colors'
                        >
                            {blockLabel(id)} — {t('dashboard.layout.add_to_main')}
                        </button>
                    ))}
                    {rightAvailable.map((id) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => addToRight(id)}
                            className='bg-background border-border hover:border-primary/40 rounded-lg border px-3 py-1.5 text-xs transition-colors'
                        >
                            {blockLabel(id)} — {t('dashboard.layout.add_to_side')}
                        </button>
                    ))}
                </div>
            </div>
        ) : null;

    const mainColumn = (
        <div className={cn('space-y-6 md:space-y-8 lg:col-span-2', !columnsReversed ? 'lg:order-1' : 'lg:order-2')}>
            {leftOrder.map((id) => {
                const node = renderLeftBlock(id);
                if (!node) return null;
                return (
                    <div
                        key={id}
                        className={cn(
                            'transition-all duration-500',
                            !isVisible(id as DashboardBlockId, isCustomizing) && 'hidden',
                        )}
                    >
                        {node}
                    </div>
                );
            })}
        </div>
    );

    const sideColumn = (
        <div className={cn('space-y-8', !columnsReversed ? 'lg:order-2' : 'lg:order-1')}>
            {rightOrder.map((id) => {
                const node = renderRightBlock(id);
                if (!node) return null;
                return (
                    <div
                        key={id}
                        className={cn(
                            'transition-all duration-500',
                            !isVisible(id as DashboardBlockId, isCustomizing) && 'hidden',
                        )}
                    >
                        {node}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className='space-y-8'>
            <WidgetRenderer widgets={getWidgets('dashboard', 'top-of-page')} />

            {!heroAtBottom && (
                <div className={cn('transition-all duration-500', !isVisible('hero', isCustomizing) && 'hidden')}>
                    {heroSection}
                </div>
            )}

            <div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3 lg:gap-8'>
                {mainColumn}
                {sideColumn}
            </div>

            {availablePanel}

            {heroAtBottom && (
                <div className={cn('transition-all duration-500', !isVisible('hero', isCustomizing) && 'hidden')}>
                    {heroSection}
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('dashboard', 'bottom-of-page')} />
        </div>
    );
}
