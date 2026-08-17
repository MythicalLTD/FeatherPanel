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

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ArrowUpRight, Lock, PlusCircle, Server } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';

interface RecentServer {
    id: number;
    name: string;
    uuidShort?: string;
    uuid_short?: string;
    status?: string | null;
    created_at?: string;
    owner?: { username?: string } | null;
    node?: { name?: string } | null;
}

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error' | 'empty';

export function RecentServersWidget() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const [servers, setServers] = useState<RecentServer[]>([]);
    const [state, setState] = useState<LoadState>('loading');
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchServers = useCallback(async () => {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setState('loading');
        try {
            const response = await axios.get('/api/admin/servers', {
                params: { page: 1, limit: 6, sort_by: 'created_at', sort_order: 'DESC' },
                withCredentials: true,
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            if (response.data.success) {
                const list: RecentServer[] = response.data.data?.servers || [];
                setServers(list);
                setState(list.length ? 'ready' : 'empty');
            } else {
                setState('error');
            }
        } catch (err) {
            if (axios.isCancel(err) || controller.signal.aborted) {
                return;
            }
            if (axios.isAxiosError(err) && err.response?.status === 403) {
                setState('forbidden');
            } else {
                setState('error');
            }
        }
    }, []);

    useEffect(() => {
        fetchServers();
        return () => {
            abortControllerRef.current?.abort();
        };
    }, [fetchServers]);

    return (
        <PageCard
            title={t('admin.recent_servers.title')}
            description={t('admin.recent_servers.description')}
            icon={Server}
            className='h-full'
            action={
                <div className='flex items-center gap-2'>
                    <Link
                        href='/admin/servers/create'
                        className='bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[9px] font-black tracking-widest uppercase transition-colors'
                    >
                        <PlusCircle className='h-3 w-3' />
                        <span className='hidden sm:inline'>{t('admin.recent_servers.create')}</span>
                    </Link>
                    {state !== 'forbidden' && (
                        <Link
                            href='/admin/servers'
                            className='text-muted-foreground hover:text-primary flex items-center gap-1 text-[9px] font-black tracking-widest uppercase transition-colors md:text-[10px]'
                        >
                            {t('admin.recent_servers.view_all')}
                            <ArrowUpRight className='h-3.5 w-3.5' />
                        </Link>
                    )}
                </div>
            }
        >
            {state === 'loading' && (
                <div className='space-y-3'>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className='bg-muted/20 h-14 animate-pulse rounded-2xl' />
                    ))}
                </div>
            )}

            {state === 'forbidden' && (
                <div className='flex flex-col items-center gap-3 py-10 text-center'>
                    <Lock className='text-muted-foreground h-5 w-5' />
                    <p className='text-sm font-bold'>{t('admin.recent_servers.no_permission')}</p>
                </div>
            )}

            {(state === 'empty' || state === 'error') && (
                <div className='flex flex-col items-center gap-3 py-10 text-center'>
                    <p className='text-sm font-bold'>
                        {state === 'error' ? t('admin.recent_servers.error') : t('admin.recent_servers.empty')}
                    </p>
                    {state === 'error' && (
                        <button
                            type='button'
                            onClick={fetchServers}
                            className='bg-secondary border-border/50 rounded-xl border px-4 py-2 text-[10px] font-black tracking-widest uppercase'
                        >
                            {t('admin.recent_servers.retry')}
                        </button>
                    )}
                </div>
            )}

            {state === 'ready' && (
                <div className='space-y-2'>
                    {servers.map((server) => {
                        const short = server.uuidShort || server.uuid_short || String(server.id);
                        return (
                            <Link
                                key={server.id}
                                href={`/admin/servers/${server.id}/edit`}
                                className='bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20 group flex items-center gap-3 rounded-2xl border p-3 transition-all'
                            >
                                <div className='bg-primary/10 text-primary border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border'>
                                    <Server className='h-4 w-4' />
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm font-bold'>{server.name}</p>
                                    <p className='text-muted-foreground truncate text-[10px] font-medium'>
                                        {server.owner?.username || t('admin.recent_servers.unknown_owner')}
                                        {server.node?.name ? ` · ${server.node.name}` : ''}
                                        {server.created_at
                                            ? ` · ${formatRelativeTime(server.created_at, {
                                                  ...dateOpts,
                                                  relativeStyle: 'long',
                                              })}`
                                            : ''}
                                    </p>
                                </div>
                                <span className='text-muted-foreground font-mono text-[10px] opacity-60'>{short}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </PageCard>
    );
}
