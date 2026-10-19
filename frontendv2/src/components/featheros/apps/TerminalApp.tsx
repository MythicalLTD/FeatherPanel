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

/** One Wings console: the same websocket + terminal component the server console page uses. */
export function ConsoleSession({
    uuid,
    active,
    embedded = false,
}: {
    uuid: string;
    active: boolean;
    embedded?: boolean;
}) {
    const { t } = useTranslation();
    const { getServer, can, panelName, errorMessage } = useFeatherOs();
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

    const power = async (action: 'start' | 'stop' | 'restart' | 'kill') => {
        try {
            await axios.post(`/api/user/servers/${uuid}/power/${action}`);
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const state = serverState(server, status);
    const btn =
        'flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent';

    return (
        <div
            className={cn('fos-mac-console absolute inset-0 flex flex-col', !active && 'pointer-events-none invisible')}
        >
            <div
                className={cn(
                    'fos-console-session-bar flex h-10 shrink-0 items-center gap-3 border-b border-white/10 bg-[#1b1b1f] px-3 text-[12px] text-zinc-300',
                    embedded && 'fos-console-session-embedded',
                )}
            >
                {!embedded && (
                    <div className='flex items-center gap-1.5' aria-hidden='true'>
                        <span className='h-2.5 w-2.5 rounded-full bg-[#ff5f57]' />
                        <span className='h-2.5 w-2.5 rounded-full bg-[#febc2e]' />
                        <span className='h-2.5 w-2.5 rounded-full bg-[#28c840]' />
                    </div>
                )}
                <span className={cn('h-2 w-2 rounded-full', stateColor(state))} />
                <span className='font-medium'>{server?.name ?? uuid}</span>
                <span className='text-zinc-500'>{t(`featheros.state.${state}`, { defaultValue: state })}</span>
                {!embedded && stats && state === 'running' && (
                    <span className='text-muted-foreground ml-2 tabular-nums'>
                        {t('featheros.monitor.cpu')} {Math.round(stats.cpu_absolute ?? 0)}% ·{' '}
                        {t('featheros.monitor.memory')} {formatBytes(stats.memory_bytes)}
                    </span>
                )}
                <span className='ml-auto flex items-center gap-1'>
                    {!embedded && (
                        <>
                            <button
                                type='button'
                                className={cn(btn, 'text-emerald-600 dark:text-emerald-400')}
                                disabled={!can(uuid, 'control.start') || state === 'running'}
                                onClick={() => void power('start')}
                            >
                                <Play className='h-3 w-3' /> {t('featheros.servers.start')}
                            </button>
                            <button
                                type='button'
                                className={btn}
                                disabled={!can(uuid, 'control.restart')}
                                onClick={() => void power('restart')}
                            >
                                <RotateCw className='h-3 w-3' /> {t('featheros.servers.restart')}
                            </button>
                            <button
                                type='button'
                                className={cn(btn, 'text-amber-600 dark:text-amber-400')}
                                disabled={!can(uuid, 'control.stop') || state === 'offline'}
                                onClick={() => void power('stop')}
                            >
                                <Square className='h-3 w-3' /> {t('featheros.servers.stop')}
                            </button>
                            <button
                                type='button'
                                className={cn(btn, 'text-red-600 dark:text-red-400')}
                                disabled={!can(uuid, 'control.stop') || state === 'offline'}
                                onClick={() => void power('kill')}
                            >
                                <Skull className='h-3 w-3' /> {t('featheros.servers.kill')}
                            </button>
                        </>
                    )}
                    <span
                        className='text-muted-foreground ml-1'
                        title={t(`featheros.terminal.conn_${connectionStatus}`)}
                    >
                        {connectionStatus === 'connected' ? (
                            <Wifi className='h-3.5 w-3.5 text-emerald-500' />
                        ) : connectionStatus === 'connecting' ? (
                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                        ) : (
                            <WifiOff className='h-3.5 w-3.5 text-red-500' />
                        )}
                    </span>
                </span>
            </div>
            <div className='relative min-h-0 flex-1 overflow-hidden bg-[#101012]'>
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
                        className='fos-mac-terminal'
                    />
                ) : (
                    <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
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
        <div className='border-b bg-amber-500/10 px-3 py-2'>
            <div className='mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300'>
                <Radio className='h-3.5 w-3.5' /> {t('featheros.terminal.broadcast_title')}
                <button
                    type='button'
                    onClick={() => setTargets(new Set(eligible.map((s) => s.uuidShort)))}
                    className='ml-auto font-normal underline'
                >
                    {t('featheros.common.select_all')}
                </button>
                <button type='button' onClick={() => setTargets(new Set())} className='font-normal underline'>
                    {t('featheros.common.select_none')}
                </button>
                <button type='button' onClick={onClose} aria-label={t('common.close')}>
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
                                'flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]',
                                on ? 'border-amber-500 bg-amber-500/20' : 'opacity-70',
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
                    className='bg-background flex-1 rounded-md border px-2 py-1 font-mono text-[12px] outline-none focus:ring-2 focus:ring-amber-500/50'
                />
                <button
                    type='submit'
                    disabled={sending || !command.trim() || targets.size === 0}
                    className='flex items-center gap-1 rounded-md bg-amber-500 px-3 text-[12px] font-medium text-white disabled:opacity-40'
                >
                    {sending ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Send className='h-3.5 w-3.5' />}
                    {t('featheros.terminal.send')}
                </button>
            </form>
        </div>
    );
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
    const [adding, setAdding] = useState(false);
    const [broadcast, setBroadcast] = useState(false);

    const addTab = (uuid: string) => {
        updateWindowProps(win.id, { tabs: tabs.includes(uuid) ? tabs : [...tabs, uuid], active: uuid });
        setAdding(false);
    };
    const closeTab = (uuid: string) => {
        const next = tabs.filter((u) => u !== uuid);
        updateWindowProps(win.id, { tabs: next, active: active === uuid ? next[next.length - 1] : active });
    };

    if (tabs.length === 0) {
        return <ServerPicker permission='websocket.connect' onPick={addTab} title={t('featheros.terminal.pick')} />;
    }

    const candidates = serversWith('websocket.connect').filter((s) => !tabs.includes(s.uuidShort));
    return (
        <div className='flex h-full flex-col'>
            <div className='bg-muted/40 flex h-8 shrink-0 items-center gap-1 border-b px-1.5'>
                <div className='fos-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto'>
                    {tabs.map((uuid) => {
                        const server = getServer(uuid);
                        const state = serverState(server, live[uuid]?.status);
                        return (
                            <div
                                key={uuid}
                                onClick={() => updateWindowProps(win.id, { active: uuid })}
                                className={cn(
                                    'group flex h-6 max-w-[200px] shrink-0 cursor-default items-center gap-1.5 rounded-md px-2 text-[12px]',
                                    uuid === active
                                        ? 'bg-background shadow-sm'
                                        : 'hover:bg-background/50 text-muted-foreground',
                                )}
                            >
                                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', stateColor(state))} />
                                <span className='truncate'>{server?.name ?? uuid}</span>
                                <button
                                    type='button'
                                    aria-label={t('common.close')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTab(uuid);
                                    }}
                                    className='opacity-0 group-hover:opacity-70 hover:opacity-100'
                                >
                                    <X className='h-3 w-3' />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className='relative'>
                    <button
                        type='button'
                        onClick={() => setAdding((a) => !a)}
                        className='hover:bg-background/60 flex h-6 w-6 items-center justify-center rounded-md'
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
                    onClick={() => setBroadcast((b) => !b)}
                    className={cn(
                        'flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium',
                        broadcast ? 'bg-amber-500 text-white' : 'hover:bg-background/60',
                    )}
                    title={t('featheros.terminal.broadcast_title')}
                >
                    <Radio className='h-3.5 w-3.5' /> {t('featheros.terminal.broadcast')}
                </button>
            </div>
            {broadcast && <BroadcastBar tabs={tabs} onClose={() => setBroadcast(false)} />}
            <div className='relative min-h-0 flex-1'>
                {tabs.map((uuid) => (
                    <ConsoleSession key={uuid} uuid={uuid} active={uuid === active} />
                ))}
            </div>
        </div>
    );
}
