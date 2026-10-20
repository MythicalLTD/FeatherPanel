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
import { Plus, Trash2, RefreshCw, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { Subuser } from '@/types/server';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

export default function SubusersApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, errorMessage, confirm, prompt } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const [list, setList] = useState<Subuser[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/servers/${uuid}/subusers`, {
                params: { page: 1, per_page: 100 },
            });
            setList(data?.data?.data ?? []);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [uuid, errorMessage]);

    useEffect(() => {
        void load();
    }, [load]);

    const add = async () => {
        const email = await prompt({
            title: t('featheros.subusers.add'),
            placeholder: 'user@example.com',
            confirmLabel: t('featheros.subusers.add'),
        });
        if (!email?.trim()) return;
        try {
            await axios.post(`/api/user/servers/${uuid}/subusers`, { email: email.trim(), permissions: ['*'] });
            toast.success(t('featheros.subusers.added'));
            await load();
        } catch (e) {
            toast.error(errorMessage(e));
        }
    };

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 items-center gap-2 border-b px-3'>
                <Users className='text-muted-foreground h-4 w-4' />
                <span className='text-muted-foreground flex-1 text-[12px]'>
                    {t('featheros.subusers.count', { count: String(list.length) })}
                </span>
                <button
                    type='button'
                    className='hover:bg-muted rounded p-1'
                    onClick={() => void load()}
                    title={t('featheros.common.refresh')}
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
                {can(uuid, 'user.create') && (
                    <button
                        type='button'
                        onClick={() => void add()}
                        className='bg-primary text-primary-foreground flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium'
                    >
                        <Plus className='h-3 w-3' /> {t('featheros.subusers.add')}
                    </button>
                )}
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto p-2'>
                {list.map((u) => (
                    <div key={u.id} className='hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2'>
                        <div className='min-w-0 flex-1'>
                            <div className='truncate text-[13px] font-medium'>{u.username || u.email}</div>
                            <div className='text-muted-foreground truncate text-[11px]'>
                                {u.email} ·{' '}
                                {u.permissions?.includes('*')
                                    ? t('featheros.subusers.all_perms')
                                    : t('featheros.subusers.perm_count', { count: String(u.permissions?.length ?? 0) })}
                            </div>
                        </div>
                        {can(uuid, 'user.delete') && (
                            <button
                                type='button'
                                className='rounded p-1 text-red-600 hover:bg-red-500/10'
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: t('featheros.subusers.delete_title', { name: u.username || u.email }),
                                        confirmLabel: t('featheros.common.delete'),
                                        danger: true,
                                    });
                                    if (!ok) return;
                                    try {
                                        await axios.delete(`/api/user/servers/${uuid}/subusers/${u.id}`);
                                        toast.success(t('featheros.subusers.deleted'));
                                        await load();
                                    } catch (e) {
                                        toast.error(errorMessage(e));
                                    }
                                }}
                            >
                                <Trash2 className='h-3.5 w-3.5' />
                            </button>
                        )}
                    </div>
                ))}
                {!loading && list.length === 0 && (
                    <div className='text-muted-foreground py-12 text-center text-sm'>
                        {t('featheros.subusers.empty')}
                    </div>
                )}
                {loading && list.length === 0 && (
                    <Loader2 className='text-muted-foreground mx-auto mt-10 h-5 w-5 animate-spin' />
                )}
            </div>
            <div className='text-muted-foreground border-t px-3 py-2 text-[11px]'>
                {t('featheros.subusers.panel_hint')}
            </div>
        </div>
    );
}
