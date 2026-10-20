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
import {
    Plus,
    X,
    Radio,
    Play,
    Square,
    RotateCw,
    Skull,
    Send,
    Wifi,
    WifiOff,
    Loader2,
    CheckSquare,
    Square as SquareIcon,
    AppWindow,
    Columns3,
    Grid2x2,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useWingsWebSocket, type CommandSuggestResponse } from '@/hooks/useWingsWebSocket';
import ServerTerminal, { type ConsoleFilterRule, type ServerTerminalRef } from '@/components/server/ServerTerminal';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import { MenuList, menuSurface } from '../ContextMenu';
import { ServerPicker } from '../ServerPicker';
import { formatBytes, serverState, stateColor } from '../utils';
import type { OsAppProps } from './index';

function useConsoleFilters(uuid: string) {
    const key = `featherpanel_console_filters_${uuid}`;
    const [filters, setFilters] = useState<ConsoleFilterRule[]>(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as ConsoleFilterRule[]) : [];
        } catch {
            return [];
        }
    });
    const update = useCallback(
        (next: ConsoleFilterRule[]) => {
            setFilters(next);
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                // storage full / private mode
            }
        },
        [key],
    );
    return [filters, update] as const;
}

const ANSI: Record<NonNullable<ConsoleFilterRule['color']>, string> = {
    red: '\u001b[31m',
    green: '\u001b[32m',
    yellow: '\u001b[33m',
    blue: '\u001b[34m',
    magenta: '\u001b[35m',
    cyan: '\u001b[36m',
    gray: '\u001b[90m',
};

type SessionMeta = {
    status: string;
    connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
    stats: { cpu_absolute?: number; memory_bytes?: number } | null;
    power: (action: 'start' | 'stop' | 'restart' | 'kill') => void;
};

