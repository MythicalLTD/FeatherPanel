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

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
    Activity,
    CalendarDays,
    Clock3,
    FolderOpen,
    GripVertical,
    HardDrive,
    HeartPulse,
    Network,
    Plus,
    Server,
    SquareTerminal,
    Timer,
    X,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_WIDGET_TYPES, type OsDesktopWidget, type OsWidgetType } from './types';
import { formatBytes, formatDiskPair, formatUptime, serverDiskUsage, serverState, stateColor } from './utils';

function WidgetShell({
    editing,
    onRemove,
    draggable,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    className,
    children,
    onClick,
}: {
    editing: boolean;
    onRemove?: () => void;
    draggable?: boolean;
    onDragStart?: (e: DragEvent) => void;
    onDragOver?: (e: DragEvent) => void;
    onDrop?: (e: DragEvent) => void;
    onDragEnd?: () => void;
    className?: string;
    children: ReactNode;
    onClick?: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div
            data-fos-widget
            role={onClick && !editing ? 'button' : undefined}
            tabIndex={onClick && !editing ? 0 : undefined}
            draggable={editing && draggable}
            onDragStart={editing ? onDragStart : undefined}
            onDragOver={editing ? onDragOver : undefined}
            onDrop={editing ? onDrop : undefined}
            onDragEnd={editing ? onDragEnd : undefined}
            onClick={editing ? undefined : onClick}
            onKeyDown={
                onClick && !editing
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick();
                          }
                      }
                    : undefined
            }
            className={cn('fos-widget group relative text-left', editing && 'fos-widget--edit', className)}
        >
            {editing && (
                <>
                    <span className='fos-widget-grip' aria-hidden>
                        <GripVertical className='h-3.5 w-3.5' />
                    </span>
                    {onRemove && (
                        <button
                            type='button'
                            className='fos-widget-remove'
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            aria-label={t('common.remove')}
                        >
                            <X className='h-3 w-3' strokeWidth={2.5} />
                        </button>
                    )}
                </>
            )}
            {children}
        </div>
    );
}

function ClockBody({ now, clock24h, clockSeconds }: { now: Date; clock24h: boolean; clockSeconds: boolean }) {
    const time = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: clockSeconds ? '2-digit' : undefined,
        hour12: !clock24h,
    });
    const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    return (
        <>
            <div className='fos-widget-time'>{time}</div>
            <div className='fos-widget-date'>{date}</div>
        </>
    );
}

function CalendarBody({ now }: { now: Date }) {
    const month = now.toLocaleDateString(undefined, { month: 'long' });
    const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
    const day = now.getDate();
    return (
        <div className='fos-widget-cal'>
            <div className='fos-widget-cal-month'>{month}</div>
            <div className='fos-widget-cal-day'>{day}</div>
            <div className='fos-widget-cal-weekday'>{weekday}</div>
        </div>
    );
}

