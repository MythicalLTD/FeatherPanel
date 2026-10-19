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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Network, Star, Trash2, Copy, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { AllocationItem } from '@/types/server';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

interface AllocServer {
    allocation_limit: number;
    current_allocations: number;
    can_add_more: boolean;
}

export default function NetworkApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, errorMessage, confirm } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const [allocations, setAllocations] = useState<AllocationItem[]>([]);
    const [meta, setMeta] = useState<AllocServer | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/servers/${uuid}/allocations`);
            setAllocations(data?.data?.allocations ?? []);
            setMeta(data?.data?.server ?? null);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [uuid, errorMessage]);

    useEffect(() => {
        void load();
    }, [load]);

    const act = async (key: string, fn: () => Promise<unknown>, success: string) => {
        setBusy(key);
        try {
            await fn();
            toast.success(success);
            await load();
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(null);
        }
    };

    const address = (a: AllocationItem) => `${a.ip_alias || a.ip}:${a.port}`;

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 shrink-0 items-center gap-2 border-b px-3'>
                <span className='text-muted-foreground text-[12px]'>
                    {t('featheros.network.count', {
                        count: String(allocations.length),
                        limit: String(meta?.allocation_limit ?? 0),
                    })}
                </span>
                <button
                    type='button'
                    className='hover:bg-muted ml-auto rounded-md p-1'
                    onClick={() => void load()}
                    title={t('featheros.common.refresh')}
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
                {can(uuid, 'allocation.create') && (
                    <button
                        type='button'
                        disabled={busy === 'auto' || (meta ? !meta.can_add_more : false)}
                        onClick={() =>
                            void act(
                                'auto',
                                () => axios.post(`/api/user/servers/${uuid}/allocations/auto`),
                                t('featheros.network.added'),
                            )
                        }
                        className='bg-primary text-primary-foreground flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium disabled:opacity-50'
                    >
                        {busy === 'auto' ? <Loader2 className='h-3 w-3 animate-spin' /> : <Plus className='h-3 w-3' />}
                        {t('featheros.network.add')}
                    </button>
                )}
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto p-2'>
                {allocations.map((a) => {
                    const key = String(a.id);
                    return (
                        <div key={a.id} className='hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2'>
                            <Network
                                className={cn(
                                    'h-6 w-6 shrink-0',
                                    a.is_primary ? 'text-primary' : 'text-muted-foreground',
                                )}
                            />
                            <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-1.5 font-mono text-[13px]'>
                                    {address(a)}
                                    {a.is_primary && (
                                        <span className='bg-primary/15 text-primary rounded px-1.5 font-sans text-[10px] font-semibold'>
                                            {t('featheros.network.primary')}
                                        </span>
                                    )}
                                </div>
                                {(a.server_notes || a.notes) && (
                                    <div className='text-muted-foreground truncate text-[11px]'>
                                        {a.server_notes || a.notes}
                                    </div>
                                )}
                            </div>
                            {busy === key && <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />}
                            <button
                                type='button'
                                className='hover:bg-muted rounded-md p-1'
                                title={t('featheros.common.copy')}
                                onClick={() =>
                                    void navigator.clipboard
                                        ?.writeText(address(a))
                                        .then(() => toast.success(t('featheros.common.copied')))
                                }
                            >
                                <Copy className='h-3.5 w-3.5' />
                            </button>
                            <button
                                type='button'
                                className='hover:bg-muted rounded-md p-1 disabled:opacity-30'
                                title={t('featheros.network.make_primary')}
                                disabled={a.is_primary || busy === key || !can(uuid, 'allocation.update')}
                                onClick={() =>
                                    void act(
                                        key,
                                        () => axios.post(`/api/user/servers/${uuid}/allocations/${a.id}/primary`),
                                        t('featheros.network.primary_set'),
                                    )
                                }
                            >
                                <Star className='h-3.5 w-3.5' />
                            </button>
                            <button
                                type='button'
                                className='rounded-md p-1 text-red-600 hover:bg-red-500/10 disabled:opacity-30'
                                title={t('featheros.common.delete')}
                                disabled={a.is_primary || busy === key || !can(uuid, 'allocation.delete')}
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: t('featheros.network.delete_title', { address: address(a) }),
                                        confirmLabel: t('featheros.common.delete'),
                                        danger: true,
                                    });
                                    if (ok)
                                        await act(
                                            key,
                                            () => axios.delete(`/api/user/servers/${uuid}/allocations/${a.id}`),
                                            t('featheros.network.deleted'),
                                        );
                                }}
                            >
                                <Trash2 className='h-3.5 w-3.5' />
                            </button>
                        </div>
                    );
                })}
                {!loading && allocations.length === 0 && (
                    <div className='text-muted-foreground py-12 text-center text-sm'>
                        {t('featheros.network.empty')}
                    </div>
                )}
            </div>
        </div>
    );
}