/** One Wings console: same websocket + terminal as the server console page. */
export function ConsoleSession({
    uuid,
    active,
    embedded = false,
    onMeta,
    onClose,
}: {
    uuid: string;
    active: boolean;
    embedded?: boolean;
    onMeta?: (uuid: string, meta: SessionMeta | null) => void;
    onClose?: () => void;
}) {
    const { t } = useTranslation();
    const { getServer, can, panelName, errorMessage, isDark } = useFeatherOs();
    const server = getServer(uuid);
    const terminalRef = useRef<ServerTerminalRef>(null);
    const [status, setStatus] = useState<string>(server?.stats?.state || server?.status || 'offline');
    const [filters, setFilters] = useConsoleFilters(uuid);
    const requestedLogs = useRef(false);

    const compiled = useMemo(
        () =>
            filters
                .filter((r) => r.enabled && r.pattern)
                .map((r) => {
                    try {
                        return { ...r, regex: new RegExp(r.pattern, r.flags || 'g') };
                    } catch {
                        return null;
                    }
                })
                .filter((r): r is ConsoleFilterRule & { regex: RegExp } => r !== null),
        [filters],
    );

    const onOutput = useCallback(
        (output: string) => {
            let text = output.replace(/Pterodactyl/gi, panelName);
            if (compiled.length) {
                text = text
                    .split('\n')
                    .map((line) => {
                        let current: string | null = line;
                        for (const rule of compiled) {
                            if (current === null) break;
                            rule.regex.lastIndex = 0;
                            if (rule.type === 'hide' && rule.regex.test(current)) current = null;
                            else if (rule.type === 'replace')
                                current = current.replace(rule.regex, rule.replacement ?? '');
                            else if (rule.type === 'color')
                                current = current.replace(
                                    rule.regex,
                                    (m) => `${ANSI[rule.color || 'yellow']}${m}\u001b[0m`,
                                );
                        }
                        return current;
                    })
                    .filter((l): l is string => l !== null)
                    .join('\n');
                if (!text) return;
            }
            terminalRef.current?.writeln(text);
        },
        [compiled, panelName],
    );

    const canConnect = can(uuid, 'websocket.connect') && server?.suspended !== 1;
    const { connectionStatus, sendCommand, suggestCommand, requestLogs, requestStats, stats } = useWingsWebSocket({
        serverUuid: uuid,
        connect: canConnect,
        onConsoleOutput: onOutput,
        onInstallOutput: (out) => terminalRef.current?.writeln(out),
        onStatus: setStatus,
        onStats: (s) => s.state && setStatus(s.state),
        onCommandSuggestions: (res: CommandSuggestResponse) => terminalRef.current?.applyCommandSuggestions(res),
    });

    useEffect(() => {
        if (connectionStatus !== 'connected') return;
        requestStats();
        if (!requestedLogs.current) {
            requestedLogs.current = true;
            requestLogs();
        }
        const timer = window.setInterval(requestStats, 5000);
        return () => window.clearInterval(timer);
    }, [connectionStatus, requestLogs, requestStats]);

    const power = useCallback(
        async (action: 'start' | 'stop' | 'restart' | 'kill') => {
            try {
                await axios.post(`/api/user/servers/${uuid}/power/${action}`);
            } catch (error) {
                toast.error(errorMessage(error));
            }
        },
        [errorMessage, uuid],
    );

    useEffect(() => {
        if (!onMeta) return;
        onMeta(uuid, {
            status,
            connectionStatus,
            stats: stats ?? null,
            power: (action) => void power(action),
        });
        return () => onMeta(uuid, null);
    }, [connectionStatus, onMeta, power, stats, status, uuid]);

    const state = serverState(server, status);

    return (
        <div
            className={cn(
                'fos-glass-console absolute inset-0 flex flex-col',
                !active && 'pointer-events-none invisible',
            )}
        >
            {embedded && (
                <div className='fos-term-embed-bar flex h-7 shrink-0 items-center gap-2 px-2.5 text-[11px]'>
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', stateColor(state))} />
                    <span className='min-w-0 truncate text-[var(--fos-ink)]'>
                        {server?.name ?? uuid}
                        <span className='text-[var(--fos-secondary)]'>
                            {' '}
                            · {t(`featheros.state.${state}`, { defaultValue: state })}
                        </span>
                    </span>
                    <span
                        className='ml-auto flex h-5 w-5 items-center justify-center'
                        title={t(`featheros.terminal.conn_${connectionStatus}`)}
                    >
                        {connectionStatus === 'connected' ? (
                            <Wifi className='h-3 w-3 text-[#32d74b]' />
                        ) : connectionStatus === 'connecting' ? (
                            <Loader2 className='h-3 w-3 animate-spin text-[var(--fos-secondary)]' />
                        ) : (
                            <WifiOff className='h-3 w-3 text-[#ff453a]' />
                        )}
                    </span>
                    {onClose && (
                        <button
                            type='button'
                            aria-label={t('common.close')}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className='flex h-5 w-5 items-center justify-center rounded text-[var(--fos-secondary)] hover:bg-[var(--fos-hover)] hover:text-[var(--fos-ink)]'
                        >
                            <X className='h-3 w-3' />
                        </button>
                    )}
                </div>
            )}
            <div className='relative min-h-0 flex-1 overflow-hidden'>
                {canConnect ? (
                    <ServerTerminal
                        ref={terminalRef}
                        onSendCommand={sendCommand}
                        onSuggestCommand={suggestCommand}
                        canSendCommands={connectionStatus === 'connected' && can(uuid, 'control.console')}
                        serverStatus={status}
                        filters={filters}
                        onFiltersChange={setFilters}
                        fillContainer
                        showPopoutButton={false}
                        appearance='glass'
                        glassTone={isDark ? 'dark' : 'light'}
                        className='fos-glass-terminal absolute inset-0'
                    />
                ) : (
                    <div className='flex h-full items-center justify-center text-sm text-[var(--fos-secondary)]'>
                        {t('featheros.terminal.no_access')}
                    </div>
                )}
            </div>
        </div>
    );
}

