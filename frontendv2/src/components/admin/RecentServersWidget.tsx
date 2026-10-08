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

import { AdminWidgetLoading } from './AdminWidgetLoading';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Lock, Server } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { CreateServerAction } from './CreateServerAction';

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
            className='space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
            action={
                <div className='flex items-center gap-2'>
                    <CreateServerAction compact />
                    {state !== 'forbidden' && (
                        <Link
                            href='/admin/servers'
                            className='text-muted-foreground hover:text-foreground hover:bg-accent inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium transition-colors'
                        >
                            {t('admin.recent_servers.view_all')}
                        </Link>
                    )}
                </div>
            }
        >
            {state === 'loading' && <AdminWidgetLoading label={t('admin.recent_servers.title')} />}

            {state === 'forbidden' && (
                <div className='flex flex-col items-center gap-3 py-3 text-center'>
                    <Lock className='text-muted-foreground h-5 w-5' />
                    <p className='text-sm font-bold'>{t('admin.recent_servers.no_permission')}</p>
                </div>
            )}

            {(state === 'empty' || state === 'error') && (
                <div className='flex flex-col items-center gap-3 py-3 text-center'>
                    <p className='text-sm font-bold'>
                        {state === 'error' ? t('admin.recent_servers.error') : t('admin.recent_servers.empty')}
                    </p>
                    {state === 'error' && (
                        <button
                            type='button'
                            onClick={fetchServers}
                            className='bg-secondary min-h-11 rounded-lg px-4 py-2 text-sm font-medium'
                        >
                            {t('admin.recent_servers.retry')}
                        </button>
                    )}
                </div>
            )}

            {state === 'ready' && (
                <div className='divide-border divide-y'>
                    {servers.map((server) => {
                        const short = server.uuidShort || server.uuid_short || String(server.id);
                        return (
                            <Link
                                key={server.id}
                                href={`/admin/servers/${server.id}/edit`}
                                className='group hover:bg-accent flex min-h-11 items-center gap-3 rounded-md py-3.5 transition-colors'
                            >
                                <div className='text-muted-foreground bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md'>
                                    <Server className='h-4 w-4' aria-hidden />
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <p className='text-sm font-medium wrap-break-word'>{server.name}</p>
                                    <p className='text-muted-foreground mt-1 text-xs leading-relaxed wrap-break-word'>
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
                                <span className='text-muted-foreground hidden text-xs tabular-nums sm:block'>
                                    {short}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </PageCard>
    );
}