export function DesktopWidgets() {
    const { t } = useTranslation();
    const { servers, live, settings, openApp, widgets, addWidget, removeWidget, reorderWidgets } = useFeatherOs();
    const [now, setNow] = useState(() => new Date());
    const [editing, setEditing] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const dragId = useRef<string | null>(null);

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), settings.clockSeconds ? 1000 : 30_000);
        return () => window.clearInterval(id);
    }, [settings.clockSeconds]);

    const ordered = useMemo(() => [...widgets].sort((a, b) => a.order - b.order), [widgets]);
    const running = servers.filter((s) => serverState(s, live[s.uuidShort]?.status) === 'running').length;
    const cpu = Object.values(live).reduce((a, d) => a + (d.stats?.cpuUsage ?? 0), 0);
    const mem = Object.values(live).reduce((a, d) => a + (d.stats?.memoryUsage ?? 0), 0);
    const disk = Object.values(live).reduce((a, d) => a + (d.stats?.diskUsage ?? 0), 0);
    const netRx = Object.values(live).reduce((a, d) => a + (d.stats?.networkRx ?? 0), 0);
    const netTx = Object.values(live).reduce((a, d) => a + (d.stats?.networkTx ?? 0), 0);
    const online = servers.filter((s) => {
        const st = serverState(s, live[s.uuidShort]?.status);
        return st === 'running' || st === 'starting';
    }).length;
    const offline = Math.max(0, servers.length - online);
    const uptimes = Object.values(live)
        .map((d) => d.stats?.uptime ?? 0)
        .filter((u) => u > 0);
    const bestUptime = uptimes.length ? Math.max(...uptimes) : 0;

    const label = (type: OsWidgetType) =>
        t(`featheros.widgets.${type}`, {
            defaultValue: (
                {
                    clock: 'Clock',
                    calendar: 'Calendar',
                    servers: 'Servers',
                    resources: 'Resources',
                    network: 'Network',
                    storage: 'Storage',
                    shortcuts: 'Shortcuts',
                    status: 'Status',
                    uptime: 'Uptime',
                } as Record<OsWidgetType, string>
            )[type],
        });

    const onDragStart = (id: string) => (e: DragEvent) => {
        dragId.current = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    };
    const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const onDropOn = (targetId: string) => (e: DragEvent) => {
        e.preventDefault();
        const from = dragId.current || e.dataTransfer.getData('text/plain');
        dragId.current = null;
        if (!from || from === targetId) return;
        const ids = ordered.map((w) => w.id);
        const fromIdx = ids.indexOf(from);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx < 0 || toIdx < 0) return;
        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, from);
        reorderWidgets(ids);
    };

    const renderWidget = (w: OsDesktopWidget) => {
        const shell = {
            editing,
            onRemove: () => removeWidget(w.id),
            draggable: true,
            onDragStart: onDragStart(w.id),
            onDragOver,
            onDrop: onDropOn(w.id),
            onDragEnd: () => {
                dragId.current = null;
            },
        };

        switch (w.type) {
            case 'clock':
                return (
                    <WidgetShell key={w.id} {...shell} className='fos-widget--clock'>
                        <ClockBody now={now} clock24h={settings.clock24h} clockSeconds={settings.clockSeconds} />
                    </WidgetShell>
                );
            case 'calendar':
                return (
                    <WidgetShell key={w.id} {...shell} className='fos-widget--cal'>
                        <CalendarBody now={now} />
                    </WidgetShell>
                );
            case 'servers':
                return (
                    <WidgetShell key={w.id} {...shell} onClick={() => openApp('servers')}>
                        <div className='fos-widget-kicker'>{label('servers')}</div>
                        <div className='fos-widget-stat'>
                            {running}
                            <span className='fos-widget-stat-muted'> / {servers.length}</span>
                        </div>
                        <div className='fos-widget-dots'>
                            {servers.slice(0, 12).map((s) => {
                                const st = serverState(s, live[s.uuidShort]?.status);
                                return (
                                    <span
                                        key={s.uuidShort}
                                        title={s.name}
                                        className={cn('fos-widget-dot', stateColor(st))}
                                    />
                                );
                            })}
                        </div>
                    </WidgetShell>
                );
            case 'resources':
                return (
                    <WidgetShell key={w.id} {...shell} onClick={() => openApp('monitor')}>
                        <div className='fos-widget-kicker'>{label('resources')}</div>
                        <div className='fos-widget-metrics'>
                            <div>
                                <div className='fos-widget-metric-label'>CPU</div>
                                <div className='fos-widget-metric-value'>{cpu.toFixed(0)}%</div>
                            </div>
                            <div>
                                <div className='fos-widget-metric-label'>RAM</div>
                                <div className='fos-widget-metric-value'>{formatBytes(mem)}</div>
                            </div>
                        </div>
                    </WidgetShell>
                );
            case 'network':
                return (
                    <WidgetShell key={w.id} {...shell} onClick={() => openApp('monitor')}>
                        <div className='fos-widget-kicker'>{label('network')}</div>
                        <div className='fos-widget-metrics'>
                            <div>
                                <div className='fos-widget-metric-label'>↓ RX</div>
                                <div className='fos-widget-metric-value'>{formatBytes(netRx)}</div>
                            </div>
                            <div>
                                <div className='fos-widget-metric-label'>↑ TX</div>
                                <div className='fos-widget-metric-value'>{formatBytes(netTx)}</div>
                            </div>
                        </div>
                    </WidgetShell>
                );
            case 'storage':
                return (
                    <WidgetShell key={w.id} {...shell} onClick={() => openApp('monitor')}>
                        <div className='fos-widget-kicker'>{label('storage')}</div>
                        <div className='fos-widget-stat'>{formatBytes(disk)}</div>
                        <div className='fos-widget-sub'>
                            {t('featheros.widgets.storage_hint', { defaultValue: 'Across live servers' })}
                        </div>
                        {servers.slice(0, 4).map((s) => {
                            const info = serverDiskUsage(s, live[s.uuidShort]?.stats?.diskUsage);
                            const tone = info.pct >= 90 ? 'is-crit' : info.pct >= 75 ? 'is-warn' : '';
                            return (
                                <div key={s.uuidShort} className='fos-widget-disk-row'>
                                    <span className='fos-widget-disk-name'>{s.name}</span>
                                    <span className='fos-widget-disk-val'>{formatDiskPair(info.used, info.limit)}</span>
                                    <div className='fos-widget-disk-track'>
                                        <span
                                            className={tone}
                                            style={{
                                                width: `${info.limit ? info.pct : info.used ? 8 : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </WidgetShell>
                );
            case 'shortcuts':
                return (
                    <WidgetShell key={w.id} {...shell} className='fos-widget--shortcuts'>
                        <div className='fos-widget-kicker'>{label('shortcuts')}</div>
                        <div className='fos-widget-shortcuts'>
                            <button type='button' onClick={() => openApp('finder')} title={t('featheros.apps.finder')}>
                                <FolderOpen className='h-4 w-4' />
                            </button>
                            <button
                                type='button'
                                onClick={() => openApp('terminal')}
                                title={t('featheros.apps.terminal')}
                            >
                                <SquareTerminal className='h-4 w-4' />
                            </button>
                            <button
                                type='button'
                                onClick={() => openApp('servers')}
                                title={t('featheros.apps.servers')}
                            >
                                <Server className='h-4 w-4' />
                            </button>
                            <button
                                type='button'
                                onClick={() => openApp('monitor')}
                                title={t('featheros.apps.monitor')}
                            >
                                <Activity className='h-4 w-4' />
                            </button>
                        </div>
                    </WidgetShell>
                );
            case 'status':
                return (
                    <WidgetShell key={w.id} {...shell} onClick={() => openApp('servers')}>
                        <div className='fos-widget-kicker'>{label('status')}</div>
                        <div className='fos-widget-metrics'>
                            <div>
                                <div className='fos-widget-metric-label'>
                                    {t('featheros.state.running', { defaultValue: 'Online' })}
                                </div>
                                <div className='fos-widget-metric-value'>{online}</div>
                            </div>
                            <div>
                                <div className='fos-widget-metric-label'>
                                    {t('featheros.state.offline', { defaultValue: 'Offline' })}
                                </div>
                                <div className='fos-widget-metric-value'>{offline}</div>
                            </div>
                        </div>
                    </WidgetShell>
                );
            case 'uptime':
                return (
                    <WidgetShell key={w.id} {...shell} onClick={() => openApp('monitor')}>
                        <div className='fos-widget-kicker'>{label('uptime')}</div>
                        <div className='fos-widget-stat'>{bestUptime ? formatUptime(bestUptime) : '-'}</div>
                        <div className='fos-widget-sub'>
                            {t('featheros.widgets.uptime_hint', { defaultValue: 'Longest live uptime' })}
                        </div>
                    </WidgetShell>
                );
            default:
                return null;
        }
    };

    const galleryIcon = (type: OsWidgetType) => {
        const cls = 'h-4 w-4';
        switch (type) {
            case 'clock':
                return <Clock3 className={cls} />;
            case 'calendar':
                return <CalendarDays className={cls} />;
            case 'servers':
                return <Server className={cls} />;
            case 'resources':
                return <Activity className={cls} />;
            case 'network':
                return <Network className={cls} />;
            case 'storage':
                return <HardDrive className={cls} />;
            case 'shortcuts':
                return <SquareTerminal className={cls} />;
            case 'status':
                return <HeartPulse className={cls} />;
            case 'uptime':
                return <Timer className={cls} />;
        }
    };

    return (
        <div className='fos-widgets pointer-events-none absolute top-3 left-3 z-[1] flex w-[300px] flex-col gap-3'>
            <div className='pointer-events-auto flex flex-col gap-3'>{ordered.map((w) => renderWidget(w))}</div>

            <div className='pointer-events-auto flex flex-col gap-2'>
                {!editing ? (
                    <button type='button' className='fos-widget-edit-btn' onClick={() => setEditing(true)}>
                        {t('featheros.widgets.edit', { defaultValue: 'Edit Widgets' })}
                    </button>
                ) : (
                    <>
                        <button type='button' className='fos-widget-add-btn' onClick={() => setGalleryOpen((v) => !v)}>
                            <Plus className='h-3.5 w-3.5' />
                            {t('featheros.widgets.add', { defaultValue: 'Add Widget' })}
                        </button>
                        {galleryOpen && (
                            <div className='fos-widget-gallery'>
                                {OS_WIDGET_TYPES.map((type) => (
                                    <button
                                        key={type}
                                        type='button'
                                        className='fos-widget-gallery-item'
                                        onClick={() => {
                                            addWidget(type);
                                            setGalleryOpen(false);
                                        }}
                                    >
                                        <span className='fos-widget-gallery-icon'>{galleryIcon(type)}</span>
                                        <span>{label(type)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            type='button'
                            className='fos-widget-edit-btn'
                            onClick={() => {
                                setEditing(false);
                                setGalleryOpen(false);
                            }}
                        >
                            {t('featheros.widgets.done', { defaultValue: 'Done' })}
                        </button>
                        <p className='fos-widget-edit-hint px-1 text-center text-[11px]'>
                            {t('featheros.widgets.edit_hint', {
                                defaultValue: 'Drag to rearrange. Use - to remove.',
                            })}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
