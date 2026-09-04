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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    ChevronRight,
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
import type { CommandSuggestRequest, CommandSuggestResponse } from '@/hooks/useWingsWebSocket';
import {
    CONSOLE_PRESET_TEMPLATES,
    type ConsolePresetMenuGroup,
    type ConsolePresetTemplate,
} from '@/components/server/consolePresetRules';
import { Button } from '@/components/featherui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { APP_MONO_FONT_STACK, resolveMonoFontFamily } from '@/lib/mono-font';

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

interface SuggestionMenuState {
    suggestions: string[];
    prefix: string;
    suffix: string;
    highlight: number;
}

function completionPartial(menu: SuggestionMenuState, line: string): string {
    const end = line.length - menu.suffix.length;
    return line.slice(menu.prefix.length, Math.max(menu.prefix.length, end));
}

function completionGhostRemainder(menu: SuggestionMenuState, line: string): string {
    const partial = completionPartial(menu, line);
    const choice = menu.suggestions[menu.highlight];
    if (!choice || !partial) {
        return '';
    }
    if (choice.toLowerCase().startsWith(partial.toLowerCase())) {
        return choice.slice(partial.length);
    }
    return '';
}

function CompletionSuggestionLabel({ suggestion, partial }: { suggestion: string; partial: string }) {
    if (partial && suggestion.toLowerCase().startsWith(partial.toLowerCase())) {
        return (
            <>
                <span className='text-primary font-semibold'>{suggestion.slice(0, partial.length)}</span>
                <span className='text-foreground/85'>{suggestion.slice(partial.length)}</span>
            </>
        );
    }
    return <span className='text-foreground/85'>{suggestion}</span>;
}

interface ConsoleCompletionMenuProps {
    menu: SuggestionMenuState;
    commandInput: string;
    listRef: React.RefObject<HTMLDivElement | null>;
    onHighlight: (index: number) => void;
    onSelect: (choice: string) => void;
    t: (key: string, params?: Record<string, string>) => string;
}

function ConsoleCompletionMenu({ menu, commandInput, listRef, onHighlight, onSelect, t }: ConsoleCompletionMenuProps) {
    const partial = completionPartial(menu, commandInput);
    const visible = menu.suggestions.slice(0, 40);
    const total = menu.suggestions.length;
    const truncated = total > visible.length;

    return (
        <div
            className='border-border/60 bg-popover/95 animate-in fade-in-0 slide-in-from-bottom-1 absolute right-0 bottom-full left-0 z-20 mb-2 overflow-hidden rounded-xl border shadow-xl backdrop-blur-md duration-150'
            role='listbox'
            aria-label={t('servers.console.terminal.completions')}
        >
            <div className='border-border/50 bg-muted/25 flex items-center gap-2 border-b px-3 py-2'>
                <div className='bg-primary/12 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-md'>
                    <Sparkles className='h-3.5 w-3.5' aria-hidden />
                </div>
                <span className='text-foreground min-w-0 flex-1 truncate text-xs font-semibold'>
                    {t('servers.console.terminal.completions')}
                </span>
                <Badge variant='secondary' className='h-5 shrink-0 rounded-md px-1.5 text-[10px] font-bold'>
                    {t('servers.console.terminal.completions_count', { count: String(total) })}
                </Badge>
            </div>
            <div ref={listRef} className='custom-scrollbar max-h-44 overflow-y-auto p-1'>
                {visible.map((suggestion, index) => {
                    const selected = index === menu.highlight;
                    return (
                        <button
                            key={`${suggestion}-${index}`}
                            type='button'
                            role='option'
                            aria-selected={selected}
                            data-completion-selected={selected ? 'true' : undefined}
                            className={cn(
                                'group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-mono text-xs transition-colors',
                                selected
                                    ? 'bg-primary/12 text-foreground ring-primary/25 ring-1'
                                    : 'hover:bg-muted/70 text-foreground/90',
                            )}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelect(suggestion);
                            }}
                            onMouseEnter={() => onHighlight(index)}
                        >
                            <span
                                className={cn(
                                    'bg-primary h-4 w-0.5 shrink-0 rounded-full transition-opacity',
                                    selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                                )}
                                aria-hidden
                            />
                            <span className='min-w-0 flex-1 truncate'>
                                <CompletionSuggestionLabel suggestion={suggestion} partial={partial} />
                            </span>
                            <ChevronRight
                                className={cn(
                                    'text-primary h-3.5 w-3.5 shrink-0 transition-all',
                                    selected
                                        ? 'translate-x-0 opacity-100'
                                        : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-50',
                                )}
                                aria-hidden
                            />
                        </button>
                    );
                })}
                {truncated && (
                    <p className='text-muted-foreground px-2.5 py-1.5 text-[10px] font-medium'>
                        {t('servers.console.terminal.completions_more', { count: String(total - visible.length) })}
                    </p>
                )}
            </div>
            <div className='border-border/50 bg-muted/15 text-muted-foreground hidden items-center gap-2 border-t px-3 py-2 text-[10px] sm:flex'>
                <kbd className='border-border/60 bg-background/70 rounded border px-1.5 py-0.5 font-mono'>Tab</kbd>
                <span>{t('servers.console.terminal.completions_hint_cycle')}</span>
                <kbd className='border-border/60 bg-background/70 rounded border px-1.5 py-0.5'>↑↓</kbd>
                <span>{t('servers.console.terminal.completions_hint_navigate')}</span>
                <kbd className='border-border/60 bg-background/70 rounded border px-1.5 py-0.5'>↵</kbd>
                <span>{t('servers.console.terminal.completions_hint_accept')}</span>
                <kbd className='border-border/60 bg-background/70 ml-auto rounded border px-1.5 py-0.5'>Esc</kbd>
                <span>{t('servers.console.terminal.completions_hint_close')}</span>
            </div>
        </div>
    );
}

