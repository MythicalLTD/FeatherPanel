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

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Cpu, MemoryStick, HardDrive, Network } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import { formatBytes, formatUptime, serverState, stateColor } from '../utils';
import type { OsAppProps } from './index';

interface Sample {
    t: number;
    cpu: number;
    mem: number;
    rxRate: number;
    txRate: number;
    rx: number;
    tx: number;
}

type Tab = 'cpu' | 'memory' | 'disk' | 'network';
type SortKey = 'name' | 'cpu' | 'memory' | 'disk' | 'rx' | 'tx';
const HISTORY = 60;

function Sparkline({
    values,
    max,
    className,
    fill,
}: {
    values: number[];
    max?: number;
    className?: string;
    fill: string;
}) {
    const w = 300;
    const h = 64;
    const top = Math.max(max ?? 0, ...values, 1);
    const pts = values.map((v, i) => {
        const x = values.length <= 1 ? w : (i / (HISTORY - 1)) * w + (HISTORY - values.length) * (w / (HISTORY - 1));
        return `${x.toFixed(1)},${(h - (v / top) * (h - 4) - 2).toFixed(1)}`;
    });
    const first = pts[0]?.split(',')[0] ?? '0';
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio='none' className={cn('h-16 w-full', className)}>
            {pts.length > 1 && (
                <>
                    <polygon points={`${first},${h} ${pts.join(' ')} ${w},${h}`} className={fill} opacity={0.25} />
                    <polyline
                        points={pts.join(' ')}
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={1.5}
                        vectorEffect='non-scaling-stroke'
                    />
                </>
            )}
        </svg>
    );
}

