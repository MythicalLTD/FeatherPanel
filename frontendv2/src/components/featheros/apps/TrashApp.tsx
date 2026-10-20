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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, RotateCcw, RefreshCw, Loader2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    destroyFeatherOsTrash,
    emptyFeatherOsTrash,
    listFeatherOsTrash,
    restoreFeatherOsTrash,
    toTrashRows,
} from '@/lib/featheros-trash';
import type { FeatherOsTrashEntry } from '@/lib/featheros-api';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import { OsSelect } from '../OsSelect';
import { formatBytes } from '../utils';
import type { OsAppProps } from './index';

type TrashRow = FeatherOsTrashEntry & { serverUuid: string; serverName: string };

/**
 * FeatherOS Trash uses a DB-tracked staging area (`.featheros-trash/`) so Restore
 * works even when Wings/panel soft-delete trash is disabled.
 */
export default function TrashApp({ win }: OsAppProps) {
    void win;
    const { t } = useTranslation();
    const { servers, can, errorMessage, confirm, openApp } = useFeatherOs();
    const [rows, setRows] = useState<TrashRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [filterServer, setFilterServer] = useState<string>('all');

    const eligible = useMemo(() => servers.filter((s) => can(s, 'file.read')), [servers, can]);

    const keyOf = (r: TrashRow) => `${r.serverUuid}:${r.id}`;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const entries = await listFeatherOsTrash();
            const mapped = toTrashRows(entries, eligible).map((r) => ({
                id: r.id,
                server_uuid: r.serverUuid,
                original_root: r.original_root,
                original_name: r.original_name,
                is_directory: r.is_directory,
                size: r.size,
                deleted_at: r.deleted_at,
                trash_path: r.trash_path || '',
                serverUuid: r.serverUuid,
                serverName: r.serverName,
            }));
            setRows(mapped.sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || '')));
            setSelected(new Set());
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [eligible, errorMessage]);

    useEffect(() => {
        void load();
    }, [load]);

    const visible = filterServer === 'all' ? rows : rows.filter((r) => r.serverUuid === filterServer);
    const selectedRows = visible.filter((r) => selected.has(keyOf(r)));

    const restore = async (list: TrashRow[]) => {
        if (list.length === 0) return;
        const allowed = list.filter((r) => can(r.serverUuid, 'file.create') && can(r.serverUuid, 'file.delete'));
        if (allowed.length === 0) {
            toast.error(t('featheros.errors.no_permission'));
            return;
        }
        setBusy(true);
        try {
            await restoreFeatherOsTrash(allowed);
            toast.success(t('featheros.trash.restored', { count: String(allowed.length) }));
            await load();
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const destroy = async (list: TrashRow[]) => {
        if (list.length === 0) return;
        const ok = await confirm({
            title: t('featheros.trash.delete_forever_title', { count: String(list.length) }),
            message: t('featheros.trash.delete_forever_message'),
            confirmLabel: t('featheros.trash.delete_forever'),
            danger: true,
        });
        if (!ok) return;
        const allowed = list.filter((r) => can(r.serverUuid, 'file.delete'));
        setBusy(true);
        try {
            await destroyFeatherOsTrash(allowed);
            toast.success(t('featheros.trash.deleted', { count: String(allowed.length) }));
            await load();
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const emptyAll = async () => {
        const targets = filterServer === 'all' ? rows : rows.filter((r) => r.serverUuid === filterServer);
        if (targets.length === 0) return;
        const ok = await confirm({
            title: t('featheros.trash.empty_title'),
            message: t('featheros.trash.empty_message', { count: String(targets.length) }),
            confirmLabel: t('featheros.trash.empty'),
            danger: true,
        });
        if (!ok) return;
        setBusy(true);
        try {
            await emptyFeatherOsTrash(filterServer === 'all' ? undefined : [filterServer]);
            toast.success(t('featheros.trash.emptied'));
            await load();
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className='flex h-full flex-col'>
            <div className='fos-app-toolbar'>
                <Trash2 className='h-4 w-4 opacity-55' />
                <OsSelect
                    size='toolbar'
                    ariaLabel={t('featheros.trash.filter_server')}
                    value={filterServer}
                    onChange={setFilterServer}
                    options={[
                        { value: 'all', label: t('featheros.trash.all_servers') },
                        ...eligible.map((s) => ({ value: s.uuidShort, label: s.name })),
                    ]}
                />
                <span className='flex-1 text-[12px] opacity-55'>
                    {t('featheros.trash.count', { count: String(visible.length) })}
                </span>
                <button
                    type='button'
                    className='fos-app-btn'
                    onClick={() => void load()}
                    title={t('featheros.common.refresh')}
                    aria-label={t('featheros.common.refresh')}
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
                <button
                    type='button'
                    disabled={busy || selectedRows.length === 0}
                    onClick={() => void restore(selectedRows)}
                    className='fos-app-btn'
                >
                    <RotateCcw className='h-3 w-3' /> {t('featheros.trash.restore')}
                </button>
                <button
                    type='button'
                    disabled={busy || selectedRows.length === 0}
                    onClick={() => void destroy(selectedRows)}
                    className='fos-app-btn fos-app-btn-danger'
                >
                    {t('featheros.trash.delete_forever')}
                </button>
                <button
                    type='button'
                    disabled={busy || rows.length === 0}
                    onClick={() => void emptyAll()}
                    className='fos-app-btn fos-app-btn-primary'
                >
                    {busy ? <Loader2 className='h-3 w-3 animate-spin' /> : null}
                    {t('featheros.trash.empty')}
                </button>
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto'>
                {loading && (
                    <div className='fos-empty-state'>
                        <Loader2 className='h-6 w-6 animate-spin opacity-50' />
                        <p>{t('common.loading')}</p>
                    </div>
                )}
                {!loading && visible.length > 0 && (
                    <table className='w-full text-[12px]'>
                        <thead className='sticky top-0 z-[1] bg-[color-mix(in_oklab,var(--fos-surface)_80%,transparent)] backdrop-blur'>
                            <tr className='border-b border-black/8 text-left text-[11px] opacity-60 dark:border-white/8'>
                                <th className='w-8 px-3 py-2'>
                                    <input
                                        type='checkbox'
                                        aria-label={t('featheros.common.select_all')}
                                        checked={visible.length > 0 && visible.every((r) => selected.has(keyOf(r)))}
                                        onChange={() =>
                                            setSelected(
                                                visible.every((r) => selected.has(keyOf(r)))
                                                    ? new Set()
                                                    : new Set(visible.map(keyOf)),
                                            )
                                        }
                                    />
                                </th>
                                <th className='px-2 py-2 font-medium'>{t('featheros.files.name')}</th>
                                <th className='px-2 py-2 font-medium'>{t('featheros.servers.name')}</th>
                                <th className='px-2 py-2 font-medium'>{t('featheros.trash.original_path')}</th>
                                <th className='px-2 py-2 text-right font-medium'>{t('featheros.files.size')}</th>
                                <th className='px-2 py-2 font-medium'>{t('featheros.trash.deleted_at')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((r) => {
                                const k = keyOf(r);
                                return (
                                    <tr
                                        key={k}
                                        className={cn(
                                            'border-b border-black/5 dark:border-white/5',
                                            selected.has(k) && 'bg-[#0a84ff]/15',
                                        )}
                                    >
                                        <td className='px-3 py-2'>
                                            <input
                                                type='checkbox'
                                                checked={selected.has(k)}
                                                aria-label={r.original_name}
                                                onChange={() =>
                                                    setSelected((cur) => {
                                                        const n = new Set(cur);
                                                        if (n.has(k)) n.delete(k);
                                                        else n.add(k);
                                                        return n;
                                                    })
                                                }
                                            />
                                        </td>
                                        <td className='px-2 py-2 font-medium'>{r.original_name}</td>
                                        <td className='px-2 py-2 opacity-60'>{r.serverName}</td>
                                        <td className='max-w-[240px] truncate px-2 py-2 font-mono text-[11px] opacity-55'>
                                            {r.original_root}/{r.original_name}
                                        </td>
                                        <td className='px-2 py-2 text-right tabular-nums'>
                                            {r.is_directory ? '-' : formatBytes(r.size)}
                                        </td>
                                        <td className='px-2 py-2 tabular-nums opacity-55'>
                                            {r.deleted_at ? new Date(r.deleted_at).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {!loading && visible.length === 0 && (
                    <div className='fos-empty-state'>
                        <Trash2 className='mb-1 h-14 w-14 opacity-30' strokeWidth={1.25} />
                        <strong>{t('featheros.trash.empty_list')}</strong>
                        <p>{t('featheros.trash.hint_restore')}</p>
                        <button type='button' onClick={() => openApp('finder', { newWindow: true })}>
                            <span className='inline-flex items-center gap-1.5'>
                                <FolderOpen className='h-3.5 w-3.5' /> {t('featheros.apps.finder')}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
