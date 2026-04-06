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
                <div className='absolute -top-2 -right-2 z-20 flex flex-wrap items-center justify-end gap-1 max-w-[min(100%,12rem)]'>
                    <button
                        type='button'
                        onClick={() => onToggleHidden(blockId)}
                        title={hidden ? t('common.show') : t('common.hide')}
                        className='p-2 rounded-full bg-background border border-border hover:scale-105 transition-transform text-muted-foreground shadow-sm'
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
                                className='p-2 rounded-full bg-background border border-border hover:scale-105 transition-transform text-muted-foreground shadow-sm disabled:opacity-30 disabled:hover:scale-100'
                            >
                                <ChevronUp className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                            </button>
                            <button
                                type='button'
                                disabled={!moveControls.canDown}
                                onClick={moveControls.onDown}
                                title={moveDownLabel}
                                className='p-2 rounded-full bg-background border border-border hover:scale-105 transition-transform text-muted-foreground shadow-sm disabled:opacity-30 disabled:hover:scale-100'
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
                            className='p-2 rounded-full bg-background border border-destructive/40 text-destructive hover:scale-105 transition-transform shadow-sm'
                        >
                            <X className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                        </button>
                    )}
                </div>
            )}
            <div className={cn(hidden && isCustomizing && 'opacity-30 grayscale rounded-xl')}>{children}</div>
        </div>
    );
}