function BroadcastBar({ tabs, onClose }: { tabs: string[]; onClose: () => void }) {
    const { t } = useTranslation();
    const { serversWith, errorMessage } = useFeatherOs();
    const eligible = serversWith('control.console');
    const [targets, setTargets] = useState<Set<string>>(
        () => new Set(tabs.filter((u) => eligible.some((s) => s.uuidShort === u))),
    );
    const [command, setCommand] = useState('');
    const [sending, setSending] = useState(false);

    const send = async () => {
        const cmd = command.trim();
        if (!cmd || targets.size === 0) return;
        setSending(true);
        const list = Array.from(targets);
        const results = await Promise.allSettled(
            list.map((u) => axios.post(`/api/user/servers/${u}/command`, { command: cmd })),
        );
        const failed = results
            .map((r, i) =>
                r.status === 'rejected'
                    ? `${eligible.find((s) => s.uuidShort === list[i])?.name ?? list[i]}: ${errorMessage(r.reason)}`
                    : null,
            )
            .filter(Boolean);
        if (failed.length === 0) toast.success(t('featheros.terminal.broadcast_sent', { count: String(list.length) }));
        else
            toast.error(
                t('featheros.terminal.broadcast_partial', {
                    failed: String(failed.length),
                    total: String(list.length),
                }),
                { description: failed.join('\n') },
            );
        setSending(false);
        setCommand('');
    };

    return (
        <div className='fos-term-broadcast px-3 py-2.5'>
            <div className='mb-2 flex items-center gap-2 text-[11px] font-medium text-[var(--fos-ink)]'>
                <Radio className='h-3.5 w-3.5 text-[#ff9f0a]' />
                {t('featheros.terminal.broadcast_title')}
                <button
                    type='button'
                    onClick={() => setTargets(new Set(eligible.map((s) => s.uuidShort)))}
                    className='ml-auto text-[var(--fos-secondary)] underline-offset-2 hover:underline'
                >
                    {t('featheros.common.select_all')}
                </button>
                <button
                    type='button'
                    onClick={() => setTargets(new Set())}
                    className='text-[var(--fos-secondary)] underline-offset-2 hover:underline'
                >
                    {t('featheros.common.select_none')}
                </button>
                <button
                    type='button'
                    onClick={onClose}
                    aria-label={t('common.close')}
                    className='text-[var(--fos-secondary)] hover:text-[var(--fos-ink)]'
                >
                    <X className='h-3.5 w-3.5' />
                </button>
            </div>
            <div className='fos-scroll mb-2 flex max-h-16 flex-wrap gap-1 overflow-y-auto'>
                {eligible.map((s) => {
                    const on = targets.has(s.uuidShort);
                    return (
                        <button
                            key={s.uuidShort}
                            type='button'
                            onClick={() =>
                                setTargets((cur) => {
                                    const n = new Set(cur);
                                    if (n.has(s.uuidShort)) n.delete(s.uuidShort);
                                    else n.add(s.uuidShort);
                                    return n;
                                })
                            }
                            className={cn(
                                'flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors',
                                on
                                    ? 'border-[#ff9f0a]/40 bg-[#ff9f0a]/15 text-[var(--fos-ink)]'
                                    : 'border-transparent bg-[var(--fos-hover)] text-[var(--fos-secondary)]',
                            )}
                        >
                            {on ? <CheckSquare className='h-3 w-3' /> : <SquareIcon className='h-3 w-3' />}
                            {s.name}
                        </button>
                    );
                })}
            </div>
            <form
                className='flex gap-2'
                onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                }}
            >
                <input
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder={t('featheros.terminal.broadcast_placeholder', { count: String(targets.size) })}
                    className='fos-term-broadcast-input flex-1 rounded-lg px-2.5 py-1.5 font-mono text-[12px] outline-none'
                />
                <button
                    type='submit'
                    disabled={sending || !command.trim() || targets.size === 0}
                    className='flex items-center gap-1 rounded-lg bg-[#ff9f0a] px-3 text-[12px] font-medium text-white disabled:opacity-40'
                >
                    {sending ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Send className='h-3.5 w-3.5' />}
                    {t('featheros.terminal.send')}
                </button>
            </form>
        </div>
    );
}

function PowerToolbar({ uuid, meta }: { uuid: string; meta: SessionMeta | undefined }) {
    const { t } = useTranslation();
    const { getServer, can, live } = useFeatherOs();
    const server = getServer(uuid);
    const state = serverState(server, meta?.status ?? live[uuid]?.status);
    const conn = meta?.connectionStatus ?? 'disconnected';
    const btn =
        'inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--fos-secondary)] transition-colors hover:bg-[var(--fos-hover)] hover:text-[var(--fos-ink)] disabled:pointer-events-none disabled:opacity-25';

    return (
        <div className='flex shrink-0 items-center gap-0.5 border-l border-[var(--fos-glass-edge-soft)] pl-1.5'>
            {meta?.stats && state === 'running' && (
                <span className='mr-1 hidden text-[10px] text-[var(--fos-secondary)] tabular-nums sm:inline'>
                    {Math.round(meta.stats.cpu_absolute ?? 0)}% · {formatBytes(meta.stats.memory_bytes ?? 0)}
                </span>
            )}
            <button
                type='button'
                className={cn(btn, 'hover:text-[#32d74b]')}
                disabled={!can(uuid, 'control.start') || state === 'running'}
                onClick={() => meta?.power('start')}
                title={t('featheros.servers.start')}
                aria-label={t('featheros.servers.start')}
            >
                <Play className='h-3 w-3' />
            </button>
            <button
                type='button'
                className={btn}
                disabled={!can(uuid, 'control.restart')}
                onClick={() => meta?.power('restart')}
                title={t('featheros.servers.restart')}
                aria-label={t('featheros.servers.restart')}
            >
                <RotateCw className='h-3 w-3' />
            </button>
            <button
                type='button'
                className={cn(btn, 'hover:text-[#ffd60a]')}
                disabled={!can(uuid, 'control.stop') || state === 'offline'}
                onClick={() => meta?.power('stop')}
                title={t('featheros.servers.stop')}
                aria-label={t('featheros.servers.stop')}
            >
                <Square className='h-2.5 w-2.5' />
            </button>
            <button
                type='button'
                className={cn(btn, 'hover:text-[#ff453a]')}
                disabled={!can(uuid, 'control.stop') || state === 'offline'}
                onClick={() => meta?.power('kill')}
                title={t('featheros.servers.kill')}
                aria-label={t('featheros.servers.kill')}
            >
                <Skull className='h-3 w-3' />
            </button>
            <span
                className='ml-0.5 flex h-6 w-6 items-center justify-center'
                title={t(`featheros.terminal.conn_${conn}`)}
            >
                {conn === 'connected' ? (
                    <Wifi className='h-3 w-3 text-[#32d74b]' />
                ) : conn === 'connecting' ? (
                    <Loader2 className='h-3 w-3 animate-spin text-[var(--fos-secondary)]' />
                ) : (
                    <WifiOff className='h-3 w-3 text-[#ff453a]' />
                )}
            </span>
        </div>
    );
}

