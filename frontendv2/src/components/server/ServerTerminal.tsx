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

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import '@xterm/xterm/css/xterm.css';
import {
    Terminal as TerminalIcon,
    Trash2,
    Send,
    ChevronDown,
    History,
    Clock,
    Settings2,
    ExternalLink,
    UploadCloud,
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export interface ServerTerminalRef {
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
}

export interface ConsoleFilterRule {
    id: string;
    pattern: string;
    flags?: string;
    type: 'replace' | 'hide' | 'color';
    replacement?: string;
    color?: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'gray';
    enabled: boolean;
}

interface ServerTerminalProps {
    onSendCommand?: (command: string) => void;
    canSendCommands?: boolean;
    serverStatus?: string;
    filters?: ConsoleFilterRule[];
    onFiltersChange?: (rules: ConsoleFilterRule[]) => void;
    fullHeight?: boolean;
    showPopoutButton?: boolean;
    onUploadLogs?: () => void;
}

const ServerTerminal = React.forwardRef<ServerTerminalRef, ServerTerminalProps>(
    (
        {
            onSendCommand,
            canSendCommands = false,
            serverStatus = 'offline',
            filters = [],
            onFiltersChange,
            fullHeight = false,
            showPopoutButton = true,
            onUploadLogs,
        },
        ref,
    ) => {
        const terminalRef = useRef<HTMLDivElement>(null);
        const terminalInstanceRef = useRef<Terminal | null>(null);
        const fitAddonRef = useRef<FitAddon | null>(null);
        const { t } = useTranslation();
        const [commandInput, setCommandInput] = useState('');
        const [showScrollButton, setShowScrollButton] = useState(false);
        const [autoScroll, setAutoScroll] = useState(() => {
            const saved = localStorage.getItem('featherpanel_terminal_autoscroll');
            return saved !== null ? saved === 'true' : true;
        });
        const [commandHistory, setCommandHistory] = useState<string[]>([]);
        const [historyIndex, setHistoryIndex] = useState(-1);
        const [showSettings, setShowSettings] = useState(false);

        useEffect(() => {
            const savedHistory = localStorage.getItem('featherpanel_terminal_history');
            if (savedHistory) {
                try {
                    setCommandHistory(JSON.parse(savedHistory));
                } catch (e) {
                    console.error('Failed to parse command history', e);
                }
            }
        }, []);

        useEffect(() => {
            localStorage.setItem('featherpanel_terminal_autoscroll', String(autoScroll));
        }, [autoScroll]);

        const saveToHistory = (cmd: string) => {
            const newHistory = [cmd, ...commandHistory.filter((c) => c !== cmd)].slice(0, 50);
            setCommandHistory(newHistory);
            localStorage.setItem('featherpanel_terminal_history', JSON.stringify(newHistory));
        };

        React.useImperativeHandle(
            ref,
            () => ({
                write: (data: string) => {
                    if (terminalInstanceRef.current) {
                        terminalInstanceRef.current.write(data);
                        if (autoScroll) {
                            terminalInstanceRef.current.scrollToBottom();
                        }
                    }
                },
                writeln: (data: string) => {
                    if (terminalInstanceRef.current) {
                        terminalInstanceRef.current.writeln(data);
                        if (autoScroll) {
                            terminalInstanceRef.current.scrollToBottom();
                        }
                    }
                },
                clear: () => {
                    if (terminalInstanceRef.current) {
                        terminalInstanceRef.current.clear();
                    }
                },
            }),
            [autoScroll],
        );

        useEffect(() => {
            if (!terminalRef.current) return;

            const terminal = new Terminal({
                cursorBlink: false,
                fontSize: 14,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                theme: {
                    background: '#00000000',
                    foreground: '#ffffff',
                    cursor: '#ffffff',
                    selectionBackground: 'rgba(255, 255, 255, 0.3)',
                },
                scrollback: 10000,
                allowProposedApi: true,
                allowTransparency: true,
                disableStdin: true,
            });

            const fitAddon = new FitAddon();
            const webLinksAddon = new WebLinksAddon();
            const clipboardAddon = new ClipboardAddon();

            terminal.loadAddon(fitAddon);
            terminal.loadAddon(webLinksAddon);
            terminal.loadAddon(clipboardAddon);

            try {
                const webglAddon = new WebglAddon();
                terminal.loadAddon(webglAddon);
            } catch {
                console.warn('WebGL addon failed to load, using canvas renderer');
            }

            terminal.open(terminalRef.current);
            fitAddon.fit();

            terminalInstanceRef.current = terminal;
            fitAddonRef.current = fitAddon;

            terminal.attachCustomKeyEventHandler((e) => {
                if (e.ctrlKey && e.code === 'KeyC' && terminal.hasSelection()) {
                    return false;
                }
                return true;
            });

            terminal.onScroll(() => {
                const isAtBottom = terminal.buffer.active.viewportY === terminal.buffer.active.baseY;
                setShowScrollButton(!isAtBottom);
            });

            const handleResize = () => {
                fitAddon.fit();
            };
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                terminal.dispose();
            };
        }, []);

        const sendCommand = () => {
            if (!commandInput.trim() || !onSendCommand) return;

            saveToHistory(commandInput);
            setHistoryIndex(-1);

            onSendCommand(commandInput);

            setCommandInput('');
        };

        const clearTerminal = () => {
            if (terminalInstanceRef.current) {
                terminalInstanceRef.current.clear();
            }
        };

        const scrollToBottom = () => {
            if (terminalInstanceRef.current) {
                terminalInstanceRef.current.scrollToBottom();
            }
        };

        const navigateHistory = (direction: 'up' | 'down') => {
            if (commandHistory.length === 0) return;

            let newIndex = historyIndex;

            if (direction === 'up') {
                newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
            } else {
                newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
            }

            setHistoryIndex(newIndex);
            setCommandInput(newIndex === -1 ? '' : commandHistory[newIndex]);
        };

        const loadHistoryCommand = (cmd: string) => {
            setCommandInput(cmd);
        };

        const handleAddFilter = () => {
            if (!onFiltersChange) return;
            const newRule: ConsoleFilterRule = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                pattern: '',
                type: 'replace',
                replacement: '',
                enabled: true,
            };
            onFiltersChange([newRule, ...filters]);
        };

        const handleUpdateFilter = (id: string, partial: Partial<ConsoleFilterRule>) => {
            if (!onFiltersChange) return;
            onFiltersChange(filters.map((rule) => (rule.id === id ? { ...rule, ...partial } : rule)));
        };

        const handleDeleteFilter = (id: string) => {
            if (!onFiltersChange) return;
            onFiltersChange(filters.filter((rule) => rule.id !== id));
        };

        const handlePopoutWindow = () => {
            if (typeof window === 'undefined') return;
            const url = new URL(window.location.href);
            url.searchParams.set('consolePopout', '1');
            window.open(url.toString(), '_blank', 'noopener,noreferrer,width=1200,height=800');
        };

        const canSend = canSendCommands && (serverStatus === 'running' || serverStatus === 'starting');

        return (
            <div className='border-border/50 bg-card/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                <div className='border-border border-b p-4 sm:p-6'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                            <div className='bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg'>
                                <TerminalIcon className='text-primary h-5 w-5' />
                            </div>
                            <h2 className='text-lg font-bold'>{t('servers.console.terminal.title')}</h2>
                        </div>
                        <div className='flex items-center gap-2'>
                            <label className='group hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors'>
                                <input
                                    type='checkbox'
                                    checked={autoScroll}
                                    onChange={(e) => setAutoScroll(e.target.checked)}
                                    className='border-input bg-background text-primary focus:ring-primary h-4 w-4 cursor-pointer rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-0'
                                />
                                <span className='text-muted-foreground group-hover:text-foreground text-xs transition-colors select-none sm:text-sm'>
                                    {t('servers.console.terminal.auto_scroll')}
                                </span>
                            </label>
                            <button
                                onClick={() => setShowSettings((prev) => !prev)}
                                className='border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg border transition-colors'
                                aria-label={t('servers.console.terminal.customize')}
                                type='button'
                            >
                                <Settings2 className='h-4 w-4' />
                            </button>
                            {showPopoutButton && (
                                <button
                                    onClick={handlePopoutWindow}
                                    className='border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg border transition-colors'
                                    aria-label={t('servers.console.terminal.popout')}
                                    type='button'
                                >
                                    <ExternalLink className='h-4 w-4' />
                                </button>
                            )}
                            <Menu as='div' className='relative'>
                                <Menu.Button
                                    className='border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg border transition-colors'
                                    aria-label={t('servers.console.terminal.history_title')}
                                >
                                    <History className='h-4 w-4' />
                                </Menu.Button>
                                <Transition
                                    as={Fragment}
                                    enter='transition ease-out duration-100'
                                    enterFrom='transform opacity-0 scale-95'
                                    enterTo='transform opacity-100 scale-100'
                                    leave='transition ease-in duration-75'
                                    leaveFrom='transform opacity-100 scale-100'
                                    leaveTo='transform opacity-0 scale-95'
                                >
                                    <Menu.Items className='bg-popover border-border/50 absolute right-0 z-20 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border focus:outline-none'>
                                        <div className='border-border/50 bg-muted/30 border-b p-2'>
                                            <p className='text-muted-foreground px-2 text-xs font-medium'>
                                                {t('servers.console.terminal.history_title')}
                                            </p>
                                        </div>
                                        <div className='custom-scrollbar max-h-60 overflow-y-auto p-1'>
                                            {commandHistory.length === 0 ? (
                                                <div className='text-muted-foreground px-3 py-4 text-center text-xs'>
                                                    {t('servers.console.terminal.no_history')}
                                                </div>
                                            ) : (
                                                commandHistory.map((cmd, idx) => (
                                                    <Menu.Item key={idx}>
                                                        {({ active }) => (
                                                            <button
                                                                onClick={() => loadHistoryCommand(cmd)}
                                                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'} `}
                                                            >
                                                                <Clock className='h-3 w-3 opacity-50' />
                                                                <span className='truncate font-mono text-xs'>
                                                                    {cmd}
                                                                </span>
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                ))
                                            )}
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                            {onUploadLogs && (
                                <button
                                    onClick={onUploadLogs}
                                    className='border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg border transition-colors'
                                    aria-label={t('servers.console.upload_logs')}
                                    type='button'
                                >
                                    <UploadCloud className='h-4 w-4' />
                                </button>
                            )}
                            <button
                                onClick={clearTerminal}
                                className='border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg border transition-colors'
                                aria-label={t('servers.console.terminal.clear')}
                            >
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </div>
                    </div>
                </div>
                {showSettings && (
                    <div className='border-border bg-muted/30 border-b px-4 py-3 sm:px-6'>
                        <div className='mb-3 flex items-center justify-between'>
                            <p className='text-muted-foreground text-xs font-semibold'>
                                {t('servers.console.terminal.customize')}
                            </p>
                            <button
                                onClick={handleAddFilter}
                                type='button'
                                className='bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2 py-1 text-xs transition-colors'
                                disabled={!onFiltersChange}
                            >
                                {t('servers.console.terminal.add_rule')}
                            </button>
                        </div>
                        {filters.length === 0 ? (
                            <p className='text-muted-foreground text-xs'>{t('servers.console.terminal.no_rules')}</p>
                        ) : (
                            <div className='custom-scrollbar max-h-64 space-y-3 overflow-y-auto pr-1'>
                                {filters.map((rule) => (
                                    <div
                                        key={rule.id}
                                        className='border-border/60 bg-background/60 space-y-2 rounded-lg border px-3 py-2'
                                    >
                                        <div className='flex items-center justify-between gap-2'>
                                            <div className='flex items-center gap-2'>
                                                <input
                                                    type='checkbox'
                                                    checked={rule.enabled}
                                                    onChange={(e) =>
                                                        handleUpdateFilter(rule.id, {
                                                            enabled: e.target.checked,
                                                        })
                                                    }
                                                    className='border-input h-3.5 w-3.5 rounded'
                                                    disabled={!onFiltersChange}
                                                />
                                                <select
                                                    value={rule.type}
                                                    onChange={(e) =>
                                                        handleUpdateFilter(rule.id, {
                                                            type: e.target.value as ConsoleFilterRule['type'],
                                                        })
                                                    }
                                                    className='border-border bg-background rounded-md border px-2 py-1 text-xs'
                                                    disabled={!onFiltersChange}
                                                >
                                                    <option value='replace'>
                                                        {t('servers.console.terminal.rule_type_replace')}
                                                    </option>
                                                    <option value='hide'>
                                                        {t('servers.console.terminal.rule_type_hide')}
                                                    </option>
                                                    <option value='color'>
                                                        {t('servers.console.terminal.rule_type_color')}
                                                    </option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFilter(rule.id)}
                                                type='button'
                                                className='text-muted-foreground hover:text-destructive text-[11px]'
                                                disabled={!onFiltersChange}
                                            >
                                                {t('servers.console.terminal.delete_rule')}
                                            </button>
                                        </div>
                                        <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                                            <div className='space-y-1 sm:col-span-2'>
                                                <label className='text-muted-foreground text-[11px]'>
                                                    {t('servers.console.terminal.pattern')}
                                                </label>
                                                <input
                                                    type='text'
                                                    value={rule.pattern}
                                                    onChange={(e) =>
                                                        handleUpdateFilter(rule.id, {
                                                            pattern: e.target.value,
                                                        })
                                                    }
                                                    className='border-border bg-background w-full rounded-md border px-2 py-1 font-mono text-xs'
                                                    placeholder='^\\[INFO\\]'
                                                    disabled={!onFiltersChange}
                                                />
                                            </div>
                                            <div className='space-y-1'>
                                                <label className='text-muted-foreground text-[11px]'>
                                                    {t('servers.console.terminal.flags')}
                                                </label>
                                                <input
                                                    type='text'
                                                    value={rule.flags || ''}
                                                    onChange={(e) =>
                                                        handleUpdateFilter(rule.id, {
                                                            flags: e.target.value,
                                                        })
                                                    }
                                                    className='border-border bg-background w-full rounded-md border px-2 py-1 text-xs'
                                                    placeholder='gmi'
                                                    disabled={!onFiltersChange}
                                                />
                                            </div>
                                        </div>
                                        {rule.type === 'replace' && (
                                            <div className='space-y-1'>
                                                <label className='text-muted-foreground text-[11px]'>
                                                    {t('servers.console.terminal.replacement')}
                                                </label>
                                                <input
                                                    type='text'
                                                    value={rule.replacement || ''}
                                                    onChange={(e) =>
                                                        handleUpdateFilter(rule.id, {
                                                            replacement: e.target.value,
                                                        })
                                                    }
                                                    className='border-border bg-background w-full rounded-md border px-2 py-1 text-xs'
                                                    placeholder='[RENAMED]'
                                                    disabled={!onFiltersChange}
                                                />
                                            </div>
                                        )}
                                        {rule.type === 'color' && (
                                            <div className='space-y-1'>
                                                <label className='text-muted-foreground text-[11px]'>
                                                    {t('servers.console.terminal.color')}
                                                </label>
                                                <select
                                                    value={rule.color || 'yellow'}
                                                    onChange={(e) =>
                                                        handleUpdateFilter(rule.id, {
                                                            color: e.target.value as ConsoleFilterRule['color'],
                                                        })
                                                    }
                                                    className='border-border bg-background rounded-md border px-2 py-1 text-xs'
                                                    disabled={!onFiltersChange}
                                                >
                                                    <option value='red'>
                                                        {t('servers.console.terminal.color_red')}
                                                    </option>
                                                    <option value='yellow'>
                                                        {t('servers.console.terminal.color_yellow')}
                                                    </option>
                                                    <option value='green'>
                                                        {t('servers.console.terminal.color_green')}
                                                    </option>
                                                    <option value='blue'>
                                                        {t('servers.console.terminal.color_blue')}
                                                    </option>
                                                    <option value='magenta'>
                                                        {t('servers.console.terminal.color_magenta')}
                                                    </option>
                                                    <option value='cyan'>
                                                        {t('servers.console.terminal.color_cyan')}
                                                    </option>
                                                    <option value='gray'>
                                                        {t('servers.console.terminal.color_gray')}
                                                    </option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div className='relative p-0.5'>
                    <div
                        ref={terminalRef}
                        className={
                            fullHeight
                                ? 'h-[calc(100vh-160px)] w-full sm:h-[calc(100vh-160px)]'
                                : 'h-[500px] w-full sm:h-[600px]'
                        }
                    />

                    {showScrollButton && (
                        <button
                            onClick={scrollToBottom}
                            className='bg-background/95 hover:bg-background border-border absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg border px-3 py-2 backdrop-blur-sm transition-colors'
                        >
                            <ChevronDown className='h-4 w-4' />
                            <span className='hidden text-sm sm:inline'>
                                {t('servers.console.terminal.scroll_bottom')}
                            </span>
                        </button>
                    )}

                    {onSendCommand && (
                        <div className='border-border bg-muted/30 border-t p-3'>
                            <div className='flex gap-2'>
                                <input
                                    value={commandInput}
                                    onChange={(e) => setCommandInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') sendCommand();
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            navigateHistory('up');
                                        }
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            navigateHistory('down');
                                        }
                                        if (e.ctrlKey && e.code === 'KeyC') {
                                            const termHasSelection = terminalInstanceRef.current?.hasSelection();
                                            const target = e.target as HTMLInputElement;
                                            const inputHasSelection = target.selectionStart !== target.selectionEnd;

                                            if (termHasSelection && !inputHasSelection) {
                                                const selection = terminalInstanceRef.current?.getSelection();
                                                if (selection) {
                                                    navigator.clipboard.writeText(selection);
                                                }
                                                e.preventDefault();
                                                e.stopPropagation();
                                            } else if (!termHasSelection && !inputHasSelection && onSendCommand) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onSendCommand('\x03');
                                                setCommandInput('');
                                            }
                                        }
                                    }}
                                    type='text'
                                    className='border-border bg-background focus:ring-primary flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:ring-2 focus:outline-none'
                                    placeholder={t('servers.console.terminal.placeholder')}
                                    disabled={!canSend}
                                />
                                <button
                                    onClick={sendCommand}
                                    disabled={!canSend || !commandInput.trim()}
                                    className='bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                                >
                                    <Send className='h-4 w-4' />
                                </button>
                            </div>
                            {!canSendCommands && (
                                <p className='mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400'>
                                    <span>🚫</span>
                                    <span>{t('servers.console.noConsolePermissionSend')}</span>
                                </p>
                            )}
                            {canSendCommands && !canSend && (
                                <p className='mt-2 flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400'>
                                    <span>⚠️</span>
                                    <span>{t('servers.console.terminal.server_running_required')}</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <style jsx global>{`
                    .xterm-viewport::-webkit-scrollbar {
                        width: 8px;
                        height: 8px;
                    }
                    .xterm-viewport::-webkit-scrollbar-track {
                        background-color: transparent;
                    }
                    .xterm-viewport::-webkit-scrollbar-thumb {
                        background-color: hsl(var(--muted-foreground) / 0.3);
                        border-radius: 4px;
                    }
                    .xterm-viewport::-webkit-scrollbar-thumb:hover {
                        background-color: hsl(var(--muted-foreground) / 0.5);
                    }
                    .xterm-viewport {
                        scrollbar-width: thin;
                        scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
                    }
                `}</style>
            </div>
        );
    },
);

ServerTerminal.displayName = 'ServerTerminal';

export default ServerTerminal;