export default function ActivityMonitorApp({ win }: OsAppProps) {
    void win;
    const { t } = useTranslation();
    const { servers, live, openApp, openTerminalFor, can } = useFeatherOs();
    const [tab, setTab] = useState<Tab>('cpu');
    const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'cpu', dir: -1 });
    const [selected, setSelected] = useState<string | null>(null);
    const history = useRef<Record<string, Sample[]>>({});
    const [, setTick] = useState(0);

    // Build history from the live stats feed (the counters from Wings are cumulative, rates are derived).
    useEffect(() => {
        let changed = false;
        for (const [uuid, data] of Object.entries(live)) {
            if (!data.stats || !data.lastUpdate) continue;
            const list = history.current[uuid] ?? [];
            const last = list[list.length - 1];
            if (last && last.t === data.lastUpdate) continue;
            const dt = last ? Math.max(0.5, (data.lastUpdate - last.t) / 1000) : 0;
            const sample: Sample = {
                t: data.lastUpdate,
                cpu: data.stats.cpuUsage,
                mem: data.stats.memoryUsage,
                rx: data.stats.networkRx,
                tx: data.stats.networkTx,
                rxRate: last && dt ? Math.max(0, (data.stats.networkRx - last.rx) / dt) : 0,
                txRate: last && dt ? Math.max(0, (data.stats.networkTx - last.tx) / dt) : 0,
            };
            history.current[uuid] = [...list, sample].slice(-HISTORY);
            changed = true;
        }
        if (changed) setTick((n) => n + 1);
    }, [live]);

    const rows = useMemo(() => {
        const list = servers.map((s) => {
            const ld = live[s.uuidShort];
            const h = history.current[s.uuidShort] ?? [];
            const last = h[h.length - 1];
            return {
                server: s,
                state: serverState(s, ld?.status),
                cpu: ld?.stats?.cpuUsage ?? 0,
                memory: ld?.stats?.memoryUsage ?? 0,
                disk: ld?.stats?.diskUsage ?? 0,
                rx: last?.rxRate ?? 0,
                tx: last?.txRate ?? 0,
                uptime: ld?.stats?.uptime ?? 0,
                hasStats: !!ld?.stats,
            };
        });
        return list.sort((a, b) => {
            if (sort.key === 'name') return a.server.name.localeCompare(b.server.name) * sort.dir;
            return ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir;
        });
    }, [servers, live, sort]);

    const totals = useMemo(
        () =>
            rows.reduce(
                (acc, r) => ({
                    cpu: acc.cpu + r.cpu,
                    memory: acc.memory + r.memory,
                    disk: acc.disk + r.disk,
                    rx: acc.rx + r.rx,
                    tx: acc.tx + r.tx,
                    running: acc.running + (r.state === 'running' ? 1 : 0),
                }),
                { cpu: 0, memory: 0, disk: 0, rx: 0, tx: 0, running: 0 },
            ),
        [rows],
    );

    const focus = selected ? rows.find((r) => r.server.uuidShort === selected) : undefined;
    const focusHistory = focus ? (history.current[focus.server.uuidShort] ?? []) : [];

    // Aggregate history across servers for the summary graph when nothing is selected.
    const aggregate = useMemo(() => {
        const series = Object.values(history.current);
        const len = Math.max(0, ...series.map((s) => s.length));
        const out: { cpu: number; mem: number; rx: number; tx: number }[] = [];
        for (let i = 0; i < len; i++) {
            let cpu = 0,
                mem = 0,
                rx = 0,
                tx = 0;
            for (const s of series) {
                const sample = s[s.length - len + i];
                if (!sample) continue;
                cpu += sample.cpu;
                mem += sample.mem;
                rx += sample.rxRate;
                tx += sample.txRate;
            }
            out.push({ cpu, mem, rx, tx });
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [live]);

    const graph = focus
        ? {
              cpu: focusHistory.map((s) => s.cpu),
              mem: focusHistory.map((s) => s.mem),
              rx: focusHistory.map((s) => s.rxRate),
              tx: focusHistory.map((s) => s.txRate),
          }
        : {
              cpu: aggregate.map((s) => s.cpu),
              mem: aggregate.map((s) => s.mem),
              rx: aggregate.map((s) => s.rx),
              tx: aggregate.map((s) => s.tx),
          };

    const header = (key: SortKey, label: string, right = true) => (
        <th
            onClick={() =>
                setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : key === 'name' ? 1 : -1 }))
            }
            className={cn(
                'hover:text-foreground cursor-default px-2 py-1.5 font-medium select-none',
                right && 'text-right',
            )}
        >
            {label}
            {sort.key === key && (sort.dir === 1 ? ' ▲' : ' ▼')}
        </th>
    );

    const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'cpu', label: t('featheros.monitor.cpu'), icon: Cpu },
        { id: 'memory', label: t('featheros.monitor.memory'), icon: MemoryStick },
        { id: 'disk', label: t('featheros.monitor.disk'), icon: HardDrive },
        { id: 'network', label: t('featheros.monitor.network'), icon: Network },
    ];

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 shrink-0 items-center justify-center border-b'>
                <div className='bg-muted flex rounded-md p-0.5 text-[12px]'>
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => setTab(id)}
                            className={cn(
                                'flex items-center gap-1 rounded px-3 py-0.5',
                                tab === id && 'bg-background shadow-sm',
                            )}
                        >
                            <Icon className='h-3 w-3' /> {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto'>
                <table className='w-full text-[12px]'>
                    <thead className='bg-background/95 sticky top-0 z-10 backdrop-blur'>
                        <tr className='text-muted-foreground border-b text-left text-[11px]'>
                            {header('name', t('featheros.servers.name'), false)}
                            {tab === 'cpu' && header('cpu', t('featheros.monitor.cpu_percent'))}
                            {tab === 'memory' && header('memory', t('featheros.monitor.memory'))}
                            {tab === 'disk' && header('disk', t('featheros.monitor.disk_used'))}
                            {tab === 'network' && header('rx', t('featheros.monitor.received'))}
                            {tab === 'network' && header('tx', t('featheros.monitor.sent'))}
                            <th className='px-2 py-1.5 text-right font-medium'>{t('featheros.monitor.uptime')}</th>
                            <th className='px-2 py-1.5 font-medium'>{t('featheros.servers.status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr
                                key={r.server.uuidShort}
                                onClick={() =>
                                    setSelected((cur) => (cur === r.server.uuidShort ? null : r.server.uuidShort))
                                }
                                onDoubleClick={() =>
                                    can(r.server, 'websocket.connect')
                                        ? openTerminalFor(r.server.uuidShort)
                                        : openApp('servers')
                                }
                                className={cn(
                                    'border-b border-black/5 dark:border-white/5',
                                    selected === r.server.uuidShort
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted/50',
                                )}
                            >
                                <td className='px-2 py-1 font-medium'>{r.server.name}</td>
                                {tab === 'cpu' && (
                                    <td className='px-2 py-1 text-right tabular-nums'>
                                        {r.hasStats ? `${r.cpu.toFixed(0)}%` : '—'}
                                    </td>
                                )}
                                {tab === 'memory' && (
                                    <td className='px-2 py-1 text-right tabular-nums'>
                                        {r.hasStats ? formatBytes(r.memory) : '—'}
                                    </td>
                                )}
                                {tab === 'disk' && (
                                    <td className='px-2 py-1 text-right tabular-nums'>
                                        {r.hasStats ? formatBytes(r.disk) : '—'}
                                    </td>
                                )}
                                {tab === 'network' && (
                                    <td className='px-2 py-1 text-right tabular-nums'>
                                        {r.hasStats ? `${formatBytes(r.rx)}/s` : '—'}
                                    </td>
                                )}
                                {tab === 'network' && (
                                    <td className='px-2 py-1 text-right tabular-nums'>
                                        {r.hasStats ? `${formatBytes(r.tx)}/s` : '—'}
                                    </td>
                                )}
                                <td className='px-2 py-1 text-right tabular-nums'>
                                    {r.hasStats && r.uptime ? formatUptime(r.uptime) : '—'}
                                </td>
                                <td className='px-2 py-1'>
                                    <span className='flex items-center gap-1.5'>
                                        <span className={cn('h-2 w-2 rounded-full', stateColor(r.state))} />
                                        {t(`featheros.state.${r.state}`, { defaultValue: r.state })}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className='bg-muted/40 grid shrink-0 grid-cols-[1fr_auto] gap-4 border-t p-3'>
                <div
                    className={cn(
                        'min-w-0',
                        tab === 'cpu'
                            ? 'text-sky-500'
                            : tab === 'memory'
                              ? 'text-violet-500'
                              : tab === 'disk'
                                ? 'text-amber-500'
                                : 'text-emerald-500',
                    )}
                >
                    <div className='text-muted-foreground mb-1 text-[11px] font-medium'>
                        {focus ? focus.server.name : t('featheros.monitor.all_servers')}
                    </div>
                    {tab === 'cpu' && <Sparkline values={graph.cpu} max={100} fill='fill-sky-500' />}
                    {tab === 'memory' && <Sparkline values={graph.mem} fill='fill-violet-500' />}
                    {tab === 'disk' && (
                        <div className='flex h-16 flex-col justify-center gap-1.5'>
                            {(focus ? [focus] : rows.filter((r) => r.hasStats).slice(0, 4)).map((r) => {
                                const limit = r.server.disk ? r.server.disk * 1024 * 1024 : 0;
                                const pct = limit ? Math.min(100, (r.disk / limit) * 100) : 0;
                                return (
                                    <div
                                        key={r.server.uuidShort}
                                        className='text-foreground flex items-center gap-2 text-[11px]'
                                    >
                                        <span className='w-28 truncate'>{r.server.name}</span>
                                        <div className='bg-background h-2 flex-1 overflow-hidden rounded-full'>
                                            <div
                                                className='h-full rounded-full bg-amber-500'
                                                style={{ width: `${limit ? pct : 100}%`, opacity: limit ? 1 : 0.3 }}
                                            />
                                        </div>
                                        <span className='w-36 text-right tabular-nums'>
                                            {formatBytes(r.disk)} / {limit ? formatBytes(limit, 0) : '∞'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {tab === 'network' && (
                        <div className='relative'>
                            <Sparkline values={graph.rx} fill='fill-emerald-500' />
                            <Sparkline
                                values={graph.tx}
                                fill='fill-rose-500'
                                className='absolute inset-0 text-rose-500'
                            />
                        </div>
                    )}
                </div>
                <div className='grid w-56 grid-cols-2 content-center gap-x-4 gap-y-1 text-[11px]'>
                    <span className='text-muted-foreground'>{t('featheros.monitor.running')}</span>
                    <span className='text-right tabular-nums'>
                        {totals.running} / {servers.length}
                    </span>
                    <span className='text-muted-foreground'>{t('featheros.monitor.cpu_total')}</span>
                    <span className='text-right tabular-nums'>{totals.cpu.toFixed(0)}%</span>
                    <span className='text-muted-foreground'>{t('featheros.monitor.memory_total')}</span>
                    <span className='text-right tabular-nums'>{formatBytes(totals.memory)}</span>
                    <span className='text-muted-foreground'>{t('featheros.monitor.disk_total')}</span>
                    <span className='text-right tabular-nums'>{formatBytes(totals.disk)}</span>
                    <span className='text-muted-foreground flex items-center gap-1'>
                        <ArrowDown className='h-3 w-3 text-emerald-500' />
                        <ArrowUp className='h-3 w-3 text-rose-500' />
                    </span>
                    <span className='text-right tabular-nums'>
                        {formatBytes(totals.rx)}/s · {formatBytes(totals.tx)}/s
                    </span>
                </div>
            </div>
        </div>
    );
}
