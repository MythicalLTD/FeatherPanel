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

import { useState, useEffect } from 'react';
import { Server, Clock, Cpu } from 'lucide-react';
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
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

import { serversApi } from '@/lib/servers-api';
import { vmsApi } from '@/lib/vms-api';
import { useServersWebSocket } from '@/hooks/useServersWebSocket';
import { cn } from '@/lib/utils';

import { isEnabled } from '@/lib/utils';

type ResourceFilter = 'all' | 'servers' | 'vds';

export default function DashboardPage() {
    const { t } = useTranslation();
    const { user } = useSession();
    const [servers, setServers] = useState<ServerData[]>([]);
    const [vms, setVms] = useState<VmInstance[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loadingServers, setLoadingServers] = useState(true);
    const [loadingVms, setLoadingVms] = useState(true);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');
    const { settings } = useSettings();
    const { fetchWidgets, getWidgets } = usePluginWidgets('dashboard');

    const { serverLiveData, isServerConnected, connectServers, disconnectAll } = useServersWebSocket();

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

                setServers(orderedServers.slice(0, 5));

                if (serversArray.length > 0) {
                    const serverUuids = serversArray.slice(0, 5).map((s) => s.uuidShort);
                    connectServers(serverUuids);
                }
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

    return (
        <div className='space-y-8'>
            <WidgetRenderer widgets={getWidgets('dashboard', 'top-of-page')} />

            <div className='relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 sm:p-6 md:p-8'>
                <div className='relative z-10'>
                    <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2'>
                        {t('dashboard.welcome')}
                        {user ? `, ${user.first_name}` : ''}
                    </h1>
                    <p className='text-sm sm:text-base md:text-lg text-muted-foreground'>{t('dashboard.subtitle')}</p>
                </div>

                <div className='absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl z-0' />
                <div className='absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl z-0' />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8'>
                <div className='lg:col-span-2 space-y-6 md:space-y-8'>
                    <AnnouncementBanner />

                    <WidgetRenderer widgets={getWidgets('dashboard', 'before-server-list')} />

                    <div className='space-y-6'>
                        <div className='flex items-center justify-between'>
                            <h2 className='text-xl font-bold'>{t('dashboard.resources.title')}</h2>
                            <div className='flex items-center gap-3'>
                                <div className='inline-flex items-center gap-0.5 bg-background/30 rounded-lg p-1 border border-border/50'>
                                    {(['all', 'servers', 'vds'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setResourceFilter(filter)}
                                            className={cn(
                                                'px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap',
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
                                <Link
                                    href={
                                        resourceFilter === 'all'
                                            ? '/dashboard/servers'
                                            : resourceFilter === 'servers'
                                              ? '/dashboard/servers'
                                              : '/dashboard/vms'
                                    }
                                    className='text-sm font-medium text-primary hover:text-primary/80 transition-colors'
                                >
                                    {t('dashboard.resources.view_all')} &rarr;
                                </Link>
                            </div>
                        </div>

                        {loadingServers || loadingVms ? (
                            <div className='flex items-center justify-center py-12'>
                                <Server className='h-8 w-8 animate-spin text-muted-foreground' />
                            </div>
                        ) : (
                            <>
                                {(() => {
                                    const displayServers =
                                        resourceFilter === 'all' || resourceFilter === 'servers' ? servers : [];
                                    const displayVms = resourceFilter === 'all' || resourceFilter === 'vds' ? vms : [];
                                    const allResources = [
                                        ...displayServers.map((s) => ({ type: 'server' as const, data: s })),
                                        ...displayVms.map((v) => ({ type: 'vm' as const, data: v })),
                                    ];

                                    if (allResources.length === 0) {
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

                                    return (
                                        <div className='space-y-4 stagger-children'>
                                            {allResources.map((resource, idx) => (
                                                <div key={`${resource.type}-${idx}`} className='stagger-child'>
                                                    {resource.type === 'server' ? (
                                                        <ServerCard
                                                            server={resource.data as ServerData}
                                                            layout='list'
                                                            serverUrl={`/server/${(resource.data as ServerData).uuidShort}`}
                                                            liveStats={getServerLiveStats(resource.data as ServerData)}
                                                            isConnected={isServerConnected(
                                                                (resource.data as ServerData).uuidShort,
                                                            )}
                                                            t={t}
                                                            folders={[]}
                                                            onAssignFolder={() => {}}
                                                            onUnassignFolder={() => {}}
                                                        />
                                                    ) : (
                                                        <VmCard vm={resource.data as VmInstance} layout='list' />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </>
                        )}

                        <WidgetRenderer widgets={getWidgets('dashboard', 'after-server-list')} />
                    </div>

                    <div className='space-y-6'>
                        {isEnabled(settings?.ticket_system_enabled) && <TicketList t={t} />}
                    </div>

                    <div className='space-y-6'>
                        {isEnabled(settings?.knowledgebase_enabled) && <KnowledgeBaseList t={t} />}
                    </div>
                </div>

                <div className='space-y-8'>
                    {user && (
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
                    )}

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
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('dashboard', 'bottom-of-page')} />
        </div>
    );
}