export default function DashboardPage() {
    const { t } = useTranslation();
    const { user } = useSession();
    const [allServers, setAllServers] = useState<ServerData[]>([]);
    const [vms, setVms] = useState<VmInstance[]>([]);
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
            } catch (err) {
                console.error('Failed to fetch servers', err);
            } finally {
                setLoadingServers(false);
            }

            // Fetch VMs
            try {
                const vmsResponse = await vmsApi.getVms(1, 50);
                if (vmsResponse.data?.instances) {
                    setVms(vmsResponse.data.instances.slice(0, 5));
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

    const formatDate = (dateString: string): string => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

            if (diffInHours < 1) {
                return t('common.time.just_now');
            } else if (diffInHours < 24) {
                const hours = Math.floor(diffInHours);

                return t('common.time.hours_ago', { count: hours.toString(), s: hours > 1 ? 's' : '' });
            } else if (diffInHours < 48) {
                return t('common.time.yesterday');
            } else {
                return (
                    date.toLocaleDateString() +
                    ' ' +
                    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                );
            }
        } catch {
            return dateString;
        }
    };

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

    const blockLabel = (id: DashboardBlockId) => t(BLOCK_LABEL_KEYS[id]);

    const resourcesSection = (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('dashboard', 'before-server-list')} />
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                <div className='flex items-center justify-between gap-3 min-w-0'>
                    <h2 className='text-lg sm:text-xl font-bold truncate'>{t('dashboard.resources.title')}</h2>
                    <Link
                        href={
                            resourceFilter === 'all'
                                ? '/dashboard/servers'
                                : resourceFilter === 'servers'
                                  ? '/dashboard/servers'
                                  : '/dashboard/vms'
                        }
                        className='text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0 whitespace-nowrap'
                    >
                        {t('dashboard.resources.view_all')} &rarr;
                    </Link>
                </div>
                <div className='w-full min-w-0 overflow-x-auto overscroll-x-contain pb-0.5 -mx-0.5 px-0.5 sm:mx-0 sm:px-0 sm:w-auto sm:overflow-visible'>
                    <div className='inline-flex sm:flex items-center gap-0.5 bg-background/30 rounded-lg p-1 border border-border/50 w-max max-w-full sm:w-auto'>
                        {(['all', 'servers', 'vds'] as const).map((filter) => (
                            <button
                                key={filter}
                                type='button'
                                onClick={() => setResourceFilter(filter)}
                                className={cn(
                                    'px-3 py-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0',
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
            </div>

            {loadingServers || loadingVms ? (
                <div className='flex items-center justify-center py-12'>
                    <Server className='h-8 w-8 animate-spin text-muted-foreground' />
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
                                <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-12 text-center'>
                                    <Server className='h-12 w-12 text-muted-foreground/50 mx-auto mb-3' />
                                    <p className='text-muted-foreground font-medium'>
                                        {resourceFilter === 'all'
                                            ? t('dashboard.resources.no_resources')
                                            : resourceFilter === 'servers'
                                              ? t('dashboard.resources.no_servers')
                                              : t('dashboard.resources.no_vms')}
                                    </p>
                                    <p className='text-sm text-muted-foreground/70 mt-1'>
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
                                        <div className='flex items-center justify-between gap-3 min-w-0'>
                                            <h3 className='text-sm font-semibold text-foreground truncate'>
                                                {t('dashboard.favorite_servers.title')}
                                            </h3>
                                        </div>
                                        <div className='space-y-3 stagger-children'>
                                            {favoriteServerList.map((s) => (
                                                <div key={`fav-${s.uuid}`} className='stagger-child'>
                                                    <ServerCard {...serverCardProps(s)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                {otherResources.length > 0 ? (
                                    <div className='space-y-4 stagger-children'>
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
                'relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 sm:p-6 md:p-8 transition-[opacity,filter]',
                isCustomizing && heroHidden && 'opacity-30 grayscale',
            )}
        >
            <div className='relative z-10 flex flex-col gap-4 sm:gap-5'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6'>
                    <div className='min-w-0 flex-1 space-y-2'>
                        <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground'>
                            {t('dashboard.welcome')}
                            {user ? `, ${user.first_name}` : ''}
                        </h1>
                        <p className='text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl'>
                            {t('dashboard.subtitle')}
                        </p>
                    </div>

                    <div className='flex flex-col gap-2 w-full lg:w-auto lg:max-w-md lg:items-end lg:shrink-0'>
                        {isCustomizing && (
                            <div className='flex flex-wrap items-center justify-end gap-2 w-full'>
                                <button
                                    type='button'
                                    onClick={() => toggleHidden('hero')}
                                    title={heroHidden ? t('common.show') : t('common.hide')}
                                    className='inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground shadow-sm'
                                >
                                    {heroHidden ? <Eye className='h-3.5 w-3.5' /> : <EyeOff className='h-3.5 w-3.5' />}
                                    <span className='hidden sm:inline'>{t('dashboard.layout.block_labels.hero')}</span>
                                </button>
                                <button
                                    type='button'
                                    onClick={toggleColumnsReversed}
                                    className='inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground shadow-sm'
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
                                    className='inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground shadow-sm'
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
                                'inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors w-full sm:w-auto lg:ml-auto',
                                'border-primary/25 bg-background/65 text-foreground backdrop-blur-sm',
                                'hover:bg-background/90 hover:border-primary/40',
                                isCustomizing &&
                                    'border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100 dark:border-amber-500/35',
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

            <div className='absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl z-0 pointer-events-none' />
            <div className='absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl z-0 pointer-events-none' />
        </div>
    );

    const profileBlock = user && (
        <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-6'>
            <div className='flex items-center gap-4'>
                {user.avatar ? (
                    <Image
                        src={user.avatar}
                        alt={`${user.first_name} ${user.last_name}`}
                        width={64}
                        height={64}
                        unoptimized
                        className='h-16 w-16 rounded-full border-2 border-primary/20 object-cover'
                    />
                ) : (
                    <div className='h-16 w-16 rounded-full bg-linear-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center'>
                        <span className='text-2xl font-semibold text-primary'>
                            {`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}
                        </span>
                    </div>
                )}
                <div className='flex-1 min-w-0'>
                    <h2 className='text-xl font-semibold text-foreground truncate mb-1'>
                        {user.first_name} {user.last_name}
                    </h2>
                    {user.role && (
                        <div className='mb-1'>
                            <span
                                className='inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold'
                                style={{
                                    backgroundColor: `${user.role.color}20`,
                                    color: user.role.color,
                                    border: `1px solid ${user.role.color}40`,
                                }}
                            >
                                {user.role.display_name}
                            </span>
                        </div>
                    )}
                    <p className='text-sm text-muted-foreground truncate'>@{user.username}</p>
                </div>
            </div>
        </div>
    );

    const activityBlock = (
        <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-6'>
            <div className='flex items-center justify-between mb-6'>
                <h2 className='text-lg font-bold'>{t('dashboard.activity.title')}</h2>
                <Link
                    href='/dashboard/account?tab=activity'
                    className='text-xs font-medium text-primary hover:text-primary/80 transition-colors'
                >
                    {t('dashboard.activity.view_all')} &rarr;
                </Link>
            </div>

            {loadingActivity ? (
                <div className='flex items-center justify-center py-8'>
                    <Clock className='h-6 w-6 animate-spin text-muted-foreground' />
                </div>
            ) : activities.length > 0 ? (
                <ActivityFeed activities={activities} formatDate={formatDate} />
            ) : (
                <div className='text-center py-8'>
                    <Clock className='h-10 w-10 text-muted-foreground/50 mx-auto mb-3' />
                    <p className='text-sm text-muted-foreground'>{t('dashboard.activity.no_activity')}</p>
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
                            <p className='text-sm text-muted-foreground rounded-lg border border-dashed border-border/60 p-4'>
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
                            <p className='text-sm text-muted-foreground rounded-lg border border-dashed border-border/60 p-4'>
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
            <div className='rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3'>
                <p className='text-sm font-medium text-foreground'>{t('dashboard.layout.available_widgets')}</p>
                <div className='flex flex-wrap gap-2'>
                    {leftAvailable.map((id) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => addToLeft(id)}
                            className='text-xs px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/40 transition-colors'
                        >
                            {blockLabel(id)} — {t('dashboard.layout.add_to_main')}
                        </button>
                    ))}
                    {rightAvailable.map((id) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => addToRight(id)}
                            className='text-xs px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/40 transition-colors'
                        >
                            {blockLabel(id)} — {t('dashboard.layout.add_to_side')}
                        </button>
                    ))}
                </div>
            </div>
        ) : null;

    const mainColumn = (
        <div className={cn('lg:col-span-2 space-y-6 md:space-y-8', !columnsReversed ? 'lg:order-1' : 'lg:order-2')}>
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

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8'>
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
