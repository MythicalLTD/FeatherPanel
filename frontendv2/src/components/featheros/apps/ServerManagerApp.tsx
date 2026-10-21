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

import { useMemo, useState } from 'react';
import {
    Play,
    Square,
    RotateCw,
    Skull,
    Search,
    RefreshCw,
    Folder,
    SquareTerminal,
    ExternalLink,
    ScrollText,
    Loader2,
    Archive,
    Database,
    Network,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { runBulkServerAction, BULK_MAX_SERVERS, type BulkServerAction } from '@/lib/server-bulk';
import { cn } from '@/lib/utils';
import type { Server } from '@/types/server';
import { useFeatherOs } from '../FeatherOsContext';
import { formatBytes, serverState, stateColor } from '../utils';
import type { OsAppProps } from './index';

type PowerAction = 'start' | 'stop' | 'restart' | 'kill';
const PERM: Record<PowerAction, string> = {
    start: 'control.start',
    stop: 'control.stop',
    restart: 'control.restart',
    kill: 'control.stop',
};

export default function ServerManagerApp({ win }: OsAppProps) {
    void win;
    const { t } = useTranslation();
    const {
        servers,
        live,
        can,
        refreshServers,
        serversLoading,
        openApp,
        openTerminalFor,
        openContextMenu,
        errorMessage,
    } = useFeatherOs();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'running' | 'offline'>('all');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pending, setPending] = useState<Set<string>>(new Set());

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return servers.filter((s) => {
            const state = serverState(s, live[s.uuidShort]?.status);
            if (filter === 'running' && state !== 'running') return false;
            if (filter === 'offline' && state !== 'offline') return false;
            return (
                !q ||
                s.name.toLowerCase().includes(q) ||
                s.uuidShort.includes(q) ||
                (s.node?.name ?? '').toLowerCase().includes(q)
            );
        });
    }, [servers, live, query, filter]);

    const power = async (server: Server, action: PowerAction) => {
        setPending((p) => new Set(p).add(server.uuidShort));
        try {
            await axios.post(`/api/user/servers/${server.uuidShort}/power/${action}`);
            toast.success(t(`featheros.servers.power_sent_${action}`), { description: server.name });
        } catch (error) {
            toast.error(errorMessage(error), { description: server.name });
        } finally {
            setPending((p) => {
                const n = new Set(p);
                n.delete(server.uuidShort);
                return n;
            });
        }
    };

    const bulk = async (action: BulkServerAction) => {
        const list = rows.filter((s) => selected.has(s.uuidShort));
        const allowed = list.filter((s) => can(s, PERM[action as PowerAction] ?? 'control.start'));
        if (allowed.length === 0) {
            toast.error(t('featheros.errors.no_permission'));
            return;
        }
        if (allowed.length > BULK_MAX_SERVERS) {
            toast.error(t('featheros.servers.bulk_limit', { max: String(BULK_MAX_SERVERS) }));
            return;
        }
        setPending(new Set(allowed.map((s) => s.uuidShort)));
        try {
            const res = await runBulkServerAction(
                action,
                allowed.map((s) => s.uuidShort),
            );
            if (res.failed === 0) toast.success(t('featheros.servers.bulk_done', { count: String(res.succeeded) }));
            else
                toast.error(
                    t('featheros.servers.bulk_partial', { ok: String(res.succeeded), failed: String(res.failed) }),
                    {
                        description: res.results
                            .filter((r) => !r.success)
                            .map((r) => `${r.name ?? r.uuidShort}: ${r.message ?? r.error_code}`)
                            .join('\n'),
                    },
                );
            const skipped = list.length - allowed.length;
            if (skipped > 0) toast.info(t('featheros.servers.bulk_skipped', { count: String(skipped) }));
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setPending(new Set());
        }
    };

    const rowMenu = (s: Server, e: React.MouseEvent) => {
        e.preventDefault();
        openContextMenu({ x: e.clientX, y: e.clientY }, [
            {
                id: 'files',
                label: t('featheros.apps.finder'),
                icon: Folder,
                disabled: !can(s, 'file.read'),
                onSelect: () => openApp('finder', { serverUuid: s.uuidShort }),
            },
            {
                id: 'term',
                label: t('featheros.apps.terminal'),
                icon: SquareTerminal,
                disabled: !can(s, 'websocket.connect'),
                onSelect: () => openTerminalFor(s.uuidShort),
            },
            {
                id: 'logs',
                label: t('featheros.apps.logs'),
                icon: ScrollText,
                disabled: !can(s, 'activity.read'),
                onSelect: () => openApp('logs', { serverUuid: s.uuidShort }),
            },
            {
                id: 'backups',
                label: t('featheros.apps.backups'),
                icon: Archive,
                disabled: !can(s, 'backup.read'),
                onSelect: () => openApp('backups', { serverUuid: s.uuidShort }),
            },
            {
                id: 'db',
                label: t('featheros.apps.databases'),
                icon: Database,
                disabled: !can(s, 'database.read'),
                onSelect: () => openApp('databases', { serverUuid: s.uuidShort }),
            },
            {
                id: 'net',
                label: t('featheros.apps.network'),
                icon: Network,
                disabled: !can(s, 'allocation.read'),
                onSelect: () => openApp('network', { serverUuid: s.uuidShort }),
            },
            { id: 's1', separator: true },
            {
                id: 'start',
                label: t('featheros.servers.start'),
                icon: Play,
                disabled: !can(s, 'control.start'),
                onSelect: () => void power(s, 'start'),
            },
            {
                id: 'restart',
                label: t('featheros.servers.restart'),
                icon: RotateCw,
                disabled: !can(s, 'control.restart'),
                onSelect: () => void power(s, 'restart'),
            },
            {
                id: 'stop',
                label: t('featheros.servers.stop'),
                icon: Square,
                disabled: !can(s, 'control.stop'),
                onSelect: () => void power(s, 'stop'),
            },
            {
                id: 'kill',
                label: t('featheros.servers.kill'),
                icon: Skull,
                danger: true,
                disabled: !can(s, 'control.stop'),
                onSelect: () => void power(s, 'kill'),
            },
            { id: 's2', separator: true },
            {
                id: 'panel',
                label: t('featheros.desktop.open_in_panel'),
                icon: ExternalLink,
                onSelect: () => window.open(`/server/${s.uuidShort}`, '_blank', 'noopener'),
            },
        ]);
    };

    const allChecked = rows.length > 0 && rows.every((s) => selected.has(s.uuidShort));
    const iconBtn =
        'flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted disabled:opacity-25 disabled:hover:bg-transparent';
    const bulkBtn =
        'flex h-7 items-center gap-1 rounded-md border px-2 text-[12px] font-medium hover:bg-muted disabled:opacity-40';

    return (
        <div className='fos-servers'>
            <div className='fos-servers-toolbar' data-fos-window-drag>
                <div className='fos-servers-filters' data-no-drag>
                    {(['all', 'running', 'offline'] as const).map((f) => (
                        <button
                            key={f}
                            type='button'
                            onClick={() => setFilter(f)}
                            className={cn(filter === f && 'is-active')}
                        >
                            {t(`featheros.servers.filter_${f}`)}
                        </button>
                    ))}
                </div>
                {selected.size > 0 && (
                    <div className='flex items-center gap-1' data-no-drag>
                        <span className='text-muted-foreground mr-1 text-[12px]'>
                            {t('featheros.servers.selected', { count: String(selected.size) })}
                        </span>
                        <button
                            type='button'
                            className={cn(bulkBtn, 'text-emerald-600 dark:text-emerald-400')}
                            onClick={() => void bulk('start')}
                        >
                            <Play className='h-3 w-3' /> {t('featheros.servers.start')}
                        </button>
                        <button type='button' className={bulkBtn} onClick={() => void bulk('restart')}>
                            <RotateCw className='h-3 w-3' /> {t('featheros.servers.restart')}
                        </button>
                        <button
                            type='button'
                            className={cn(bulkBtn, 'text-amber-600 dark:text-amber-400')}
                            onClick={() => void bulk('stop')}
                        >
                            <Square className='h-3 w-3' /> {t('featheros.servers.stop')}
                        </button>
                        <button
                            type='button'
                            className={cn(bulkBtn, 'text-red-600 dark:text-red-400')}
                            onClick={() => void bulk('kill')}
                        >
                            <Skull className='h-3 w-3' /> {t('featheros.servers.kill')}
                        </button>
                    </div>
                )}
                <div className='fos-servers-search' data-no-drag>
                    <Search />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('featheros.servers.search')}
                    />
                </div>
                <button
                    type='button'
                    className={iconBtn}
                    data-no-drag
                    onClick={() => void refreshServers()}
                    title={t('featheros.common.refresh')}
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', serversLoading && 'animate-spin')} />
                </button>
            </div>
            <div className='fos-servers-body fos-scroll'>
                <table className='w-full text-[12px]'>
                    <thead className='sticky top-0'>
                        <tr className='text-muted-foreground border-b text-left text-[11px]'>
                            <th className='w-8 px-3 py-1.5'>
                                <input
                                    type='checkbox'
                                    checked={allChecked}
                                    aria-label={t('featheros.common.select_all')}
                                    onChange={() =>
                                        setSelected(allChecked ? new Set() : new Set(rows.map((s) => s.uuidShort)))
                                    }
                                />
                            </th>
                            <th className='px-2 py-1.5 font-medium'>{t('featheros.servers.name')}</th>
                            <th className='px-2 py-1.5 font-medium'>{t('featheros.servers.status')}</th>
                            <th className='px-2 py-1.5 font-medium'>{t('featheros.monitor.cpu')}</th>
                            <th className='px-2 py-1.5 font-medium'>{t('featheros.monitor.memory')}</th>
                            <th className='px-2 py-1.5 font-medium'>{t('featheros.servers.node')}</th>
                            <th className='px-2 py-1.5 font-medium'>{t('featheros.servers.address')}</th>
                            <th className='w-32 px-2 py-1.5 text-right font-medium'>
                                {t('featheros.servers.actions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((s) => {
                            const ld = live[s.uuidShort];
                            const state = serverState(s, ld?.status);
                            const busy = pending.has(s.uuidShort);
                            const addr = s.subdomain_requirement?.enforced
                                ? t('serverSubdomains.requirementAddressPending')
                                : s.allocation
                                  ? `${s.allocation.ip_alias || s.allocation.ip}:${s.allocation.port}`
                                  : '—';
                            return (
                                <tr
                                    key={s.uuidShort}
                                    onDoubleClick={() =>
                                        can(s, 'file.read') && openApp('finder', { serverUuid: s.uuidShort })
                                    }
                                    onContextMenu={(e) => rowMenu(s, e)}
                                    className={cn(
                                        'hover:bg-muted/50 border-b border-black/5 dark:border-white/5',
                                        selected.has(s.uuidShort) && 'bg-primary/10',
                                    )}
                                >
                                    <td className='px-3 py-1.5'>
                                        <input
                                            type='checkbox'
                                            aria-label={s.name}
                                            checked={selected.has(s.uuidShort)}
                                            onChange={() =>
                                                setSelected((cur) => {
                                                    const n = new Set(cur);
                                                    if (n.has(s.uuidShort)) n.delete(s.uuidShort);
                                                    else n.add(s.uuidShort);
                                                    return n;
                                                })
                                            }
                                        />
                                    </td>
                                    <td className='px-2 py-1.5'>
                                        <div className='font-medium'>{s.name}</div>
                                        <div className='text-muted-foreground text-[10px]'>
                                            {s.spell?.name ?? ''} · {s.uuidShort}
                                            {s.is_subuser && ` · ${t('featheros.servers.shared')}`}
                                        </div>
                                    </td>
                                    <td className='px-2 py-1.5'>
                                        <span className='flex items-center gap-1.5'>
                                            {busy ? (
                                                <Loader2 className='h-3 w-3 animate-spin' />
                                            ) : (
                                                <span className={cn('h-2 w-2 rounded-full', stateColor(state))} />
                                            )}
                                            {t(`featheros.state.${state}`, { defaultValue: state })}
                                        </span>
                                    </td>
                                    <td className='px-2 py-1.5 tabular-nums'>
                                        {ld?.stats ? `${ld.stats.cpuUsage}%` : '—'}
                                    </td>
                                    <td className='px-2 py-1.5 tabular-nums'>
                                        {ld?.stats ? formatBytes(ld.stats.memoryUsage) : '—'}
                                        <span className='text-muted-foreground'>
                                            {' '}
                                            / {s.memory ? formatBytes(s.memory * 1024 * 1024, 0) : '∞'}
                                        </span>
                                    </td>
                                    <td className='text-muted-foreground px-2 py-1.5'>{s.node?.name ?? '—'}</td>
                                    <td className='text-muted-foreground px-2 py-1.5 font-mono text-[11px]'>{addr}</td>
                                    <td className='px-2 py-1.5'>
                                        <div className='flex justify-end gap-0.5'>
                                            <button
                                                type='button'
                                                className={cn(iconBtn, 'text-emerald-600')}
                                                title={t('featheros.servers.start')}
                                                disabled={busy || !can(s, 'control.start') || state === 'running'}
                                                onClick={() => void power(s, 'start')}
                                            >
                                                <Play className='h-3.5 w-3.5' />
                                            </button>
                                            <button
                                                type='button'
                                                className={iconBtn}
                                                title={t('featheros.servers.restart')}
                                                disabled={busy || !can(s, 'control.restart')}
                                                onClick={() => void power(s, 'restart')}
                                            >
                                                <RotateCw className='h-3.5 w-3.5' />
                                            </button>
                                            <button
                                                type='button'
                                                className={cn(iconBtn, 'text-amber-600')}
                                                title={t('featheros.servers.stop')}
                                                disabled={busy || !can(s, 'control.stop') || state === 'offline'}
                                                onClick={() => void power(s, 'stop')}
                                            >
                                                <Square className='h-3.5 w-3.5' />
                                            </button>
                                            <button
                                                type='button'
                                                className={cn(iconBtn, 'text-red-600')}
                                                title={t('featheros.servers.kill')}
                                                disabled={busy || !can(s, 'control.stop') || state === 'offline'}
                                                onClick={() => void power(s, 'kill')}
                                            >
                                                <Skull className='h-3.5 w-3.5' />
                                            </button>
                                            <button
                                                type='button'
                                                className={iconBtn}
                                                title={t('featheros.apps.terminal')}
                                                disabled={!can(s, 'websocket.connect')}
                                                onClick={() => openTerminalFor(s.uuidShort)}
                                            >
                                                <SquareTerminal className='h-3.5 w-3.5' />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {rows.length === 0 && !serversLoading && (
                    <div className='text-muted-foreground py-12 text-center text-sm'>{t('featheros.picker.empty')}</div>
                )}
            </div>
            <div className='text-muted-foreground flex h-6 shrink-0 items-center border-t px-3 text-[11px]'>
                {t('featheros.servers.footer', { count: String(rows.length), total: String(servers.length) })}
            </div>
        </div>
    );
}
