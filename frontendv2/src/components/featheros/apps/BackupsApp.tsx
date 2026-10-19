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
import {
    Archive,
    Plus,
    Download,
    RotateCcw,
    Trash2,
    Lock,
    Unlock,
    RefreshCw,
    Loader2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { triggerSignedUrlDownload } from '@/lib/trigger-signed-download';
import { cn } from '@/lib/utils';
import type { BackupItem } from '@/types/server';
import { useFeatherOs } from '../FeatherOsContext';
import { formatBytes } from '../utils';
import type { OsAppProps } from './index';

export default function BackupsApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, errorMessage, confirm, prompt, getServer } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const server = getServer(uuid);
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(
        async (quiet = false) => {
            if (!quiet) setLoading(true);
            try {
                const { data } = await axios.get(`/api/user/servers/${uuid}/backups`, {
                    params: { page: 1, per_page: 100 },
                });
                setBackups(data?.data?.data ?? []);
            } catch (e) {
                if (!quiet) toast.error(errorMessage(e));
            } finally {
                setLoading(false);
            }
        },
        [uuid, errorMessage],
    );

    useEffect(() => {
        void load();
    }, [load]);

    // Poll while a backup is still running.
    const inProgress = backups.some((b) => !b.completed_at && !b.is_successful && !b.is_stale);
    useEffect(() => {
        if (!inProgress) return;
        const id = window.setInterval(() => void load(true), 4000);
        return () => window.clearInterval(id);
    }, [inProgress, load]);

    const act = async (key: string, fn: () => Promise<unknown>, success?: string) => {
        setBusy(key);
        try {
            await fn();
            if (success) toast.success(success);
            await load(true);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(null);
        }
    };

    const create = async () => {
        const name = await prompt({
            title: t('featheros.backups.create'),
            placeholder: t('featheros.backups.name_placeholder'),
            confirmLabel: t('featheros.backups.create'),
        });
        if (name === null) return;
        await act(
            'create',
            () => axios.post(`/api/user/servers/${uuid}/backups`, { name: name.trim() }),
            t('featheros.backups.started'),
        );
    };

    const restore = async (b: BackupItem) => {
        const ok = await confirm({
            title: t('featheros.backups.restore_title', { name: b.name }),
            message: t('featheros.backups.restore_message'),
            confirmLabel: t('featheros.backups.restore'),
            danger: true,
        });
        if (!ok) return;
        await act(
            b.uuid,
            () => axios.post(`/api/user/servers/${uuid}/backups/${b.uuid}/restore`, { truncate_directory: false }),
            t('featheros.backups.restore_started'),
        );
    };

    const remove = async (b: BackupItem) => {
        const ok = await confirm({
            title: t('featheros.backups.delete_title', { name: b.name }),
            confirmLabel: t('featheros.common.delete'),
            danger: true,
        });
        if (!ok) return;
        await act(
            b.uuid,
            () => axios.delete(`/api/user/servers/${uuid}/backups/${b.uuid}`),
            t('featheros.backups.deleted'),
        );
    };

    const download = (b: BackupItem) =>
        act(b.uuid, async () => {
            const { data } = await axios.get(`/api/user/servers/${uuid}/backups/${b.uuid}/download`);
            triggerSignedUrlDownload(data.data.download_url);
        });

    const btn =
        'flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent';

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 shrink-0 items-center gap-2 border-b px-3'>
                <span className='text-muted-foreground text-[12px]'>
                    {t('featheros.backups.count', {
                        count: String(backups.length),
                        limit: String(server?.backup_limit ?? 0),
                    })}
                </span>
                <button
                    type='button'
                    className={cn(btn, 'ml-auto')}
                    onClick={() => void load()}
                    title={t('featheros.common.refresh')}
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
                {can(uuid, 'backup.create') && (
                    <button
                        type='button'
                        disabled={busy === 'create'}
                        onClick={() => void create()}
                        className='bg-primary text-primary-foreground flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium disabled:opacity-50'
                    >
                        {busy === 'create' ? (
                            <Loader2 className='h-3 w-3 animate-spin' />
                        ) : (
                            <Plus className='h-3 w-3' />
                        )}
                        {t('featheros.backups.create')}
                    </button>
                )}
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto p-2'>
                {backups.map((b) => {
                    const done = !!b.completed_at || !!b.is_successful;
                    const ok = !!b.is_successful;
                    const locked = !!b.is_locked;
                    const isBusy = busy === b.uuid;
                    return (
                        <div key={b.uuid} className='hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2'>
                            <Archive className='text-muted-foreground h-8 w-8 shrink-0' />
                            <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-1.5 text-[13px] font-medium'>
                                    <span className='truncate'>{b.name}</span>
                                    {locked && <Lock className='h-3 w-3 text-amber-500' />}
                                </div>
                                <div className='text-muted-foreground flex items-center gap-1.5 text-[11px]'>
                                    {!done ? (
                                        <>
                                            <Loader2 className='h-3 w-3 animate-spin' />{' '}
                                            {t('featheros.backups.in_progress')}
                                        </>
                                    ) : ok ? (
                                        <CheckCircle2 className='h-3 w-3 text-emerald-500' />
                                    ) : (
                                        <XCircle className='h-3 w-3 text-red-500' />
                                    )}
                                    <span>{new Date(b.created_at).toLocaleString()}</span>
                                    {done && <span>· {formatBytes(b.bytes)}</span>}
                                </div>
                            </div>
                            {isBusy && <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />}
                            <button
                                type='button'
                                className={btn}
                                title={t('featheros.common.download')}
                                disabled={isBusy || !ok || !can(uuid, 'backup.download')}
                                onClick={() => void download(b)}
                            >
                                <Download className='h-3.5 w-3.5' />
                            </button>
                            <button
                                type='button'
                                className={btn}
                                title={t('featheros.backups.restore')}
                                disabled={isBusy || !ok || locked || !can(uuid, 'backup.restore')}
                                onClick={() => void restore(b)}
                            >
                                <RotateCcw className='h-3.5 w-3.5' />
                            </button>
                            <button
                                type='button'
                                className={btn}
                                title={locked ? t('featheros.backups.unlock') : t('featheros.backups.lock')}
                                disabled={isBusy || !can(uuid, 'backup.delete')}
                                onClick={() =>
                                    void act(b.uuid, () =>
                                        axios.post(
                                            `/api/user/servers/${uuid}/backups/${b.uuid}/${locked ? 'unlock' : 'lock'}`,
                                        ),
                                    )
                                }
                            >
                                {locked ? <Unlock className='h-3.5 w-3.5' /> : <Lock className='h-3.5 w-3.5' />}
                            </button>
                            <button
                                type='button'
                                className={cn(btn, 'text-red-600')}
                                title={t('featheros.common.delete')}
                                disabled={isBusy || locked || !can(uuid, 'backup.delete')}
                                onClick={() => void remove(b)}
                            >
                                <Trash2 className='h-3.5 w-3.5' />
                            </button>
                        </div>
                    );
                })}
                {!loading && backups.length === 0 && (
                    <div className='text-muted-foreground py-12 text-center text-sm'>
                        {t('featheros.backups.empty')}
                    </div>
                )}
            </div>
        </div>
    );
}
