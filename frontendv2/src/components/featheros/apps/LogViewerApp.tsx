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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Download, RefreshCw, Search, WrapText, ArrowDownToLine, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import { OsSelect } from '../OsSelect';
import { stripAnsi } from '../utils';
import type { OsAppProps } from './index';

type Source = 'console' | 'install' | 'activity';
type Level = 'all' | 'warn' | 'error';

interface ActivityRow {
    id: number;
    event: string;
    message?: string;
    ip?: string | null;
    timestamp?: string;
    created_at?: string;
    user?: { username?: string } | null;
}

function lineLevel(line: string): 'error' | 'warn' | 'info' {
    const l = line.toLowerCase();
    if (/\b(error|severe|fatal|exception|failed)\b/.test(l)) return 'error';
    if (/\b(warn|warning)\b/.test(l)) return 'warn';
    return 'info';
}

function extractLines(payload: unknown): string[] {
    const data = (payload as { response?: { data?: unknown } | unknown })?.response;
    const inner = (data as { data?: unknown })?.data ?? data;
    if (Array.isArray(inner)) return inner.map((x) => stripAnsi(String(x)));
    if (typeof inner === 'string') return stripAnsi(inner).split(/\r?\n/);
    return [];
}

export default function LogViewerApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { getServer, errorMessage, updateWindowProps } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const server = getServer(uuid);
    const source: Source = (win.props?.source as Source) ?? 'console';
    const [lines, setLines] = useState<string[]>([]);
    const [activities, setActivities] = useState<ActivityRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [level, setLevel] = useState<Level>('all');
    const [wrap, setWrap] = useState(false);
    const [follow, setFollow] = useState(true);
    const [auto, setAuto] = useState(false);
    const scroller = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (source === 'activity') {
                const { data } = await axios.get(`/api/user/servers/${uuid}/activities`, {
                    params: { page: 1, per_page: 100 },
                });
                setActivities(data?.data?.activities?.data ?? data?.data?.activities ?? []);
            } else {
                const { data } = await axios.get(
                    `/api/user/servers/${uuid}/${source === 'install' ? 'install-logs' : 'logs'}`,
                );
                setLines(extractLines(data?.data));
            }
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [uuid, source, errorMessage]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!auto || source === 'activity') return;
        const id = window.setInterval(() => void load(), 5000);
        return () => window.clearInterval(id);
    }, [auto, load, source]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return lines
            .map((text, i) => ({ text, i, level: lineLevel(text) }))
            .filter((l) => (level === 'all' ? true : level === 'error' ? l.level === 'error' : l.level !== 'info'))
            .filter((l) => !q || l.text.toLowerCase().includes(q));
    }, [lines, query, level]);

    const filteredActivities = useMemo(() => {
        const q = query.trim().toLowerCase();
        return activities.filter(
            (a) => !q || `${a.event} ${a.message ?? ''} ${a.user?.username ?? ''}`.toLowerCase().includes(q),
        );
    }, [activities, query]);

    useEffect(() => {
        if (follow && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    }, [filtered, follow]);

    const download = () => {
        const text = source === 'activity' ? JSON.stringify(activities, null, 2) : lines.join('\n');
        const blob = new Blob([text], { type: source === 'activity' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${server?.name ?? uuid}-${source}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${source === 'activity' ? 'json' : 'log'}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const btn = 'flex h-6 items-center gap-1 rounded-md px-1.5 text-[12px] hover:bg-muted';
    const highlight = (text: string) => {
        const q = query.trim();
        if (!q) return text;
        const idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx < 0) return text;
        return (
            <>
                {text.slice(0, idx)}
                <mark className='rounded-sm bg-yellow-300/70 text-inherit'>{text.slice(idx, idx + q.length)}</mark>
                {text.slice(idx + q.length)}
            </>
        );
    };

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 shrink-0 items-center gap-2 border-b px-2'>
                <div className='bg-muted flex rounded-md p-0.5 text-[12px]'>
                    {(['console', 'install', 'activity'] as const).map((s) => (
                        <button
                            key={s}
                            type='button'
                            onClick={() => updateWindowProps(win.id, { source: s })}
                            className={cn('rounded px-2 py-0.5', source === s && 'bg-background shadow-sm')}
                        >
                            {t(`featheros.logs.source_${s}`)}
                        </button>
                    ))}
                </div>
                {source !== 'activity' && (
                    <OsSelect
                        size='toolbar'
                        ariaLabel={t('featheros.logs.level')}
                        value={level}
                        onChange={(v) => setLevel(v as Level)}
                        options={[
                            { value: 'all', label: t('featheros.logs.level_all') },
                            { value: 'warn', label: t('featheros.logs.level_warn') },
                            { value: 'error', label: t('featheros.logs.level_error') },
                        ]}
                    />
                )}
                <div className='relative ml-auto'>
                    <Search className='text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2' />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('featheros.logs.filter')}
                        className='fos-field bg-muted/70 h-6 w-44 rounded-md pr-2 pl-7 text-[12px] outline-none'
                    />
                </div>
                {source !== 'activity' && (
                    <>
                        <button
                            type='button'
                            className={cn(btn, wrap && 'bg-muted')}
                            onClick={() => setWrap((w) => !w)}
                            title={t('featheros.logs.wrap')}
                        >
                            <WrapText className='h-3.5 w-3.5' />
                        </button>
                        <button
                            type='button'
                            className={cn(btn, follow && 'bg-muted')}
                            onClick={() => setFollow((f) => !f)}
                            title={t('featheros.logs.follow')}
                        >
                            <ArrowDownToLine className='h-3.5 w-3.5' />
                        </button>
                        <label className='flex items-center gap-1 text-[12px]'>
                            <input type='checkbox' checked={auto} onChange={(e) => setAuto(e.target.checked)} />
                            {t('featheros.logs.auto_refresh')}
                        </label>
                    </>
                )}
                <button type='button' className={btn} onClick={() => void load()} title={t('featheros.common.refresh')}>
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
                <button type='button' className={btn} onClick={download} title={t('featheros.common.download')}>
                    <Download className='h-3.5 w-3.5' />
                </button>
            </div>
            {error ? (
                <div className='text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm'>
                    <AlertTriangle className='h-6 w-6 text-amber-500' />
                    {error}
                </div>
            ) : source === 'activity' ? (
                <div className='fos-scroll min-h-0 flex-1 overflow-auto'>
                    <table className='w-full text-[12px]'>
                        <thead className='bg-background/95 sticky top-0 backdrop-blur'>
                            <tr className='text-muted-foreground border-b text-left text-[11px]'>
                                <th className='px-3 py-1.5 font-medium'>{t('featheros.logs.time')}</th>
                                <th className='px-2 py-1.5 font-medium'>{t('featheros.logs.event')}</th>
                                <th className='px-2 py-1.5 font-medium'>{t('featheros.logs.user')}</th>
                                <th className='px-2 py-1.5 font-medium'>{t('featheros.logs.message')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredActivities.map((a) => (
                                <tr key={a.id} className='border-b border-black/5 align-top dark:border-white/5'>
                                    <td className='text-muted-foreground px-3 py-1 whitespace-nowrap tabular-nums'>
                                        {new Date(a.timestamp ?? a.created_at ?? '').toLocaleString()}
                                    </td>
                                    <td className='px-2 py-1 font-mono text-[11px]'>{a.event}</td>
                                    <td className='px-2 py-1'>{a.user?.username ?? '-'}</td>
                                    <td className='px-2 py-1'>{a.message ?? ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && filteredActivities.length === 0 && (
                        <div className='text-muted-foreground py-10 text-center text-sm'>
                            {t('featheros.logs.empty')}
                        </div>
                    )}
                </div>
            ) : (
                <div
                    ref={scroller}
                    className='fos-scroll min-h-0 flex-1 overflow-auto bg-[#fbfbfd] py-1 font-mono text-[12px] leading-[1.45] text-zinc-800 dark:bg-[#0d1117] dark:text-zinc-200'
                >
                    {loading && lines.length === 0 && (
                        <div className='flex h-full items-center justify-center'>
                            <Loader2 className='h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500' />
                        </div>
                    )}
                    {filtered.map((l) => (
                        <div
                            key={l.i}
                            className={cn(
                                'flex gap-3 px-3 hover:bg-black/[0.04] dark:hover:bg-white/5',
                                l.level === 'error' && 'bg-red-500/10 text-red-700 dark:text-red-300',
                                l.level === 'warn' && 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
                            )}
                        >
                            <span className='w-10 shrink-0 text-right text-zinc-400 select-none dark:text-zinc-600'>
                                {l.i + 1}
                            </span>
                            <span className={wrap ? 'break-all whitespace-pre-wrap' : 'whitespace-pre'}>
                                {highlight(l.text)}
                            </span>
                        </div>
                    ))}
                    {!loading && filtered.length === 0 && (
                        <div className='py-10 text-center text-zinc-400 dark:text-zinc-500'>
                            {t('featheros.logs.empty')}
                        </div>
                    )}
                </div>
            )}
            <div className='text-muted-foreground flex h-6 shrink-0 items-center border-t px-3 text-[11px]'>
                {source === 'activity'
                    ? t('featheros.logs.footer_activity', { count: String(filteredActivities.length) })
                    : t('featheros.logs.footer', { count: String(filtered.length), total: String(lines.length) })}
            </div>
        </div>
    );
}
