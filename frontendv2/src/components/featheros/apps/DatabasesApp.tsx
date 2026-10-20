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
import { Database as DbIcon, Plus, Trash2, Play, Copy, Eye, EyeOff, Loader2, Table2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { Database, DatabaseHost } from '@/types/server';
import { useFeatherOs } from '../FeatherOsContext';
import { OsSelect } from '../OsSelect';
import type { OsAppProps } from './index';

interface QueryResult {
    type: 'select' | 'dml';
    columns?: string[];
    rows?: unknown[][];
    row_count?: number;
    affected_rows?: number;
    truncated?: boolean;
    execution_time_ms?: number;
}

export default function DatabasesApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, errorMessage, confirm } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const [databases, setDatabases] = useState<Database[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detail, setDetail] = useState<Database | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [creating, setCreating] = useState(false);
    const [hosts, setHosts] = useState<DatabaseHost[]>([]);
    const [form, setForm] = useState({ host: '', name: '', remote: '%' });
    const [busy, setBusy] = useState(false);
    const [sql, setSql] = useState('SHOW TABLES;');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [queryError, setQueryError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [tables, setTables] = useState<string[]>([]);

    const canCreate = can(uuid, 'database.create');
    const canDelete = can(uuid, 'database.delete');
    const canQuery = can(uuid, 'database.view_password');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/servers/${uuid}/databases`, {
                params: { page: 1, per_page: 100 },
            });
            const list: Database[] = data?.data?.data ?? [];
            setDatabases(list);
            setSelectedId((cur) => (cur && list.some((d) => d.id === cur) ? cur : (list[0]?.id ?? null)));
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [uuid, errorMessage]);

    useEffect(() => {
        void load();
    }, [load]);

    const runQuery = useCallback(
        async (query: string, quiet = false) => {
            if (!selectedId || !query.trim()) return null;
            if (!quiet) {
                setRunning(true);
                setQueryError(null);
            }
            try {
                const { data } = await axios.post(`/api/user/servers/${uuid}/databases/${selectedId}/query`, { query });
                if (!quiet) setResult(data.data);
                return data.data as QueryResult;
            } catch (e) {
                if (!quiet) {
                    setResult(null);
                    setQueryError(errorMessage(e));
                }
                return null;
            } finally {
                if (!quiet) setRunning(false);
            }
        },
        [uuid, selectedId, errorMessage],
    );

    useEffect(() => {
        setDetail(null);
        setShowPassword(false);
        setResult(null);
        setQueryError(null);
        setTables([]);
        if (!selectedId) return;
        axios
            .get(`/api/user/servers/${uuid}/databases/${selectedId}`)
            .then(({ data }) => setDetail(data?.data ?? null))
            .catch(() => setDetail(null));
        if (canQuery) {
            void runQuery('SHOW TABLES;', true).then((r) => setTables((r?.rows ?? []).map((row) => String(row[0]))));
        }
    }, [uuid, selectedId, canQuery, runQuery]);

    const openCreate = async () => {
        setCreating(true);
        try {
            const { data } = await axios.get(`/api/user/servers/${uuid}/databases/hosts`);
            const list: DatabaseHost[] = data?.data ?? [];
            setHosts(list);
            setForm((f) => ({ ...f, host: f.host || String(list[0]?.id ?? '') }));
        } catch (e) {
            toast.error(errorMessage(e));
        }
    };

    const create = async () => {
        if (!form.host || !form.name.trim()) return;
        setBusy(true);
        try {
            await axios.post(`/api/user/servers/${uuid}/databases`, {
                database_host_id: Number(form.host),
                database_name: form.name.trim(),
                remote: form.remote.trim() || '%',
            });
            toast.success(t('featheros.databases.created'));
            setCreating(false);
            setForm({ host: form.host, name: '', remote: '%' });
            await load();
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (db: Database) => {
        const ok = await confirm({
            title: t('featheros.databases.delete_title', { name: db.database }),
            message: t('featheros.databases.delete_message'),
            confirmLabel: t('featheros.common.delete'),
            danger: true,
        });
        if (!ok) return;
        try {
            await axios.delete(`/api/user/servers/${uuid}/databases/${db.id}`);
            toast.success(t('featheros.databases.deleted'));
            await load();
        } catch (e) {
            toast.error(errorMessage(e));
        }
    };

    const copy = (text: string) => {
        void navigator.clipboard?.writeText(text).then(() => toast.success(t('featheros.common.copied')));
    };

    const selected = databases.find((d) => d.id === selectedId) ?? null;
    const info = detail ?? selected;
    const field = (label: string, value: string | number | undefined | null, secret = false) => (
        <div className='flex items-center gap-2 py-0.5 text-[12px]'>
            <span className='text-muted-foreground w-24 shrink-0'>{label}</span>
            <span className='min-w-0 flex-1 truncate font-mono text-[11px]'>
                {secret && !showPassword ? '••••••••••' : (value ?? '—')}
            </span>
            {secret && value && (
                <button
                    type='button'
                    className='hover:bg-muted rounded p-0.5'
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={t('featheros.databases.toggle_password')}
                >
                    {showPassword ? <EyeOff className='h-3 w-3' /> : <Eye className='h-3 w-3' />}
                </button>
            )}
            {value !== undefined && value !== null && value !== '' && (
                <button
                    type='button'
                    className='hover:bg-muted rounded p-0.5'
                    onClick={() => copy(String(value))}
                    aria-label={t('featheros.common.copy')}
                >
                    <Copy className='h-3 w-3' />
                </button>
            )}
        </div>
    );

    return (
        <div className='flex h-full'>
            <aside className='bg-muted/40 flex w-52 shrink-0 flex-col border-r'>
                <div className='flex h-9 items-center gap-1 border-b px-2'>
                    <span className='text-muted-foreground flex-1 text-[11px] font-semibold uppercase'>
                        {t('featheros.apps.databases')}
                    </span>
                    <button
                        type='button'
                        className='hover:bg-muted rounded p-1'
                        onClick={() => void load()}
                        title={t('featheros.common.refresh')}
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    </button>
                    {canCreate && (
                        <button
                            type='button'
                            className='hover:bg-muted rounded p-1'
                            onClick={() => void openCreate()}
                            title={t('featheros.databases.create')}
                        >
                            <Plus className='h-3.5 w-3.5' />
                        </button>
                    )}
                </div>
                <div className='fos-scroll min-h-0 flex-1 overflow-auto p-1'>
                    {databases.map((db) => (
                        <div key={db.id}>
                            <button
                                type='button'
                                onClick={() => setSelectedId(db.id)}
                                className={cn(
                                    'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px]',
                                    selectedId === db.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                                )}
                            >
                                <DbIcon className='h-3.5 w-3.5 shrink-0' />
                                <span className='truncate'>{db.database}</span>
                            </button>
                            {selectedId === db.id &&
                                tables.map((tb) => (
                                    <button
                                        key={tb}
                                        type='button'
                                        onClick={() => {
                                            const q = `SELECT * FROM \`${tb.replace(/`/g, '``')}\` LIMIT 100;`;
                                            setSql(q);
                                            void runQuery(q);
                                        }}
                                        className='hover:bg-muted flex w-full items-center gap-1.5 rounded-md py-0.5 pr-2 pl-6 text-left text-[11px]'
                                    >
                                        <Table2 className='text-muted-foreground h-3 w-3 shrink-0' />
                                        <span className='truncate'>{tb}</span>
                                    </button>
                                ))}
                        </div>
                    ))}
                    {!loading && databases.length === 0 && (
                        <p className='text-muted-foreground p-3 text-center text-[12px]'>
                            {t('featheros.databases.empty')}
                        </p>
                    )}
                </div>
            </aside>
            <div className='flex min-w-0 flex-1 flex-col'>
                {creating ? (
                    <div className='mx-auto w-full max-w-sm space-y-3 p-6'>
                        <div className='flex items-center'>
                            <h3 className='flex-1 text-sm font-semibold'>{t('featheros.databases.create')}</h3>
                            <button
                                type='button'
                                onClick={() => setCreating(false)}
                                className='hover:bg-muted rounded p-1'
                                aria-label={t('common.close')}
                            >
                                <X className='h-4 w-4' />
                            </button>
                        </div>
                        <label className='block text-[12px]'>
                            {t('featheros.databases.host')}
                            <OsSelect
                                className='mt-1 w-full'
                                ariaLabel={t('featheros.databases.host')}
                                value={form.host}
                                onChange={(v) => setForm({ ...form, host: v })}
                                options={hosts.map((h) => ({
                                    value: String(h.id),
                                    label: `${h.name} (${h.database_type})`,
                                }))}
                            />
                        </label>
                        <label className='block text-[12px]'>
                            {t('featheros.databases.name')}
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className='fos-field bg-muted mt-1 h-8 w-full rounded-md px-2 outline-none'
                            />
                        </label>
                        <label className='block text-[12px]'>
                            {t('featheros.databases.remote')}
                            <input
                                value={form.remote}
                                onChange={(e) => setForm({ ...form, remote: e.target.value })}
                                className='fos-field bg-muted mt-1 h-8 w-full rounded-md px-2 font-mono outline-none'
                            />
                        </label>
                        <button
                            type='button'
                            disabled={busy || !form.host || !form.name.trim()}
                            onClick={() => void create()}
                            className='bg-primary text-primary-foreground flex h-8 w-full items-center justify-center gap-1 rounded-md text-[12px] font-medium disabled:opacity-50'
                        >
                            {busy && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
                            {t('featheros.databases.create')}
                        </button>
                        {hosts.length === 0 && (
                            <p className='text-muted-foreground text-[11px]'>{t('featheros.databases.no_hosts')}</p>
                        )}
                    </div>
                ) : !info ? (
                    <div className='text-muted-foreground flex flex-1 items-center justify-center text-sm'>
                        {loading ? <Loader2 className='h-5 w-5 animate-spin' /> : t('featheros.databases.select')}
                    </div>
                ) : (
                    <>
                        <div className='border-b p-3'>
                            <div className='mb-1 flex items-center gap-2'>
                                <h3 className='flex-1 truncate text-sm font-semibold'>{info.database}</h3>
                                {canDelete && (
                                    <button
                                        type='button'
                                        onClick={() => void remove(info)}
                                        className='flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] text-red-600 hover:bg-red-500/10'
                                    >
                                        <Trash2 className='h-3.5 w-3.5' /> {t('featheros.common.delete')}
                                    </button>
                                )}
                            </div>
                            {field(
                                t('featheros.databases.endpoint'),
                                `${info.database_subdomain || info.database_host || ''}${info.database_port ? `:${info.database_port}` : ''}`,
                            )}
                            {field(t('featheros.databases.username'), info.username)}
                            {field(t('featheros.databases.password'), detail?.password, true)}
                            {field(t('featheros.databases.remote'), info.remote)}
                        </div>
                        {canQuery ? (
                            <div className='flex min-h-0 flex-1 flex-col'>
                                <div className='relative border-b'>
                                    <textarea
                                        value={sql}
                                        onChange={(e) => setSql(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                e.preventDefault();
                                                void runQuery(sql);
                                            }
                                        }}
                                        spellCheck={false}
                                        className='h-24 w-full resize-none bg-transparent p-3 pr-24 font-mono text-[12px] outline-none'
                                    />
                                    <button
                                        type='button'
                                        disabled={running}
                                        onClick={() => void runQuery(sql)}
                                        className='bg-primary text-primary-foreground absolute right-2 bottom-2 flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium disabled:opacity-50'
                                    >
                                        {running ? (
                                            <Loader2 className='h-3 w-3 animate-spin' />
                                        ) : (
                                            <Play className='h-3 w-3' />
                                        )}
                                        {t('featheros.databases.run')}
                                    </button>
                                </div>
                                <div className='fos-scroll min-h-0 flex-1 overflow-auto'>
                                    {queryError && (
                                        <div className='m-3 rounded-md bg-red-500/10 p-2 font-mono text-[12px] text-red-600 dark:text-red-400'>
                                            {queryError}
                                        </div>
                                    )}
                                    {result?.type === 'dml' && (
                                        <div className='text-muted-foreground p-3 text-[12px]'>
                                            {t('featheros.databases.affected', {
                                                count: String(result.affected_rows ?? 0),
                                            })}
                                        </div>
                                    )}
                                    {result?.type === 'select' && result.columns && (
                                        <table className='w-full text-[11px]'>
                                            <thead className='bg-background/95 sticky top-0 backdrop-blur'>
                                                <tr className='border-b text-left'>
                                                    {result.columns.map((c, i) => (
                                                        <th
                                                            key={i}
                                                            className='px-2 py-1 font-semibold whitespace-nowrap'
                                                        >
                                                            {c}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(result.rows ?? []).map((row, ri) => (
                                                    <tr
                                                        key={ri}
                                                        className='hover:bg-muted/50 border-b border-black/5 dark:border-white/5'
                                                    >
                                                        {row.map((cell, ci) => (
                                                            <td
                                                                key={ci}
                                                                className='max-w-[240px] truncate px-2 py-0.5 font-mono whitespace-nowrap'
                                                            >
                                                                {cell === null ? (
                                                                    <span className='text-muted-foreground italic'>
                                                                        NULL
                                                                    </span>
                                                                ) : (
                                                                    String(cell)
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                {result && (
                                    <div className='text-muted-foreground flex h-6 shrink-0 items-center gap-3 border-t px-3 text-[11px]'>
                                        {result.type === 'select' && (
                                            <span>
                                                {t('featheros.databases.rows', {
                                                    count: String(result.row_count ?? 0),
                                                })}
                                            </span>
                                        )}
                                        {result.truncated && (
                                            <span className='text-amber-600'>{t('featheros.databases.truncated')}</span>
                                        )}
                                        <span className='ml-auto tabular-nums'>{result.execution_time_ms ?? 0} ms</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className='text-muted-foreground p-6 text-center text-[12px]'>
                                {t('featheros.databases.no_query_permission')}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
