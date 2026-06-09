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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
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
    Sparkles,
    Copy,
    AlertCircle,
    MoreHorizontal,
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    CONSOLE_PRESET_TEMPLATES,
    type ConsolePresetMenuGroup,
    type ConsolePresetTemplate,
} from '@/components/server/consolePresetRules';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const PRESET_MENU_SECTIONS: { group: ConsolePresetMenuGroup; presets: ConsolePresetTemplate[] }[] = [
    { group: 'redact', presets: CONSOLE_PRESET_TEMPLATES.filter((p) => p.menuGroup === 'redact') },
    { group: 'highlight', presets: CONSOLE_PRESET_TEMPLATES.filter((p) => p.menuGroup === 'highlight') },
];

interface QuickRulesListProps {
    filters: ConsoleFilterRule[];
    onAddPreset: (presetId: string) => void;
    onSelect?: () => void;
}

function QuickRulesList({ filters, onAddPreset, onSelect }: QuickRulesListProps) {
    const { t } = useTranslation();

    return (
        <div className='custom-scrollbar max-h-[min(24rem,60dvh)] overflow-y-auto p-1.5 sm:max-h-72'>
            {PRESET_MENU_SECTIONS.map(({ group, presets }, sectionIdx) => (
                <div key={group}>
                    {sectionIdx > 0 && <div className='bg-border/60 my-1 h-px' role='separator' />}
                    <p className='text-muted-foreground px-2 py-1 text-[10px] font-bold tracking-wide uppercase'>
                        {t(`servers.console.terminal.preset_group_${group}`)}
                    </p>
                    {presets.map((preset) => {
                        const taken = filters.some((r) => r.presetId === preset.presetId);
                        return (
                            <button
                                key={preset.presetId}
                                type='button'
                                disabled={taken}
                                title={t(`servers.console.terminal.presets.${preset.presetId}.desc`)}
                                onClick={() => {
                                    if (!taken) {
                                        onAddPreset(preset.presetId);
                                        onSelect?.();
                                    }
                                }}
                                className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                                    taken
                                        ? 'text-muted-foreground cursor-not-allowed opacity-60'
                                        : 'text-foreground hover:bg-muted/80 active:bg-primary/10',
                                )}
                            >
                                <span className='min-w-0 flex-1 truncate font-medium'>
                                    {t(`servers.console.terminal.presets.${preset.presetId}.title`)}
                                </span>
                                {taken && (
                                    <span className='text-primary shrink-0 text-[10px] font-bold uppercase'>
                                        {t('servers.console.terminal.preset_active')}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

interface CommandHistoryListProps {
    commandHistory: string[];
    onSelect: (cmd: string) => void;
}

function CommandHistoryList({ commandHistory, onSelect }: CommandHistoryListProps) {
    const { t } = useTranslation();

    if (commandHistory.length === 0) {
        return (
            <div className='text-muted-foreground px-3 py-8 text-center text-xs'>
                {t('servers.console.terminal.no_history')}
            </div>
        );
    }

    return (
        <div className='custom-scrollbar max-h-[min(20rem,50dvh)] overflow-y-auto p-1 sm:max-h-60'>
            {commandHistory.map((cmd, idx) => (
                <button
                    key={idx}
                    type='button'
                    onClick={() => onSelect(cmd)}
                    className='hover:bg-muted/80 active:bg-primary/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors'
                >
                    <Clock className='h-3 w-3 opacity-50' />
                    <span className='truncate font-mono text-xs'>{cmd}</span>
                </button>
            ))}
        </div>
    );
}

interface FilterSettingsPanelProps {
    filters: ConsoleFilterRule[];
    onFiltersChange?: (rules: ConsoleFilterRule[]) => void;
    onAddFilter: () => void;
    onUpdateFilter: (id: string, partial: Partial<ConsoleFilterRule>) => void;
    onDeleteFilter: (id: string) => void;
}

function FilterSettingsPanel({
    filters,
    onFiltersChange,
    onAddFilter,
    onUpdateFilter,
    onDeleteFilter,
}: FilterSettingsPanelProps) {
    const { t } = useTranslation();

    return (
        <>
            <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                    <p className='text-foreground text-xs font-semibold'>{t('servers.console.terminal.customize')}</p>
                    <p className='text-muted-foreground mt-1 max-w-2xl text-[11px] leading-relaxed'>
                        {t('servers.console.terminal.rules_intro')}
                    </p>
                </div>
                <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='shrink-0 rounded-xl font-bold'
                    onClick={onAddFilter}
                    disabled={!onFiltersChange}
                >
                    {t('servers.console.terminal.add_rule')}
                </Button>
            </div>
            {filters.length === 0 ? (
                <p className='text-muted-foreground text-xs'>{t('servers.console.terminal.no_rules')}</p>
            ) : (
                <div className='custom-scrollbar max-h-[min(24rem,55dvh)] space-y-3 overflow-y-auto pr-1 sm:max-h-72'>
                    {filters.map((rule) => (
                        <div
                            key={rule.id}
                            className='border-border/50 bg-card/50 space-y-2.5 rounded-xl border p-4 backdrop-blur-sm'
                        >
                            {rule.presetId && (
                                <div className='flex flex-wrap items-center gap-2'>
                                    <span className='bg-primary/12 text-primary inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                                        {t('servers.console.terminal.preset_badge')}
                                    </span>
                                    <span className='text-foreground text-xs font-medium'>
                                        {t(`servers.console.terminal.presets.${rule.presetId}.title`)}
                                    </span>
                                </div>
                            )}
                            <div className='flex items-center justify-between gap-2'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <input
                                        type='checkbox'
                                        checked={rule.enabled}
                                        onChange={(e) =>
                                            onUpdateFilter(rule.id, {
                                                enabled: e.target.checked,
                                            })
                                        }
                                        className='border-input h-3.5 w-3.5 rounded'
                                        disabled={!onFiltersChange}
                                    />
                                    <select
                                        value={rule.type}
                                        onChange={(e) =>
                                            onUpdateFilter(rule.id, {
                                                type: e.target.value as ConsoleFilterRule['type'],
                                                presetId: undefined,
                                            })
                                        }
                                        className='border-border bg-background rounded-md border px-2 py-1 text-xs'
                                        disabled={!onFiltersChange}
                                    >
                                        <option value='replace'>
                                            {t('servers.console.terminal.rule_type_replace')}
                                        </option>
                                        <option value='hide'>{t('servers.console.terminal.rule_type_hide')}</option>
                                        <option value='color'>{t('servers.console.terminal.rule_type_color')}</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => onDeleteFilter(rule.id)}
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
                                            onUpdateFilter(rule.id, {
                                                pattern: e.target.value,
                                                presetId: undefined,
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
                                            onUpdateFilter(rule.id, {
                                                flags: e.target.value,
                                                presetId: undefined,
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
                                            onUpdateFilter(rule.id, {
                                                replacement: e.target.value,
                                                presetId: undefined,
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
                                            onUpdateFilter(rule.id, {
                                                color: e.target.value as ConsoleFilterRule['color'],
                                                presetId: undefined,
                                            })
                                        }
                                        className='border-border bg-background rounded-md border px-2 py-1 text-xs'
                                        disabled={!onFiltersChange}
                                    >
                                        <option value='red'>{t('servers.console.terminal.color_red')}</option>
                                        <option value='yellow'>{t('servers.console.terminal.color_yellow')}</option>
                                        <option value='green'>{t('servers.console.terminal.color_green')}</option>
                                        <option value='blue'>{t('servers.console.terminal.color_blue')}</option>
                                        <option value='magenta'>{t('servers.console.terminal.color_magenta')}</option>
                                        <option value='cyan'>{t('servers.console.terminal.color_cyan')}</option>
                                        <option value='gray'>{t('servers.console.terminal.color_gray')}</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

export interface ServerTerminalRef {
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
}

export interface ConsoleFilterRule {
    id: string;
    /** When set, this rule came from a built-in preset (shown with a friendly label). */
    presetId?: string;
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
        const showScrollButtonRef = useRef(false);
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
        const [showQuickRules, setShowQuickRules] = useState(false);
        const [showHistory, setShowHistory] = useState(false);

        const hslFromVar = useCallback((name: string, fallback: string) => {
            if (typeof window === 'undefined') return fallback;
            const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            return raw ? `hsl(${raw})` : fallback;
        }, []);

        const hslaFromVar = useCallback((name: string, alpha: number, fallback: string) => {
            if (typeof window === 'undefined') return fallback;
            const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            return raw ? `hsl(${raw} / ${alpha})` : fallback;
        }, []);

        /**
         * Slightly lifted vs `--card` (dark: card 9% vs secondary 15%) so logs are not pure black
         * while staying in the same design tokens as the rest of FeatherPanel.
         */
        const terminalBufferBackground = useCallback(() => {
            return hslFromVar('--secondary', 'hsl(0 0% 15%)');
        }, [hslFromVar]);

        const applyTerminalTheme = useCallback(
            (terminal: Terminal) => {
                const monoRaw = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-mono').trim();
                const fontStack = monoRaw
                    ? `${monoRaw}, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
                    : 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

                const bufBg = terminalBufferBackground();
                terminal.options.fontFamily = fontStack;
                terminal.options.theme = {
                    background: bufBg,
                    foreground: hslFromVar('--foreground', '#f4f4f5'),
                    cursor: hslFromVar('--primary', '#a78bfa'),
                    selectionBackground: hslaFromVar('--primary', 0.4, 'rgba(167, 139, 250, 0.4)'),
                    selectionForeground: hslFromVar('--foreground', '#f4f4f5'),
                };
                terminal.refresh(0, terminal.rows - 1);
            },
            [hslFromVar, hslaFromVar, terminalBufferBackground],
        );

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

            const secRaw = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim();
            const initialBg = secRaw ? `hsl(${secRaw})` : 'hsl(0 0% 15%)';

            const terminal = new Terminal({
                cursorBlink: false,
                fontSize: 13,
                lineHeight: 1.35,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                theme: {
                    background: initialBg,
                    foreground: '#e4e4e7',
                    cursor: '#a78bfa',
                    selectionBackground: 'rgba(167, 139, 250, 0.2)',
                },
                scrollback: 10000,
                allowProposedApi: true,
                allowTransparency: false,
                disableStdin: true,
            });

            const fitAddon = new FitAddon();
            const webLinksAddon = new WebLinksAddon();
            const clipboardAddon = new ClipboardAddon();

            terminal.loadAddon(fitAddon);
            terminal.loadAddon(webLinksAddon);
            terminal.loadAddon(clipboardAddon);

            terminal.open(terminalRef.current);
            fitAddon.fit();
            applyTerminalTheme(terminal);

            terminalInstanceRef.current = terminal;
            fitAddonRef.current = fitAddon;

            const themeObserver = new MutationObserver(() => {
                applyTerminalTheme(terminal);
            });
            themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class'],
            });

            terminal.attachCustomKeyEventHandler((e) => {
                if (e.ctrlKey && e.code === 'KeyC' && terminal.hasSelection()) {
                    return false;
                }
                return true;
            });

            terminal.onScroll(() => {
                const isAtBottom = terminal.buffer.active.viewportY === terminal.buffer.active.baseY;
                const next = !isAtBottom;
                if (showScrollButtonRef.current !== next) {
                    showScrollButtonRef.current = next;
                    setShowScrollButton(next);
                }
            });

            const handleResize = () => {
                fitAddon.fit();
            };
            window.addEventListener('resize', handleResize);

            return () => {
                themeObserver.disconnect();
                window.removeEventListener('resize', handleResize);
                terminal.dispose();
            };
        }, [applyTerminalTheme]);

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
            setShowHistory(false);
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

        const handleAddPreset = (presetId: string) => {
            if (!onFiltersChange) return;
            const def = CONSOLE_PRESET_TEMPLATES.find((p) => p.presetId === presetId);
            if (!def) return;
            if (filters.some((r) => r.presetId === presetId)) {
                toast.message(t('servers.console.terminal.preset_duplicate'));
                return;
            }
            const newRule: ConsoleFilterRule = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                presetId: def.presetId,
                pattern: def.pattern,
                flags: def.flags,
                type: def.type,
                replacement: def.replacement,
                color: def.color,
                enabled: true,
            };
            onFiltersChange([newRule, ...filters]);
            setShowSettings(true);
            setShowQuickRules(false);
        };

        const copyTerminalSelection = () => {
            const term = terminalInstanceRef.current;
            if (!term) return;
            const text = term.getSelection();
            if (!text?.trim()) {
                toast.message(t('servers.console.terminal.nothing_to_copy'));
                return;
            }
            void navigator.clipboard.writeText(text);
            toast.success(t('servers.console.terminal.copied_selection'));
        };

        const handlePopoutWindow = () => {
            if (typeof window === 'undefined') return;
            const url = new URL(window.location.href);
            url.searchParams.set('consolePopout', '1');
            window.open(url.toString(), '_blank', 'noopener,noreferrer,width=1200,height=800');
        };

        const canSend = canSendCommands && (serverStatus === 'running' || serverStatus === 'starting');

        const prevCanSendRef = useRef(false);
        useEffect(() => {
            if (prevCanSendRef.current && !canSend) {
                setCommandInput('');
                setHistoryIndex(-1);
            }
            prevCanSendRef.current = canSend;
        }, [canSend]);

        useEffect(() => {
            fitAddonRef.current?.fit();
        }, [showSettings, showQuickRules, showHistory]);

        return (
            <Card className='border-border/50 bg-card/50 w-full min-w-0 overflow-hidden shadow-sm backdrop-blur-xl'>
                <CardHeader className='border-border/50 space-y-3 border-b p-3 sm:p-4'>
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                        <div className='min-w-0'>
                            <h3 className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
                                <TerminalIcon className='h-4 w-4 shrink-0' aria-hidden />
                                {t('servers.console.terminal.title')}
                            </h3>
                            <p className='text-muted-foreground mt-1 hidden max-w-2xl text-xs leading-relaxed sm:block'>
                                {t('servers.console.terminal.subtitle')}
                            </p>
                        </div>
                        <div className='border-border/50 bg-muted/25 flex w-full flex-wrap items-center gap-1 rounded-lg border p-1 sm:w-auto lg:justify-end'>
                            <label
                                className={cn(
                                    'border-border/50 text-muted-foreground hover:bg-muted/50 flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-[11px] font-semibold transition-colors',
                                    autoScroll && 'border-border bg-muted/60 text-foreground',
                                )}
                            >
                                <input
                                    type='checkbox'
                                    checked={autoScroll}
                                    onChange={(e) => setAutoScroll(e.target.checked)}
                                    className='border-input bg-background text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer rounded border focus:ring-2 focus:ring-offset-0'
                                />
                                <span className='select-none'>{t('servers.console.terminal.auto_scroll')}</span>
                            </label>
                            <span className='bg-border/60 mx-0.5 hidden h-6 w-px sm:block' aria-hidden />
                            <Button
                                type='button'
                                variant={showSettings ? 'secondary' : 'ghost'}
                                size='icon'
                                className='h-8 w-8 shrink-0 rounded-lg'
                                onClick={() => setShowSettings((prev) => !prev)}
                                aria-label={t('servers.console.terminal.customize')}
                                aria-pressed={showSettings}
                            >
                                <Settings2 className='h-3.5 w-3.5' />
                            </Button>
                            {onFiltersChange && (
                                <>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='h-8 gap-1.5 rounded-lg px-2.5 text-[11px] sm:hidden'
                                        aria-label={t('servers.console.terminal.quick_rules')}
                                        onClick={() => setShowQuickRules(true)}
                                    >
                                        <Sparkles className='text-primary h-3.5 w-3.5 shrink-0' />
                                    </Button>
                                    <Menu as='div' className='relative hidden sm:block'>
                                        <Menu.Button
                                            as={Button}
                                            variant='outline'
                                            size='sm'
                                            className='h-8 gap-1.5 rounded-lg px-2.5 text-[11px]'
                                            aria-label={t('servers.console.terminal.quick_rules')}
                                        >
                                            <Sparkles className='text-primary h-3.5 w-3.5 shrink-0' />
                                            <span>{t('servers.console.terminal.quick_rules')}</span>
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
                                            <Menu.Items className='bg-popover border-border/50 absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-xl border shadow-lg focus:outline-none'>
                                                <div className='border-border/50 bg-muted/30 border-b px-3 py-2'>
                                                    <p className='text-foreground text-xs font-semibold'>
                                                        {t('servers.console.terminal.quick_rules')}
                                                    </p>
                                                    <p className='text-muted-foreground mt-0.5 text-[11px] leading-snug'>
                                                        {t('servers.console.terminal.quick_rules_help')}
                                                    </p>
                                                </div>
                                                <QuickRulesList filters={filters} onAddPreset={handleAddPreset} />
                                            </Menu.Items>
                                        </Transition>
                                    </Menu>
                                </>
                            )}
                            <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                className='h-8 w-8 shrink-0 rounded-lg sm:hidden'
                                aria-label={t('servers.console.terminal.history_title')}
                                onClick={() => setShowHistory(true)}
                            >
                                <History className='h-3.5 w-3.5' />
                            </Button>
                            <Menu as='div' className='relative hidden sm:block'>
                                <Menu.Button
                                    as={Button}
                                    variant='outline'
                                    size='icon'
                                    className='h-8 w-8 shrink-0 rounded-lg'
                                    aria-label={t('servers.console.terminal.history_title')}
                                >
                                    <History className='h-3.5 w-3.5' />
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
                                    <Menu.Items className='bg-popover border-border/50 absolute right-0 z-20 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border shadow-lg focus:outline-none'>
                                        <div className='border-border/50 bg-muted/30 border-b p-2'>
                                            <p className='text-muted-foreground px-2 text-xs font-medium'>
                                                {t('servers.console.terminal.history_title')}
                                            </p>
                                        </div>
                                        <CommandHistoryList
                                            commandHistory={commandHistory}
                                            onSelect={loadHistoryCommand}
                                        />
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    as={Button}
                                    variant='outline'
                                    size='icon'
                                    className='h-8 w-8 shrink-0 rounded-lg'
                                    aria-label={t('servers.console.terminal.more_menu')}
                                >
                                    <MoreHorizontal className='h-3.5 w-3.5' />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' className='w-52'>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.preventDefault();
                                            copyTerminalSelection();
                                        }}
                                    >
                                        <Copy className='text-muted-foreground mr-2 h-4 w-4' />
                                        {t('servers.console.terminal.copy_selection')}
                                    </DropdownMenuItem>
                                    {showPopoutButton && (
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handlePopoutWindow();
                                            }}
                                        >
                                            <ExternalLink className='text-muted-foreground mr-2 h-4 w-4' />
                                            {t('servers.console.terminal.popout')}
                                        </DropdownMenuItem>
                                    )}
                                    {onUploadLogs && (
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.preventDefault();
                                                onUploadLogs();
                                            }}
                                        >
                                            <UploadCloud className='text-muted-foreground mr-2 h-4 w-4' />
                                            {t('servers.console.upload_logs')}
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.preventDefault();
                                            clearTerminal();
                                        }}
                                        className='text-destructive focus:text-destructive'
                                    >
                                        <Trash2 className='mr-2 h-4 w-4' />
                                        {t('servers.console.terminal.clear')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>
                {showSettings && (
                    <div className='border-border/50 bg-muted/20 hidden border-b px-4 py-4 sm:block sm:px-5 sm:py-5'>
                        <FilterSettingsPanel
                            filters={filters}
                            onFiltersChange={onFiltersChange}
                            onAddFilter={handleAddFilter}
                            onUpdateFilter={handleUpdateFilter}
                            onDeleteFilter={handleDeleteFilter}
                        />
                    </div>
                )}
                <CardContent className='relative z-0 p-0'>
                    <div className='relative isolate'>
                        <div
                            ref={terminalRef}
                            className={
                                fullHeight
                                    ? 'h-[calc(100dvh-132px)] w-full'
                                    : 'h-[min(22rem,calc(100dvh-12rem))] w-full sm:h-[min(48rem,68vh)] 2xl:h-[min(58rem,72vh)]'
                            }
                        />
                        {showScrollButton && (
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={scrollToBottom}
                                className='absolute top-3 right-3 z-10 gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold'
                            >
                                <ChevronDown className='h-4 w-4' />
                                <span className='hidden sm:inline'>{t('servers.console.terminal.scroll_bottom')}</span>
                            </Button>
                        )}
                    </div>
                </CardContent>
                {onSendCommand && (
                    <CardFooter className='border-border/50 bg-muted/10 flex w-full min-w-0 flex-col items-stretch gap-2 border-t px-3 py-2 sm:px-4 sm:py-2.5'>
                        <div className='flex w-full min-w-0 items-center gap-2'>
                            <Input
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
                                className='focus:ring-primary/15 h-9 min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-xs font-semibold shadow-none focus:ring-2'
                                placeholder={t('servers.console.terminal.placeholder')}
                                title={t('servers.console.terminal.input_hint')}
                                disabled={!canSend}
                            />
                            <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                className='text-primary hover:bg-primary/10 hover:text-primary border-primary/35 focus:ring-primary/15 h-9 w-9 shrink-0 rounded-lg focus:ring-2'
                                onClick={sendCommand}
                                disabled={!canSend || !commandInput.trim()}
                                aria-label={t('servers.console.terminal.send')}
                            >
                                <Send className='h-4 w-4' />
                            </Button>
                        </div>
                        {!canSendCommands && (
                            <div className='text-destructive border-destructive/20 bg-destructive/5 flex w-full min-w-0 items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium'>
                                <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden />
                                <span className='min-w-0 leading-snug'>
                                    {t('servers.console.noConsolePermissionSend')}
                                </span>
                            </div>
                        )}
                        {canSendCommands && !canSend && (
                            <div className='flex w-full min-w-0 items-start gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400'>
                                <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden />
                                <span className='min-w-0 leading-snug'>
                                    {t('servers.console.terminal.server_running_required')}
                                </span>
                            </div>
                        )}
                    </CardFooter>
                )}

                <div className='sm:hidden'>
                    <Sheet open={showSettings} onOpenChange={setShowSettings} className='max-w-lg'>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>{t('servers.console.terminal.customize')}</SheetTitle>
                                <SheetDescription>{t('servers.console.terminal.rules_intro')}</SheetDescription>
                            </SheetHeader>
                            <FilterSettingsPanel
                                filters={filters}
                                onFiltersChange={onFiltersChange}
                                onAddFilter={handleAddFilter}
                                onUpdateFilter={handleUpdateFilter}
                                onDeleteFilter={handleDeleteFilter}
                            />
                        </SheetContent>
                    </Sheet>

                    {onFiltersChange && (
                        <Sheet open={showQuickRules} onOpenChange={setShowQuickRules} className='max-w-lg'>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>{t('servers.console.terminal.quick_rules')}</SheetTitle>
                                    <SheetDescription>
                                        {t('servers.console.terminal.quick_rules_help')}
                                    </SheetDescription>
                                </SheetHeader>
                                <QuickRulesList
                                    filters={filters}
                                    onAddPreset={handleAddPreset}
                                    onSelect={() => setShowQuickRules(false)}
                                />
                            </SheetContent>
                        </Sheet>
                    )}

                    <Sheet open={showHistory} onOpenChange={setShowHistory} className='max-w-lg'>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>{t('servers.console.terminal.history_title')}</SheetTitle>
                            </SheetHeader>
                            <CommandHistoryList commandHistory={commandHistory} onSelect={loadHistoryCommand} />
                        </SheetContent>
                    </Sheet>
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
            </Card>
        );
    },
);

ServerTerminal.displayName = 'ServerTerminal';

export default ServerTerminal;