interface FilterSettingsPanelProps {
    filters: ConsoleFilterRule[];
    onFiltersChange?: (rules: ConsoleFilterRule[]) => void;
    onAddFilter: () => void;
    onUpdateFilter: (id: string, partial: Partial<ConsoleFilterRule>) => void;
    onDeleteFilter: (id: string) => void;
    /** Hide the title/intro when the parent already shows them (e.g. mobile sheet). */
    showIntro?: boolean;
}

function FilterSettingsPanel({
    filters,
    onFiltersChange,
    onAddFilter,
    onUpdateFilter,
    onDeleteFilter,
    showIntro = true,
}: FilterSettingsPanelProps) {
    const { t } = useTranslation();

    return (
        <>
            <div
                className={cn(
                    'mb-3 flex gap-2',
                    showIntro ? 'flex-col sm:flex-row sm:items-start sm:justify-between' : 'items-center justify-end',
                )}
            >
                {showIntro && (
                    <div>
                        <p className='text-foreground text-xs font-semibold'>
                            {t('servers.console.terminal.customize')}
                        </p>
                        <p className='text-muted-foreground mt-1 max-w-2xl text-[11px] leading-relaxed'>
                            {t('servers.console.terminal.rules_intro')}
                        </p>
                    </div>
                )}
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
    applyCommandSuggestions: (response: CommandSuggestResponse) => void;
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
    /** Request Wings console Tab completions for the current input line. */
    onSuggestCommand?: (request: CommandSuggestRequest) => void;
    canSendCommands?: boolean;
    serverStatus?: string;
    filters?: ConsoleFilterRule[];
    onFiltersChange?: (rules: ConsoleFilterRule[]) => void;
    fullHeight?: boolean;
    fillContainer?: boolean;
    showPopoutButton?: boolean;
    onUploadLogs?: () => void;
    subtitle?: string;
}

const ServerTerminal = React.forwardRef<ServerTerminalRef, ServerTerminalProps>(
    (
        {
            onSendCommand,
            onSuggestCommand,
            canSendCommands = false,
            serverStatus = 'offline',
            filters = [],
            onFiltersChange,
            fullHeight = false,
            fillContainer = false,
            showPopoutButton = true,
            onUploadLogs,
            subtitle,
        },
        ref,
    ) => {
        const terminalRef = useRef<HTMLDivElement>(null);
        const terminalInstanceRef = useRef<Terminal | null>(null);
        const fitAddonRef = useRef<FitAddon | null>(null);
        const showScrollButtonRef = useRef(false);
        const autoScrollRef = useRef(true);
        const followOutputRef = useRef(true);
        const commandInputRef = useRef<HTMLInputElement | null>(null);
        const completionListRef = useRef<HTMLDivElement | null>(null);
        const pendingSuggestIdRef = useRef<string | null>(null);
        const acceptOnSuggestRef = useRef(false);
        const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const applyingCompletionRef = useRef(false);
        const { t } = useTranslation();
        const [commandInput, setCommandInput] = useState('');
        const [suggestionMenu, setSuggestionMenu] = useState<{
            suggestions: string[];
            prefix: string;
            suffix: string;
            highlight: number;
        } | null>(null);
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
        // Sheet portals to body, so CSS sm:hidden cannot hide it — gate open state instead.
        const [isNarrowViewport, setIsNarrowViewport] = useState(false);

        autoScrollRef.current = autoScroll;

        useEffect(() => {
            const mediaQuery = window.matchMedia('(max-width: 639px)');
            const update = () => setIsNarrowViewport(mediaQuery.matches);
            update();
            mediaQuery.addEventListener('change', update);
            return () => mediaQuery.removeEventListener('change', update);
        }, []);

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
                const monoRaw = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim();
                const fontStack = resolveMonoFontFamily(monoRaw);

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

        const fitTerminal = useCallback(() => {
            const host = terminalRef.current;
            const fitAddon = fitAddonRef.current;
            if (!host || !fitAddon) return;
            // FitAddon parseInt(getComputedStyle.width) treats unresolved "100%" as 100px.
            // Skip until the host has a real pixel width.
            if (host.clientWidth < 50) return;
            try {
                fitAddon.fit();
            } catch {
                // ignore fit errors during teardown / layout thrash
            }
        }, []);

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
            if (autoScroll) {
                followOutputRef.current = true;
                terminalInstanceRef.current?.scrollToBottom();
            }
        }, [autoScroll]);

        const saveToHistory = (cmd: string) => {
            const newHistory = [cmd, ...commandHistory.filter((c) => c !== cmd)].slice(0, 50);
            setCommandHistory(newHistory);
            localStorage.setItem('featherpanel_terminal_history', JSON.stringify(newHistory));
        };

        const maybeFollowOutput = useCallback(() => {
            if (autoScrollRef.current && followOutputRef.current && terminalInstanceRef.current) {
                terminalInstanceRef.current.scrollToBottom();
            }
        }, []);

        const applyCompletionChoice = useCallback((prefix: string, suffix: string, choice: string) => {
            let insert = choice;
            if (
                suffix === '' &&
                !prefix.endsWith(' ') &&
                !choice.startsWith('/') &&
                prefix.length > 0 &&
                !choice.startsWith(prefix)
            ) {
                insert = ` ${choice}`;
            }
            const next = prefix + insert + suffix;
            applyingCompletionRef.current = true;
            setCommandInput(next);
            setSuggestionMenu(null);
            requestAnimationFrame(() => {
                const el = commandInputRef.current;
                if (el) {
                    const pos = prefix.length + insert.length;
                    el.focus();
                    el.setSelectionRange(pos, pos);
                }
                applyingCompletionRef.current = false;
            });
        }, []);

        const applyCommandSuggestions = useCallback((response: CommandSuggestResponse) => {
            if (!response.id || response.id !== pendingSuggestIdRef.current) {
                return;
            }
            pendingSuggestIdRef.current = null;

            const suggestions = response.suggestions ?? [];
            if (suggestions.length === 0) {
                setSuggestionMenu(null);
                acceptOnSuggestRef.current = false;
                return;
            }

            setCommandInput((current) => {
                if (current !== response.line) {
                    acceptOnSuggestRef.current = false;
                    return current;
                }

                const start = Math.max(0, Math.min(response.start, response.line.length));
                const end = Math.max(start, Math.min(response.end, response.line.length));
                const prefix = response.line.slice(0, start);
                const suffix = response.line.slice(end);

                if (acceptOnSuggestRef.current) {
                    acceptOnSuggestRef.current = false;
                    let insert = suggestions[0];
                    if (
                        suffix === '' &&
                        !prefix.endsWith(' ') &&
                        !insert.startsWith('/') &&
                        prefix.length > 0 &&
                        !insert.startsWith(prefix)
                    ) {
                        insert = ` ${insert}`;
                    }
                    const next = prefix + insert + suffix;
                    applyingCompletionRef.current = true;
                    setSuggestionMenu(null);
                    requestAnimationFrame(() => {
                        const el = commandInputRef.current;
                        if (el) {
                            const pos = prefix.length + insert.length;
                            el.focus();
                            el.setSelectionRange(pos, pos);
                        }
                        applyingCompletionRef.current = false;
                    });
                    return next;
                }

                setSuggestionMenu({
                    suggestions,
                    prefix,
                    suffix,
                    highlight: 0,
                });
                return current;
            });
        }, []);

        React.useImperativeHandle(
            ref,
            () => ({
                write: (data: string) => {
                    if (terminalInstanceRef.current) {
                        terminalInstanceRef.current.write(data);
                        maybeFollowOutput();
                    }
                },
                writeln: (data: string) => {
                    if (terminalInstanceRef.current) {
                        terminalInstanceRef.current.writeln(data);
                        maybeFollowOutput();
                    }
                },
                clear: () => {
                    if (terminalInstanceRef.current) {
                        terminalInstanceRef.current.clear();
                    }
                },
                applyCommandSuggestions,
            }),
            [maybeFollowOutput, applyCommandSuggestions],
        );

        useEffect(() => {
            if (!terminalRef.current) return;

            const secRaw = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim();
            const initialBg = secRaw ? `hsl(${secRaw})` : 'hsl(0 0% 15%)';

            const terminal = new Terminal({
                cursorBlink: false,
                fontSize: 13,
                lineHeight: 1.35,
                fontFamily: APP_MONO_FONT_STACK,
                theme: {
                    background: initialBg,
                    foreground: '#e4e4e7',
                    cursor: '#a78bfa',
                    selectionBackground: 'rgba(167, 139, 250, 0.2)',
                },
                scrollback: 10000,
                // Avoid smooth scrollbar animation fighting touch pans / live output.
                smoothScrollDuration: 0,
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
            terminalInstanceRef.current = terminal;
            fitAddonRef.current = fitAddon;

            applyTerminalTheme(terminal);

            // Defer fit until layout has a real pixel width (avoids FitAddon "100%" → 100px on mobile)
            let fitRaf1 = 0;
            let fitRaf2 = 0;
            fitRaf1 = requestAnimationFrame(() => {
                fitRaf2 = requestAnimationFrame(() => {
                    fitTerminal();
                });
            });

            void document.fonts?.ready?.then(() => {
                fitTerminal();
            });

            const themeObserver = new MutationObserver(() => {
                applyTerminalTheme(terminal);
                fitTerminal();
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
                // Pause following live output while reading history; resume at bottom if auto-scroll is on.
                followOutputRef.current = isAtBottom && autoScrollRef.current;
                const next = !isAtBottom;
                if (showScrollButtonRef.current !== next) {
                    showScrollButtonRef.current = next;
                    setShowScrollButton(next);
                }
            });

            // xterm v6 only wires mouse-wheel scrolling; map touch pans so mobile can scroll
            // the buffer without dragging the page behind the console.
            const host = terminalRef.current;
            let touchLastY = 0;
            let touchActive = false;

            const onTouchStart = (e: TouchEvent) => {
                if (e.touches.length !== 1) {
                    touchActive = false;
                    return;
                }
                touchLastY = e.touches[0].clientY;
                touchActive = true;
            };

            const onTouchMove = (e: TouchEvent) => {
                if (!touchActive || e.touches.length !== 1) return;
                const y = e.touches[0].clientY;
                const dy = y - touchLastY;
                if (dy === 0) return;
                touchLastY = y;

                // Keep the page from scrolling while the finger is over the terminal.
                e.preventDefault();

                const rows = Math.max(terminal.rows, 1);
                const cellHeight = host.clientHeight / rows || 14;
                // Finger down → reveal older lines (negative scrollLines).
                terminal.scrollLines(-dy / cellHeight);
            };

            const onTouchEnd = () => {
                touchActive = false;
            };

            host.addEventListener('touchstart', onTouchStart, { passive: true });
            host.addEventListener('touchmove', onTouchMove, { passive: false });
            host.addEventListener('touchend', onTouchEnd);
            host.addEventListener('touchcancel', onTouchEnd);

            const handleResize = () => {
                fitTerminal();
            };
            window.addEventListener('resize', handleResize);

            const resizeObserver = new ResizeObserver(() => {
                fitTerminal();
            });
            resizeObserver.observe(terminalRef.current);

            return () => {
                cancelAnimationFrame(fitRaf1);
                cancelAnimationFrame(fitRaf2);
                themeObserver.disconnect();
                resizeObserver.disconnect();
                window.removeEventListener('resize', handleResize);
                host.removeEventListener('touchstart', onTouchStart);
                host.removeEventListener('touchmove', onTouchMove);
                host.removeEventListener('touchend', onTouchEnd);
                host.removeEventListener('touchcancel', onTouchEnd);
                terminal.dispose();
                terminalInstanceRef.current = null;
                fitAddonRef.current = null;
            };
        }, [applyTerminalTheme, fitTerminal]);

        const sendCommand = () => {
            if (!commandInput.trim() || !onSendCommand) return;

            saveToHistory(commandInput);
            setHistoryIndex(-1);
            setSuggestionMenu(null);
            pendingSuggestIdRef.current = null;
            acceptOnSuggestRef.current = false;

            onSendCommand(commandInput);

            setCommandInput('');
        };

        const clearTerminal = () => {
            if (terminalInstanceRef.current) {
                terminalInstanceRef.current.clear();
            }
        };

        const scrollToBottom = () => {
            followOutputRef.current = autoScrollRef.current;
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

        const requestSuggestions = useCallback(
            (line: string, cursor: number, acceptFirst: boolean) => {
                if (!onSuggestCommand || !canSend) return;
                const id =
                    typeof crypto !== 'undefined' && crypto.randomUUID
                        ? crypto.randomUUID()
                        : `suggest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                pendingSuggestIdRef.current = id;
                acceptOnSuggestRef.current = acceptFirst;
                onSuggestCommand({ id, line, cursor });
            },
            [onSuggestCommand, canSend],
        );

        const requestTabCompletion = () => {
            if (!onSuggestCommand || !canSend) return;

            if (suggestionMenu && suggestionMenu.suggestions.length > 0) {
                if (suggestionMenu.suggestions.length > 1) {
                    setSuggestionMenu((menu) => {
                        if (!menu) return menu;
                        return {
                            ...menu,
                            highlight: (menu.highlight + 1) % menu.suggestions.length,
                        };
                    });
                    return;
                }
                applyCompletionChoice(suggestionMenu.prefix, suggestionMenu.suffix, suggestionMenu.suggestions[0]);
                return;
            }

            const el = commandInputRef.current;
            const cursor = el?.selectionStart ?? commandInput.length;
            requestSuggestions(commandInput, cursor, true);
        };

        // Live suggestions while typing (Minecraft `/` commands and any egg tree).
        useEffect(() => {
            if (!onSuggestCommand || !canSend || applyingCompletionRef.current) {
                return;
            }
            if (suggestDebounceRef.current) {
                clearTimeout(suggestDebounceRef.current);
            }
            const line = commandInput;
            if (!line.trim()) {
                setSuggestionMenu(null);
                return;
            }
            suggestDebounceRef.current = setTimeout(() => {
                const el = commandInputRef.current;
                const cursor = el?.selectionStart ?? line.length;
                requestSuggestions(line, cursor, false);
            }, 120);
            return () => {
                if (suggestDebounceRef.current) {
                    clearTimeout(suggestDebounceRef.current);
                }
            };
        }, [commandInput, canSend, onSuggestCommand, requestSuggestions]);

        useEffect(() => {
            if (!suggestionMenu) return;
            const selected = completionListRef.current?.querySelector('[data-completion-selected="true"]');
            selected?.scrollIntoView({ block: 'nearest' });
        }, [suggestionMenu]);

        const completionGhostText = useMemo(
            () => (suggestionMenu ? completionGhostRemainder(suggestionMenu, commandInput) : ''),
            [suggestionMenu, commandInput],
        );

        const prevCanSendRef = useRef(false);
        useEffect(() => {
            if (prevCanSendRef.current && !canSend) {
                setCommandInput('');
                setHistoryIndex(-1);
                setSuggestionMenu(null);
                pendingSuggestIdRef.current = null;
            }
            prevCanSendRef.current = canSend;
        }, [canSend]);

        useEffect(() => {
            fitTerminal();
        }, [showSettings, showQuickRules, showHistory, fitTerminal]);

        return (
            <Card
                className={cn(
                    'border-border/50 bg-card/50 w-full min-w-0 overflow-hidden shadow-sm backdrop-blur-xl',
                    fillContainer
                        ? 'flex min-h-0 flex-1 flex-col'
                        : 'flex h-full min-h-[22rem] flex-col sm:min-h-[26rem]',
                )}
            >
                <CardHeader className='border-border/50 shrink-0 space-y-3 border-b p-3 sm:p-4'>
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                        <div className='min-w-0'>
                            <h3 className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
                                <TerminalIcon className='h-4 w-4 shrink-0' aria-hidden />
                                {t('servers.console.terminal.title')}
                            </h3>
                            <p className='text-muted-foreground mt-1 hidden max-w-2xl text-xs leading-relaxed sm:block'>
                                {subtitle ?? t('servers.console.terminal.subtitle')}
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
                            {onSendCommand && (
                                <>
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
                                </>
                            )}
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
                <CardContent className='relative z-0 flex min-h-0 flex-1 flex-col p-0'>
                    <div className='relative isolate flex min-h-0 flex-1 flex-col'>
                        <div
                            ref={terminalRef}
                            className={
                                fullHeight
                                    ? 'bg-secondary h-[calc(100dvh-132px)] w-full min-w-0 touch-none overflow-hidden overscroll-none'
                                    : 'bg-secondary min-h-[16rem] w-full min-w-0 flex-1 touch-none overflow-hidden overscroll-none sm:min-h-[20rem]'
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
                    <CardFooter className='border-border/50 bg-card flex w-full min-w-0 shrink-0 flex-col items-stretch gap-1.5 border-t px-3 py-2 sm:px-4 sm:py-2.5'>
                        <div className='flex w-full min-w-0 items-center gap-2'>
                            <div className='relative min-w-0 flex-1'>
                                {suggestionMenu && suggestionMenu.suggestions.length > 0 && (
                                    <ConsoleCompletionMenu
                                        menu={suggestionMenu}
                                        commandInput={commandInput}
                                        listRef={completionListRef}
                                        onHighlight={(index) =>
                                            setSuggestionMenu((menu) => (menu ? { ...menu, highlight: index } : menu))
                                        }
                                        onSelect={(choice) =>
                                            applyCompletionChoice(suggestionMenu.prefix, suggestionMenu.suffix, choice)
                                        }
                                        t={t}
                                    />
                                )}
                                <div
                                    className={cn(
                                        'border-border/50 bg-muted/20 focus-within:border-primary/40 focus-within:ring-primary/15 flex h-9 w-full items-center gap-2 rounded-lg border px-2.5 transition-all focus-within:ring-2',
                                        !canSend && 'opacity-60',
                                        suggestionMenu &&
                                            suggestionMenu.suggestions.length > 0 &&
                                            'border-primary/30 ring-primary/10 ring-1',
                                    )}
                                >
                                    <span
                                        className='text-primary shrink-0 font-mono text-xs font-bold select-none'
                                        aria-hidden
                                    >
                                        &gt;
                                    </span>
                                    <div className='relative min-w-0 flex-1'>
                                        {completionGhostText && (
                                            <div
                                                className='pointer-events-none absolute inset-0 flex items-center overflow-hidden'
                                                aria-hidden
                                            >
                                                <span className='invisible truncate font-mono text-xs font-semibold whitespace-pre'>
                                                    {commandInput}
                                                </span>
                                                <span className='text-muted-foreground/35 truncate font-mono text-xs font-semibold whitespace-pre'>
                                                    {completionGhostText}
                                                </span>
                                            </div>
                                        )}
                                        <input
                                            ref={commandInputRef}
                                            value={commandInput}
                                            onChange={(e) => {
                                                if (!applyingCompletionRef.current) {
                                                    pendingSuggestIdRef.current = null;
                                                }
                                                setCommandInput(e.target.value);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Tab') {
                                                    e.preventDefault();
                                                    requestTabCompletion();
                                                    return;
                                                }
                                                if (e.key === 'Escape') {
                                                    setSuggestionMenu(null);
                                                    pendingSuggestIdRef.current = null;
                                                    return;
                                                }
                                                if (suggestionMenu && suggestionMenu.suggestions.length > 0) {
                                                    if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        setSuggestionMenu((menu) => {
                                                            if (!menu) return menu;
                                                            return {
                                                                ...menu,
                                                                highlight:
                                                                    (menu.highlight + 1) % menu.suggestions.length,
                                                            };
                                                        });
                                                        return;
                                                    }
                                                    if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        setSuggestionMenu((menu) => {
                                                            if (!menu) return menu;
                                                            const next =
                                                                (menu.highlight - 1 + menu.suggestions.length) %
                                                                menu.suggestions.length;
                                                            return { ...menu, highlight: next };
                                                        });
                                                        return;
                                                    }
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const choice =
                                                            suggestionMenu.suggestions[suggestionMenu.highlight] ??
                                                            suggestionMenu.suggestions[0];
                                                        applyCompletionChoice(
                                                            suggestionMenu.prefix,
                                                            suggestionMenu.suffix,
                                                            choice,
                                                        );
                                                        return;
                                                    }
                                                }
                                                if (e.key === 'Enter') sendCommand();
                                                if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setSuggestionMenu(null);
                                                    navigateHistory('up');
                                                }
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setSuggestionMenu(null);
                                                    navigateHistory('down');
                                                }
                                                if (e.ctrlKey && e.code === 'KeyC') {
                                                    const termHasSelection =
                                                        terminalInstanceRef.current?.hasSelection();
                                                    const target = e.target as HTMLInputElement;
                                                    const inputHasSelection =
                                                        target.selectionStart !== target.selectionEnd;

                                                    if (termHasSelection && !inputHasSelection) {
                                                        const selection = terminalInstanceRef.current?.getSelection();
                                                        if (selection) {
                                                            navigator.clipboard.writeText(selection);
                                                        }
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    } else if (
                                                        !termHasSelection &&
                                                        !inputHasSelection &&
                                                        onSendCommand
                                                    ) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onSendCommand('\x03');
                                                        setCommandInput('');
                                                        setSuggestionMenu(null);
                                                    }
                                                }
                                            }}
                                            type='text'
                                            className='text-foreground placeholder:text-muted-foreground/50 relative h-full w-full min-w-0 bg-transparent py-1.5 font-mono text-xs font-semibold outline-none'
                                            placeholder={t('servers.console.terminal.placeholder')}
                                            title={t('servers.console.terminal.input_hint')}
                                            disabled={!canSend}
                                            autoComplete='off'
                                            autoCorrect='off'
                                            spellCheck={false}
                                        />
                                    </div>
                                </div>
                            </div>
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
                    <Sheet open={showSettings && isNarrowViewport} onOpenChange={setShowSettings} className='max-w-lg'>
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
                                showIntro={false}
                            />
                        </SheetContent>
                    </Sheet>

                    {onFiltersChange && (
                        <Sheet
                            open={showQuickRules && isNarrowViewport}
                            onOpenChange={setShowQuickRules}
                            className='max-w-lg'
                        >
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

                    <Sheet open={showHistory && isNarrowViewport} onOpenChange={setShowHistory} className='max-w-lg'>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>{t('servers.console.terminal.history_title')}</SheetTitle>
                            </SheetHeader>
                            <CommandHistoryList commandHistory={commandHistory} onSelect={loadHistoryCommand} />
                        </SheetContent>
                    </Sheet>
                </div>

                <style jsx global>{`
                    .xterm {
                        width: 100% !important;
                        height: 100% !important;
                        background-color: hsl(var(--secondary)) !important;
                        touch-action: none;
                        overscroll-behavior: none;
                    }
                    .xterm-scrollable-element {
                        width: 100% !important;
                        height: 100% !important;
                        touch-action: none;
                        overscroll-behavior: none;
                    }
                    .xterm-viewport {
                        overflow-x: hidden !important;
                        background-color: hsl(var(--secondary)) !important;
                        touch-action: none;
                        overscroll-behavior: none;
                        scrollbar-width: thin;
                        scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
                    }
                    .xterm-screen {
                        background-color: hsl(var(--secondary)) !important;
                    }
                    .xterm-viewport::-webkit-scrollbar {
                        width: 8px;
                        height: 0;
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
                    .xterm .xterm-scrollable-element > .scrollbar {
                        background: transparent !important;
                    }
                    .xterm .xterm-scrollable-element > .scrollbar > .slider {
                        border-radius: 4px;
                    }
                `}</style>
            </Card>
        );
    },
);

ServerTerminal.displayName = 'ServerTerminal';

export default ServerTerminal;