type TermLayout = 'tabs' | 'columns' | 'grid';

const TERM_LAYOUTS: { id: TermLayout; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'tabs', icon: AppWindow },
    { id: 'columns', icon: Columns3 },
    { id: 'grid', icon: Grid2x2 },
];

function paneGrid(layout: TermLayout, count: number): React.CSSProperties {
    const cols = layout === 'columns' ? count : Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    return {
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    };
}

export default function TerminalApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { updateWindowProps, getServer, serversWith, live } = useFeatherOs();
    const tabs = (Array.isArray(win.props?.tabs) ? (win.props?.tabs as string[]) : []).filter(
        (u) => typeof u === 'string',
    );
    const active =
        typeof win.props?.active === 'string' && tabs.includes(win.props.active as string)
            ? (win.props.active as string)
            : tabs[0];
    const layout: TermLayout =
        tabs.length > 1 && (win.props?.layout === 'columns' || win.props?.layout === 'grid')
            ? (win.props.layout as TermLayout)
            : 'tabs';
    const split = layout !== 'tabs';
    const [adding, setAdding] = useState(false);
    const [broadcast, setBroadcast] = useState(false);
    const [sessionMeta, setSessionMeta] = useState<Record<string, SessionMeta>>({});

    const onMeta = useCallback((uuid: string, meta: SessionMeta | null) => {
        setSessionMeta((cur) => {
            if (!meta) {
                if (!(uuid in cur)) return cur;
                const next = { ...cur };
                delete next[uuid];
                return next;
            }
            return { ...cur, [uuid]: meta };
        });
    }, []);

    const addTab = (uuid: string) => {
        updateWindowProps(win.id, { tabs: tabs.includes(uuid) ? tabs : [...tabs, uuid], active: uuid });
        setAdding(false);
    };
    const closeTab = (uuid: string) => {
        const next = tabs.filter((u) => u !== uuid);
        updateWindowProps(win.id, { tabs: next, active: active === uuid ? next[next.length - 1] : active });
    };

    if (tabs.length === 0) {
        return (
            <div className='fos-term-app flex h-full flex-col'>
                <div className='fos-term-chrome' data-fos-window-drag>
                    <span className='fos-term-chrome-title'>{t('featheros.apps.terminal')}</span>
                </div>
                <div className='min-h-0 flex-1 overflow-hidden'>
                    <ServerPicker permission='websocket.connect' onPick={addTab} title={t('featheros.terminal.pick')} />
                </div>
            </div>
        );
    }

    const candidates = serversWith('websocket.connect').filter((s) => !tabs.includes(s.uuidShort));

    return (
        <div className='fos-term-app flex h-full flex-col'>
            <div className='fos-term-chrome' data-fos-window-drag>
                <div className='fos-scroll flex max-w-[55%] min-w-0 shrink items-center gap-1 overflow-x-auto'>
                    {tabs.map((uuid) => {
                        const server = getServer(uuid);
                        const state = serverState(server, sessionMeta[uuid]?.status ?? live[uuid]?.status);
                        const isActive = uuid === active;
                        return (
                            <div
                                key={uuid}
                                role='tab'
                                data-no-drag
                                aria-selected={isActive}
                                tabIndex={0}
                                onClick={() => updateWindowProps(win.id, { active: uuid })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        updateWindowProps(win.id, { active: uuid });
                                    }
                                }}
                                className={cn(
                                    'group flex h-7 max-w-[168px] shrink-0 cursor-default items-center gap-1.5 rounded-lg px-2.5 text-[11px] transition-colors',
                                    isActive
                                        ? 'fos-term-tab-active bg-[var(--fos-hover)] text-[var(--fos-ink)]'
                                        : 'text-[var(--fos-secondary)] hover:bg-[var(--fos-hover)] hover:text-[var(--fos-ink)]',
                                )}
                            >
                                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', stateColor(state))} />
                                <span className='truncate font-medium'>{server?.name ?? uuid}</span>
                                <button
                                    type='button'
                                    aria-label={t('common.close')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTab(uuid);
                                    }}
                                    className='rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-70 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10'
                                >
                                    <X className='h-2.5 w-2.5' />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Always-available drag strip between tabs and actions (Finder-style). */}
                <div className='fos-term-chrome-drag min-h-full min-w-8 flex-1' aria-hidden />

                <div className='relative shrink-0' data-no-drag>
                    <button
                        type='button'
                        onClick={() => setAdding((a) => !a)}
                        className='flex h-7 w-7 items-center justify-center rounded-lg text-[var(--fos-secondary)] hover:bg-[var(--fos-hover)] hover:text-[var(--fos-ink)]'
                        title={t('featheros.terminal.new_tab')}
                    >
                        <Plus className='h-3.5 w-3.5' />
                    </button>
                    {adding && (
                        <div
                            className={cn(
                                'fos-pop fos-scroll absolute top-full right-0 z-20 mt-1 max-h-72 overflow-y-auto',
                                menuSurface,
                            )}
                        >
                            <MenuList
                                onDone={() => setAdding(false)}
                                items={
                                    candidates.length
                                        ? candidates.map((s) => ({
                                              id: s.uuidShort,
                                              label: s.name,
                                              onSelect: () => addTab(s.uuidShort),
                                          }))
                                        : [{ id: 'none', label: t('featheros.picker.empty'), disabled: true }]
                                }
                            />
                        </div>
                    )}
                </div>

                <button
                    type='button'
                    data-no-drag
                    onClick={() => setBroadcast((b) => !b)}
                    className={cn(
                        'flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-medium transition-colors',
                        broadcast
                            ? 'bg-[#ff9f0a]/20 text-[#ff9f0a]'
                            : 'text-[var(--fos-secondary)] hover:bg-[var(--fos-hover)] hover:text-[var(--fos-ink)]',
                    )}
                    title={t('featheros.terminal.broadcast_title')}
                >
                    <Radio className='h-3 w-3' />
                    <span className='hidden sm:inline'>{t('featheros.terminal.broadcast')}</span>
                </button>

                {tabs.length > 1 && (
                    <div className='fos-term-layouts' role='radiogroup' data-no-drag>
                        {TERM_LAYOUTS.map(({ id, icon: Icon }) => (
                            <button
                                key={id}
                                type='button'
                                role='radio'
                                aria-checked={layout === id}
                                title={t(`featheros.terminal.layout_${id}`)}
                                aria-label={t(`featheros.terminal.layout_${id}`)}
                                onClick={() => updateWindowProps(win.id, { layout: id })}
                                className={cn(layout === id && 'is-active')}
                            >
                                <Icon className='h-3.5 w-3.5' />
                            </button>
                        ))}
                    </div>
                )}

                {active && (
                    <div data-no-drag>
                        <PowerToolbar uuid={active} meta={sessionMeta[active]} />
                    </div>
                )}
            </div>

            {broadcast && <BroadcastBar tabs={tabs} onClose={() => setBroadcast(false)} />}

            <div
                className={cn('fos-term-panes relative min-h-0 flex-1', split && 'is-split')}
                style={split ? paneGrid(layout, tabs.length) : undefined}
            >
                {tabs.map((uuid) => (
                    <div
                        key={uuid}
                        className={cn('fos-term-pane', split && uuid === active && 'is-active')}
                        onPointerDownCapture={() => split && uuid !== active && updateWindowProps(win.id, { active: uuid })}
                    >
                        <ConsoleSession
                            uuid={uuid}
                            active={split || uuid === active}
                            embedded={split}
                            onMeta={onMeta}
                            onClose={split ? () => closeTab(uuid) : undefined}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
