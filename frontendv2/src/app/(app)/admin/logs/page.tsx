/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import axios from 'axios';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    FileText,
    Loader2,
    RefreshCw,
    Trash2,
    Play,
    Square,
    Terminal,
    Globe,
    Cpu,
    ChevronDown,
    Search,
    X,
    ArrowDown,
    Copy,
    Check,
    HardDrive,
    Clock,
    Server,
    UploadCloud,
    ExternalLink,
    WifiOff,
} from 'lucide-react';

// Types

/** The two top-level modes the page operates in */
type ViewMode = 'panel' | 'wings';

type LogType = 'app' | 'web' | 'runner';

interface LogFile {
    name: string;
    size: number;
    modified: number;
    type: string;
}

interface LogResponse {
    success: boolean;
    data: { logs: string; file: string; type: string; lines_count: number };
    message?: string;
}

interface LogFilesResponse {
    success: boolean;
    data: { files: LogFile[] };
    message?: string;
}

interface WingsNode {
    id: number;
    name: string;
    fqdn: string;
    scheme: string;
    daemonListen: number;
}

// Helpers

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ansiLineClass(line: string): string {
    if (/\x1b\[31m|ERROR|❌|panic|fatal/i.test(line)) return 'text-red-400';
    if (/\x1b\[33m|WARN|⚠|warning/i.test(line)) return 'text-yellow-400';
    if (/\x1b\[32m|INFO|✅|🚀|📡|✨|💾|🔄|connected|started/i.test(line)) return 'text-green-400';
    if (/\x1b\[36m|DEBUG/i.test(line)) return 'text-cyan-400';
    if (/\x1b\[35m/.test(line)) return 'text-purple-400';
    return 'text-slate-300';
}

function stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Constants

const LOG_TYPE_META: Record<LogType, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
    app: { label: 'App', icon: Terminal, color: 'text-blue-400' },
    web: { label: 'Web', icon: Globe, color: 'text-emerald-400' },
    runner: { label: 'Runner', icon: Cpu, color: 'text-purple-400' },
};

const LINE_OPTIONS = [50, 100, 200, 500, 1000] as const;

// Shared terminal output component

interface TerminalOutputProps {
    loading: boolean;
    filteredLines: string[];
    searchQuery: string;
    emptyIcon: React.FC<{ className?: string }>;
    emptyIconColor: string;
    emptyLabel: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

function TerminalOutput({
    loading,
    filteredLines,
    searchQuery,
    emptyIcon: EmptyIcon,
    emptyIconColor,
    emptyLabel,
    containerRef,
}: TerminalOutputProps) {
    const { t } = useTranslation();
    const isEmpty = filteredLines.length === 0 || (filteredLines.length === 1 && filteredLines[0] === '');

    return (
        <div
            ref={containerRef}
            className='max-h-[68vh] min-h-105 overflow-auto bg-[#0d1117] p-4 font-mono text-[12px] leading-5'
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace" }}
        >
            {loading ? (
                <div className='flex items-center gap-3 py-4 text-slate-500'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>{t('admin.logs.loading')}</span>
                </div>
            ) : isEmpty ? (
                <div className='flex h-40 flex-col items-center justify-center gap-3 text-slate-600'>
                    <EmptyIcon className={cn('h-8 w-8 opacity-50', emptyIconColor)} />
                    <span className='text-sm'>{searchQuery ? t('admin.logs.filter_no_match') : emptyLabel}</span>
                </div>
            ) : (
                filteredLines.map((line, i) => {
                    const clean = stripAnsi(line);
                    const highlighted = !!searchQuery && clean.toLowerCase().includes(searchQuery.toLowerCase());
                    return (
                        <div
                            key={i}
                            className={cn(
                                'group flex rounded-sm',
                                highlighted ? 'bg-yellow-500/10 ring-1 ring-yellow-500/30' : '',
                            )}
                        >
                            <span className='w-10 shrink-0 pt-px pr-3 text-right text-[11px] text-slate-600 transition-colors select-none group-hover:text-slate-500'>
                                {i + 1}
                            </span>
                            <span className={cn('flex-1 break-all whitespace-pre-wrap', ansiLineClass(line))}>
                                {highlighted && searchQuery
                                    ? (() => {
                                          const idx = clean.toLowerCase().indexOf(searchQuery.toLowerCase());
                                          return (
                                              <>
                                                  {clean.slice(0, idx)}
                                                  <mark className='rounded-sm bg-yellow-400/30 text-yellow-200'>
                                                      {clean.slice(idx, idx + searchQuery.length)}
                                                  </mark>
                                                  {clean.slice(idx + searchQuery.length)}
                                              </>
                                          );
                                      })()
                                    : clean || <span className='text-slate-700'>&middot;</span>}
                            </span>
                        </div>
                    );
                })
            )}
        </div>
    );
}

// Search + action bar (shared)

interface SearchBarProps {
    searchQuery: string;
    onSearchChange: (v: string) => void;
    filteredCount: number;
    totalCount: number;
    autoScroll: boolean;
    onToggleAutoScroll: () => void;
    onCopy: () => void;
    copied: boolean;
    logsEmpty: boolean;
    extra?: React.ReactNode;
}

function SearchBar({
    searchQuery,
    onSearchChange,
    filteredCount,
    totalCount,
    autoScroll,
    onToggleAutoScroll,
    onCopy,
    copied,
    logsEmpty,
    extra,
}: SearchBarProps) {
    const { t } = useTranslation();
    return (
        <div className='border-border/30 bg-background/30 flex items-center gap-2 border-b px-4 py-2'>
            <div className='relative max-w-sm flex-1'>
                <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2' />
                <input
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('admin.logs.filter_placeholder')}
                    className='bg-muted/40 border-border/40 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-muted/60 h-7 w-full rounded-lg border pr-7 pl-8 font-mono text-xs transition-all focus:outline-none'
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2'
                    >
                        <X className='h-3 w-3' />
                    </button>
                )}
            </div>
            {searchQuery && (
                <span className='text-muted-foreground text-[11px] font-medium whitespace-nowrap'>
                    {t('admin.logs.filter_matches', { filtered: String(filteredCount), total: String(totalCount) })}
                </span>
            )}
            <div className='flex-1' />
            {extra}
            <button
                onClick={onToggleAutoScroll}
                className={cn(
                    'flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all',
                    autoScroll
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border/40 text-muted-foreground hover:text-foreground',
                )}
                title={t('admin.logs.auto_scroll')}
            >
                <ArrowDown className='h-3 w-3' />
                {t('admin.logs.auto_scroll')}
            </button>
            <button
                onClick={onCopy}
                disabled={logsEmpty}
                className='border-border/40 text-muted-foreground hover:text-foreground flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all disabled:opacity-40'
                title={t('admin.logs.copy')}
            >
                {copied ? <Check className='h-3 w-3 text-emerald-400' /> : <Copy className='h-3 w-3' />}
                {copied ? t('admin.logs.copied') : t('admin.logs.copy')}
            </button>
        </div>
    );
}

// Main page

export default function AdminLogsPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-logs');

    // Mode switch
    const [viewMode, setViewMode] = useState<ViewMode>('panel');

    // Panel log state
    const [panelLoading, setPanelLoading] = useState(true);
    const [panelLogs, setPanelLogs] = useState('');
    const [currentLogType, setCurrentLogType] = useState<LogType>('app');
    const [panelLines, setPanelLines] = useState(100);
    const [logFiles, setLogFiles] = useState<LogFile[]>([]);
    const [panelAutoRefresh, setPanelAutoRefresh] = useState(false);
    const [panelSearchQuery, setPanelSearchQuery] = useState('');
    const [panelAutoScroll, setPanelAutoScroll] = useState(true);
    const [panelCopied, setPanelCopied] = useState(false);
    const [lineDropdownOpen, setLineDropdownOpen] = useState(false);
    const panelRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const panelContainerRef = useRef<HTMLDivElement>(null);

    // Wings log state
    const [nodes, setNodes] = useState<WingsNode[]>([]);
    const [nodesLoading, setNodesLoading] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
    const [wingsLogs, setWingsLogs] = useState('');
    const [wingsLoading, setWingsLoading] = useState(false);
    const [wingsLines, setWingsLines] = useState(200);
    const [wingsSearchQuery, setWingsSearchQuery] = useState('');
    const [wingsAutoScroll, setWingsAutoScroll] = useState(true);
    const [wingsCopied, setWingsCopied] = useState(false);
    const [wingsAutoRefresh, setWingsAutoRefresh] = useState(false);
    const [wingsNodeDropdownOpen, setWingsNodeDropdownOpen] = useState(false);
    const [wingsLineDropdownOpen, setWingsLineDropdownOpen] = useState(false);
    const [wingsUploading, setWingsUploading] = useState(false);
    const [wingsUploadUrl, setWingsUploadUrl] = useState<string | null>(null);
    const wingsRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const wingsContainerRef = useRef<HTMLDivElement>(null);

    // Shared
    const [panelLineDropdownOpen, setPanelLineDropdownOpen] = useState(false);

    // Derived

    const panelRawLines = useMemo(() => panelLogs.split('\n'), [panelLogs]);
    const panelFilteredLines = useMemo(() => {
        if (!panelSearchQuery.trim()) return panelRawLines;
        const q = panelSearchQuery.toLowerCase();
        return panelRawLines.filter((l) => stripAnsi(l).toLowerCase().includes(q));
    }, [panelRawLines, panelSearchQuery]);

    const panelCurrentFileInfo = useMemo(
        () => logFiles.find((f) => f.type === currentLogType),
        [logFiles, currentLogType],
    );

    const wingsRawLines = useMemo(() => wingsLogs.split('\n'), [wingsLogs]);
    const wingsFilteredLines = useMemo(() => {
        if (!wingsSearchQuery.trim()) return wingsRawLines;
        const q = wingsSearchQuery.toLowerCase();
        return wingsRawLines.filter((l) => stripAnsi(l).toLowerCase().includes(q));
    }, [wingsRawLines, wingsSearchQuery]);

    const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

    // Auto-scroll effects

    const doScrollPanel = useCallback(() => {
        if (panelContainerRef.current) {
            panelContainerRef.current.scrollTop = panelContainerRef.current.scrollHeight;
        }
    }, []);

    const doScrollWings = useCallback(() => {
        if (wingsContainerRef.current) {
            wingsContainerRef.current.scrollTop = wingsContainerRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        if (panelAutoScroll) doScrollPanel();
    }, [panelFilteredLines, panelAutoScroll, doScrollPanel]);

    useEffect(() => {
        if (wingsAutoScroll) doScrollWings();
    }, [wingsFilteredLines, wingsAutoScroll, doScrollWings]);

    // Panel log actions

    const fetchLogFiles = useCallback(async () => {
        try {
            const res = await axios.get<LogFilesResponse>('/api/admin/log-viewer/files');
            if (res.data.success) setLogFiles(res.data.data.files);
        } catch {
            /* silently ignore */
        }
    }, []);

    const fetchPanelLogs = useCallback(async () => {
        setPanelLoading(true);
        try {
            const res = await axios.get<LogResponse>('/api/admin/log-viewer/get', {
                params: { type: currentLogType, lines: panelLines },
            });
            if (res.data.success) {
                setPanelLogs(res.data.data.logs);
            } else {
                toast.error(res.data.message || t('admin.logs.messages.fetch_failed'));
            }
        } catch {
            toast.error(t('admin.logs.messages.fetch_failed'));
        } finally {
            setPanelLoading(false);
        }
    }, [currentLogType, panelLines, t]);

    const clearPanelLogs = useCallback(async () => {
        try {
            const res = await axios.post<{ success: boolean; message?: string }>('/api/admin/log-viewer/clear', {
                type: currentLogType,
            });
            if (res.data.success) {
                setPanelLogs('');
                toast.success(t('admin.logs.messages.cleared'));
            } else {
                toast.error(res.data.message || t('admin.logs.messages.clear_failed'));
            }
        } catch {
            toast.error(t('admin.logs.messages.clear_failed'));
        }
    }, [currentLogType, t]);

    const copyPanelLogs = useCallback(async () => {
        await navigator.clipboard.writeText(stripAnsi(panelLogs));
        setPanelCopied(true);
        setTimeout(() => setPanelCopied(false), 2000);
    }, [panelLogs]);

    const togglePanelAutoRefresh = useCallback(() => {
        setPanelAutoRefresh((prev) => {
            const next = !prev;
            if (next) {
                panelRefreshIntervalRef.current = setInterval(fetchPanelLogs, 10_000);
            } else {
                if (panelRefreshIntervalRef.current) clearInterval(panelRefreshIntervalRef.current);
            }
            return next;
        });
    }, [fetchPanelLogs]);

    // Wings log actions

    const fetchNodes = useCallback(async () => {
        setNodesLoading(true);
        try {
            const res = await axios.get('/api/admin/nodes', { params: { page: 1, limit: 500 } });
            const raw: WingsNode[] = (res.data?.data?.nodes ?? []).map((n: Record<string, unknown>) => ({
                id: n.id,
                name: n.name,
                fqdn: n.fqdn,
                scheme: n.scheme,
                daemonListen: n.daemonListen ?? n.daemon_listen,
            }));
            setNodes(raw);
            if (raw.length > 0 && selectedNodeId === null) {
                setSelectedNodeId(raw[0].id);
            }
        } catch {
            toast.error(t('admin.logs.messages.fetch_nodes_failed'));
        } finally {
            setNodesLoading(false);
        }
    }, [selectedNodeId, t]);

    const fetchWingsLogs = useCallback(
        async (nodeId: number) => {
            setWingsLogs('');
            setWingsUploadUrl(null);
            setWingsLoading(true);
            try {
                const res = await axios.get(`/api/admin/nodes/${nodeId}/diagnostics`, {
                    params: { include_logs: true, log_lines: wingsLines, format: 'text' },
                });
                if (res.data.success) {
                    const content: string = res.data.data?.diagnostics?.content ?? '';
                    // The diagnostics endpoint wraps logs in a report — extract just the log section if present
                    const logSection = (() => {
                        const marker = /={3,}\s*logs?\s*={3,}/i;
                        const idx = content.search(marker);
                        if (idx !== -1) {
                            // everything after the marker
                            return content.slice(content.indexOf('\n', idx) + 1).trim();
                        }
                        return content.trim();
                    })();
                    setWingsLogs(logSection || content);
                } else {
                    toast.error(res.data.message || t('admin.logs.messages.wings_fetch_failed'));
                }
            } catch {
                toast.error(t('admin.logs.messages.wings_fetch_failed'));
            } finally {
                setWingsLoading(false);
            }
        },
        [wingsLines, t],
    );

    const uploadWingsLogs = useCallback(async () => {
        if (!selectedNodeId) return;
        setWingsUploading(true);
        setWingsUploadUrl(null);
        try {
            const res = await axios.get(`/api/admin/nodes/${selectedNodeId}/diagnostics`, {
                params: { include_logs: true, log_lines: wingsLines, format: 'url' },
            });
            if (res.data.success) {
                const url: string | null = res.data.data?.diagnostics?.url ?? null;
                if (url) {
                    setWingsUploadUrl(url);
                    toast.success(t('admin.logs.messages.wings_upload_success'));
                } else {
                    toast.error(t('admin.logs.messages.wings_upload_no_url'));
                }
            } else {
                toast.error(res.data.message || t('admin.logs.messages.wings_upload_failed'));
            }
        } catch {
            toast.error(t('admin.logs.messages.wings_upload_failed'));
        } finally {
            setWingsUploading(false);
        }
    }, [selectedNodeId, wingsLines, t]);

    const copyWingsLogs = useCallback(async () => {
        await navigator.clipboard.writeText(stripAnsi(wingsLogs));
        setWingsCopied(true);
        setTimeout(() => setWingsCopied(false), 2000);
    }, [wingsLogs]);

    const toggleWingsAutoRefresh = useCallback(() => {
        if (!selectedNodeId) return;
        setWingsAutoRefresh((prev) => {
            const next = !prev;
            if (next) {
                wingsRefreshIntervalRef.current = setInterval(() => fetchWingsLogs(selectedNodeId), 30_000);
            } else {
                if (wingsRefreshIntervalRef.current) clearInterval(wingsRefreshIntervalRef.current);
            }
            return next;
        });
    }, [selectedNodeId, fetchWingsLogs]);

    // Effects

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    // Panel: initial load
    useEffect(() => {
        fetchLogFiles();
        fetchPanelLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Panel: re-fetch on type/lines change
    useEffect(() => {
        fetchPanelLogs();
    }, [currentLogType, panelLines]); // eslint-disable-line react-hooks/exhaustive-deps

    // Panel: restart auto-refresh when fetchPanelLogs identity changes
    useEffect(() => {
        if (!panelAutoRefresh) return;
        if (panelRefreshIntervalRef.current) clearInterval(panelRefreshIntervalRef.current);
        panelRefreshIntervalRef.current = setInterval(fetchPanelLogs, 10_000);
        return () => {
            if (panelRefreshIntervalRef.current) clearInterval(panelRefreshIntervalRef.current);
        };
    }, [panelAutoRefresh, fetchPanelLogs]);

    // Wings: load nodes when tab is first switched to
    useEffect(() => {
        if (viewMode === 'wings' && nodes.length === 0) {
            fetchNodes();
        }
    }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Wings: fetch logs when node selection or lines count changes
    useEffect(() => {
        if (viewMode === 'wings' && selectedNodeId !== null) {
            fetchWingsLogs(selectedNodeId);
        }
    }, [selectedNodeId, wingsLines]); // eslint-disable-line react-hooks/exhaustive-deps

    // Wings: restart auto-refresh
    useEffect(() => {
        if (!wingsAutoRefresh || !selectedNodeId) return;
        if (wingsRefreshIntervalRef.current) clearInterval(wingsRefreshIntervalRef.current);
        wingsRefreshIntervalRef.current = setInterval(() => fetchWingsLogs(selectedNodeId), 30_000);
        return () => {
            if (wingsRefreshIntervalRef.current) clearInterval(wingsRefreshIntervalRef.current);
        };
    }, [wingsAutoRefresh, selectedNodeId, fetchWingsLogs]);

    // Cleanup all intervals on unmount
    useEffect(() => {
        return () => {
            if (panelRefreshIntervalRef.current) clearInterval(panelRefreshIntervalRef.current);
            if (wingsRefreshIntervalRef.current) clearInterval(wingsRefreshIntervalRef.current);
        };
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        if (!lineDropdownOpen && !wingsNodeDropdownOpen && !wingsLineDropdownOpen && !panelLineDropdownOpen) return;
        const handler = () => {
            setLineDropdownOpen(false);
            setWingsNodeDropdownOpen(false);
            setWingsLineDropdownOpen(false);
            setPanelLineDropdownOpen(false);
        };
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [lineDropdownOpen, wingsNodeDropdownOpen, wingsLineDropdownOpen, panelLineDropdownOpen]);

    // Render

    const safePanelMeta = LOG_TYPE_META[currentLogType] ?? LOG_TYPE_META['app'];
    const { icon: PanelTypeIcon, color: panelTypeColor } = safePanelMeta;

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-logs', 'top-of-page')} />

            <div className='space-y-5'>
                {/* Page header */}
                <PageHeader
                    title={t('admin.logs.title')}
                    description={t('admin.logs.description')}
                    icon={FileText}
                    actions={
                        <div className='flex flex-wrap items-center justify-end gap-2'>
                            {viewMode === 'panel' && (
                                <>
                                    {panelAutoRefresh && (
                                        <span className='flex items-center gap-1.5 text-xs font-medium text-emerald-400'>
                                            <span className='relative flex h-2 w-2'>
                                                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
                                                <span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-400' />
                                            </span>
                                            {t('admin.logs.live')}
                                        </span>
                                    )}
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={fetchPanelLogs}
                                        disabled={panelLoading}
                                    >
                                        <RefreshCw
                                            className={cn('mr-1.5 h-3.5 w-3.5', panelLoading && 'animate-spin')}
                                        />
                                        {t('admin.logs.actions.refresh')}
                                    </Button>
                                    <Button
                                        variant={panelAutoRefresh ? 'default' : 'outline'}
                                        size='sm'
                                        onClick={togglePanelAutoRefresh}
                                    >
                                        {panelAutoRefresh ? (
                                            <>
                                                <Square className='mr-1.5 h-3.5 w-3.5' />
                                                {t('admin.logs.actions.stop_auto')}
                                            </>
                                        ) : (
                                            <>
                                                <Play className='mr-1.5 h-3.5 w-3.5' />
                                                {t('admin.logs.actions.auto_refresh')}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant='destructive'
                                        size='sm'
                                        onClick={clearPanelLogs}
                                        disabled={panelLoading}
                                    >
                                        <Trash2 className='mr-1.5 h-3.5 w-3.5' />
                                        {t('admin.logs.actions.clear_logs')}
                                    </Button>
                                </>
                            )}
                            {viewMode === 'wings' && selectedNodeId && (
                                <>
                                    {wingsAutoRefresh && (
                                        <span className='flex items-center gap-1.5 text-xs font-medium text-emerald-400'>
                                            <span className='relative flex h-2 w-2'>
                                                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
                                                <span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-400' />
                                            </span>
                                            {t('admin.logs.live')}
                                        </span>
                                    )}
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => fetchWingsLogs(selectedNodeId)}
                                        disabled={wingsLoading}
                                    >
                                        <RefreshCw
                                            className={cn('mr-1.5 h-3.5 w-3.5', wingsLoading && 'animate-spin')}
                                        />
                                        {t('admin.logs.actions.refresh')}
                                    </Button>
                                    <Button
                                        variant={wingsAutoRefresh ? 'default' : 'outline'}
                                        size='sm'
                                        onClick={toggleWingsAutoRefresh}
                                    >
                                        {wingsAutoRefresh ? (
                                            <>
                                                <Square className='mr-1.5 h-3.5 w-3.5' />
                                                {t('admin.logs.wings_stop_auto')}
                                            </>
                                        ) : (
                                            <>
                                                <Play className='mr-1.5 h-3.5 w-3.5' />
                                                {t('admin.logs.wings_auto_refresh')}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={uploadWingsLogs}
                                        disabled={wingsUploading || wingsLoading}
                                    >
                                        {wingsUploading ? (
                                            <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                        ) : (
                                            <UploadCloud className='mr-1.5 h-3.5 w-3.5' />
                                        )}
                                        {t('admin.logs.wings_upload_logs')}
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />

                {/* Mode switcher tabs */}
                <div className='bg-card/50 border-border/40 flex w-fit items-center gap-1 rounded-2xl border p-1 backdrop-blur-xl'>
                    <button
                        onClick={() => setViewMode('panel')}
                        className={cn(
                            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                            viewMode === 'panel'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                        )}
                    >
                        <Terminal className='h-4 w-4' />
                        {t('admin.logs.tab_panel')}
                    </button>
                    <button
                        onClick={() => setViewMode('wings')}
                        className={cn(
                            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                            viewMode === 'wings'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                        )}
                    >
                        <Server className='h-4 w-4' />
                        {t('admin.logs.tab_wings')}
                    </button>
                </div>

                {/* Panel logs view */}
                {viewMode === 'panel' && (
                    <div className='border-border/50 bg-card/50 overflow-hidden rounded-3xl border backdrop-blur-xl'>
                        {/* Panel toolbar */}
                        <div className='border-border/40 bg-muted/20 flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center'>
                            {/* Log type pills */}
                            <div className='bg-background/60 border-border/40 flex items-center gap-1 rounded-xl border p-1'>
                                {(Object.entries(LOG_TYPE_META) as [LogType, (typeof LOG_TYPE_META)[LogType]][]).map(
                                    ([type, meta]) => {
                                        const Icon = meta.icon;
                                        const active = currentLogType === type;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setCurrentLogType(type)}
                                                className={cn(
                                                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                                    active
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                                                )}
                                            >
                                                <Icon className={cn('h-3.5 w-3.5', active ? undefined : meta.color)} />
                                                {meta.label}
                                            </button>
                                        );
                                    },
                                )}
                            </div>

                            {/* Panel lines picker */}
                            <div className='relative' onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setPanelLineDropdownOpen((v) => !v)}
                                    className='border-border/50 bg-background/60 text-muted-foreground hover:text-foreground hover:border-border flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all'
                                >
                                    {t('admin.logs.n_lines', { n: String(panelLines) })}{' '}
                                    <ChevronDown className='h-3 w-3' />
                                </button>
                                {panelLineDropdownOpen && (
                                    <div className='bg-popover border-border absolute top-full left-0 z-50 mt-1 min-w-22.5 overflow-hidden rounded-xl border shadow-xl'>
                                        {LINE_OPTIONS.map((n) => (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    setPanelLines(n);
                                                    setPanelLineDropdownOpen(false);
                                                }}
                                                className={cn(
                                                    'w-full px-3 py-1.5 text-left text-xs font-semibold transition-colors',
                                                    panelLines === n
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {t('admin.logs.n_lines', { n: String(n) })}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className='flex-1' />

                            {/* Panel file stats */}
                            {panelCurrentFileInfo && (
                                <div className='text-muted-foreground/70 hidden items-center gap-3 text-[11px] font-medium lg:flex'>
                                    <span className='flex items-center gap-1'>
                                        <HardDrive className='h-3 w-3' />
                                        {formatFileSize(panelCurrentFileInfo.size)}
                                    </span>
                                    <span className='flex items-center gap-1'>
                                        <Clock className='h-3 w-3' />
                                        {formatDate(panelCurrentFileInfo.modified)}
                                    </span>
                                </div>
                            )}

                            <Badge variant='secondary' className='hidden text-[11px] sm:inline-flex'>
                                {t('admin.logs.n_lines', { n: String(panelFilteredLines.length) })}
                            </Badge>
                        </div>

                        {/* Panel search bar */}
                        <SearchBar
                            searchQuery={panelSearchQuery}
                            onSearchChange={setPanelSearchQuery}
                            filteredCount={panelFilteredLines.length}
                            totalCount={panelRawLines.length}
                            autoScroll={panelAutoScroll}
                            onToggleAutoScroll={() => {
                                setPanelAutoScroll((v) => !v);
                                if (!panelAutoScroll) doScrollPanel();
                            }}
                            onCopy={copyPanelLogs}
                            copied={panelCopied}
                            logsEmpty={!panelLogs}
                        />

                        {/* Panel terminal output */}
                        <TerminalOutput
                            loading={panelLoading}
                            filteredLines={panelFilteredLines}
                            searchQuery={panelSearchQuery}
                            emptyIcon={PanelTypeIcon}
                            emptyIconColor={panelTypeColor}
                            emptyLabel={t('admin.logs.no_logs')}
                            containerRef={panelContainerRef}
                        />

                        {/* Status bar */}
                        <div className='border-border/30 bg-muted/10 text-muted-foreground/60 flex items-center gap-4 border-t px-4 py-2 text-[11px] font-medium'>
                            <div className='flex items-center gap-1.5'>
                                <PanelTypeIcon className={cn('h-3 w-3', panelTypeColor) as string} />
                                <span className='tracking-wide uppercase'>{safePanelMeta.label}</span>
                            </div>
                            {panelCurrentFileInfo && (
                                <>
                                    <span>·</span>
                                    <span className='flex items-center gap-1'>
                                        <HardDrive className='h-3 w-3' />
                                        {formatFileSize(panelCurrentFileInfo.size)}
                                    </span>
                                    <span>·</span>
                                    <span className='flex items-center gap-1'>
                                        <Clock className='h-3 w-3' />
                                        {formatDate(panelCurrentFileInfo.modified)}
                                    </span>
                                </>
                            )}
                            <div className='flex-1' />
                            {panelAutoRefresh && (
                                <span className='flex items-center gap-1 text-emerald-500'>
                                    <span className='inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500' />
                                    {t('admin.logs.panel_auto_refresh_interval')}
                                </span>
                            )}
                            <span>{t('admin.logs.n_lines', { n: String(panelFilteredLines.length) })}</span>
                        </div>
                    </div>
                )}

                {/* Panel log file inventory */}
                {viewMode === 'panel' && logFiles.length > 0 && (
                    <div className='border-border/40 bg-card/30 overflow-hidden rounded-2xl border backdrop-blur-xl'>
                        <div className='border-border/30 flex items-center gap-2 border-b px-4 py-2.5'>
                            <HardDrive className='text-muted-foreground h-3.5 w-3.5' />
                            <span className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                                {t('admin.logs.files_on_disk')}
                            </span>
                        </div>
                        <div className='divide-border/30 grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3'>
                            {logFiles.map((file) => {
                                const meta = LOG_TYPE_META[file.type as LogType];
                                const Icon = meta?.icon ?? FileText;
                                const color = meta?.color ?? 'text-slate-400';
                                const isActive = file.type === currentLogType;
                                return (
                                    <button
                                        key={file.name}
                                        onClick={() => setCurrentLogType(file.type as LogType)}
                                        className={cn(
                                            'hover:bg-muted/30 flex items-center gap-3 px-4 py-3 text-left transition-colors',
                                            isActive ? 'bg-primary/5' : '',
                                        )}
                                    >
                                        <Icon className={cn('h-4 w-4 shrink-0', color)} />
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-2'>
                                                <span className='text-foreground text-xs font-semibold uppercase'>
                                                    {file.type}
                                                </span>
                                                {isActive && (
                                                    <span className='text-primary bg-primary/10 rounded-full px-1.5 py-0.5 text-[10px] font-bold'>
                                                        {t('admin.logs.active')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className='text-muted-foreground/60 mt-0.5 truncate text-[11px]'>
                                                {file.name}
                                            </div>
                                        </div>
                                        <div className='shrink-0 text-right'>
                                            <div className='text-muted-foreground text-xs font-semibold'>
                                                {formatFileSize(file.size)}
                                            </div>
                                            <div className='text-muted-foreground/50 mt-0.5 text-[10px]'>
                                                {formatDate(file.modified)}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Wings node logs view */}
                {viewMode === 'wings' && (
                    <div className='border-border/50 bg-card/50 overflow-hidden rounded-3xl border backdrop-blur-xl'>
                        {/* Wings toolbar */}
                        <div className='border-border/40 bg-muted/20 flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center'>
                            {/* Node picker */}
                            <div className='relative' onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setWingsNodeDropdownOpen((v) => !v)}
                                    disabled={nodesLoading}
                                    className='border-border/50 bg-background/60 text-muted-foreground hover:text-foreground hover:border-border flex h-8 max-w-55 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-all disabled:opacity-50'
                                >
                                    <Server className='h-3.5 w-3.5 shrink-0 text-amber-400' />
                                    <span className='truncate'>
                                        {nodesLoading
                                            ? t('admin.logs.wings_loading_nodes')
                                            : (selectedNode?.name ?? t('admin.logs.wings_select_node'))}
                                    </span>
                                    <ChevronDown className='h-3 w-3 shrink-0' />
                                </button>
                                {wingsNodeDropdownOpen && nodes.length > 0 && (
                                    <div className='bg-popover border-border absolute top-full left-0 z-50 mt-1 max-h-60 min-w-50 overflow-hidden overflow-y-auto rounded-xl border shadow-xl'>
                                        {nodes.map((node) => (
                                            <button
                                                key={node.id}
                                                onClick={() => {
                                                    setSelectedNodeId(node.id);
                                                    setWingsNodeDropdownOpen(false);
                                                }}
                                                className={cn(
                                                    'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors',
                                                    selectedNodeId === node.id
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-muted text-muted-foreground',
                                                )}
                                            >
                                                <Server className='h-3.5 w-3.5 shrink-0' />
                                                <div className='min-w-0'>
                                                    <div className='truncate'>{node.name}</div>
                                                    <div
                                                        className={cn(
                                                            'truncate text-[10px]',
                                                            selectedNodeId === node.id
                                                                ? 'opacity-70'
                                                                : 'text-muted-foreground/50',
                                                        )}
                                                    >
                                                        {node.fqdn}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {wingsNodeDropdownOpen && !nodesLoading && nodes.length === 0 && (
                                    <div className='bg-popover border-border text-muted-foreground absolute top-full left-0 z-50 mt-1 min-w-45 rounded-xl border p-3 text-xs shadow-xl'>
                                        {t('admin.logs.wings_no_nodes')}
                                    </div>
                                )}
                            </div>

                            {/* Wings lines picker */}
                            <div className='relative' onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setWingsLineDropdownOpen((v) => !v)}
                                    className='border-border/50 bg-background/60 text-muted-foreground hover:text-foreground hover:border-border flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all'
                                >
                                    {t('admin.logs.n_lines', { n: String(wingsLines) })}{' '}
                                    <ChevronDown className='h-3 w-3' />
                                </button>
                                {wingsLineDropdownOpen && (
                                    <div className='bg-popover border-border absolute top-full left-0 z-50 mt-1 min-w-22.5 overflow-hidden rounded-xl border shadow-xl'>
                                        {LINE_OPTIONS.map((n) => (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    setWingsLines(n);
                                                    setWingsLineDropdownOpen(false);
                                                }}
                                                className={cn(
                                                    'w-full px-3 py-1.5 text-left text-xs font-semibold transition-colors',
                                                    wingsLines === n
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {t('admin.logs.n_lines', { n: String(n) })}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className='flex-1' />

                            {/* Wings node quick info */}
                            {selectedNode && (
                                <div className='text-muted-foreground/70 hidden items-center gap-3 text-[11px] font-medium lg:flex'>
                                    <span className='flex items-center gap-1'>
                                        <Globe className='h-3 w-3' />
                                        {selectedNode.fqdn}
                                    </span>
                                    <span className='flex items-center gap-1'>
                                        <Clock className='h-3 w-3' />
                                        {t('admin.logs.tab_wings')}
                                    </span>
                                </div>
                            )}

                            <Badge variant='secondary' className='hidden text-[11px] sm:inline-flex'>
                                {t('admin.logs.n_lines', { n: String(wingsFilteredLines.length) })}
                            </Badge>
                        </div>

                        {/* Upload URL banner */}
                        {wingsUploadUrl && (
                            <div className='flex items-center gap-3 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-400'>
                                <Check className='h-3.5 w-3.5 shrink-0' />
                                <span>{t('admin.logs.wings_uploaded')}</span>
                                <a
                                    href={wingsUploadUrl}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='flex items-center gap-1 truncate underline underline-offset-2 hover:text-emerald-300'
                                >
                                    {wingsUploadUrl}
                                    <ExternalLink className='h-3 w-3 shrink-0' />
                                </a>
                                <button
                                    onClick={() => navigator.clipboard.writeText(wingsUploadUrl)}
                                    className='shrink-0 hover:text-emerald-300'
                                >
                                    <Copy className='h-3 w-3' />
                                </button>
                            </div>
                        )}

                        {/* No node selected */}
                        {!selectedNodeId && !nodesLoading && (
                            <div className='flex h-48 flex-col items-center justify-center gap-3 bg-[#0d1117] text-slate-600'>
                                <Server className='h-10 w-10 opacity-30' />
                                <span className='text-sm'>{t('admin.logs.wings_no_node_selected')}</span>
                            </div>
                        )}

                        {/* Search bar + output */}
                        {selectedNodeId && (
                            <>
                                <SearchBar
                                    searchQuery={wingsSearchQuery}
                                    onSearchChange={setWingsSearchQuery}
                                    filteredCount={wingsFilteredLines.length}
                                    totalCount={wingsRawLines.length}
                                    autoScroll={wingsAutoScroll}
                                    onToggleAutoScroll={() => {
                                        setWingsAutoScroll((v) => !v);
                                        if (!wingsAutoScroll) doScrollWings();
                                    }}
                                    onCopy={copyWingsLogs}
                                    copied={wingsCopied}
                                    logsEmpty={!wingsLogs}
                                    extra={
                                        wingsLoading ? (
                                            <span className='text-muted-foreground flex items-center gap-1.5 text-[11px]'>
                                                <Loader2 className='h-3 w-3 animate-spin' />
                                                {t('admin.logs.wings_fetching')}
                                            </span>
                                        ) : undefined
                                    }
                                />
                                <TerminalOutput
                                    loading={wingsLoading}
                                    filteredLines={wingsFilteredLines}
                                    searchQuery={wingsSearchQuery}
                                    emptyIcon={WifiOff}
                                    emptyIconColor='text-amber-400'
                                    emptyLabel={t('admin.logs.wings_empty')}
                                    containerRef={wingsContainerRef}
                                />
                            </>
                        )}

                        {/* Status bar */}
                        <div className='border-border/30 bg-muted/10 text-muted-foreground/60 flex items-center gap-4 border-t px-4 py-2 text-[11px] font-medium'>
                            <div className='flex items-center gap-1.5'>
                                <Server className='h-3 w-3 text-amber-400' />
                                <span className='tracking-wide uppercase'>
                                    {selectedNode?.name ?? t('admin.logs.wings_no_node_status')}
                                </span>
                            </div>
                            {selectedNode && (
                                <>
                                    <span>·</span>
                                    <span>{selectedNode.fqdn}</span>
                                </>
                            )}
                            <div className='flex-1' />
                            {wingsAutoRefresh && (
                                <span className='flex items-center gap-1 text-emerald-500'>
                                    <span className='inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500' />
                                    {t('admin.logs.wings_auto_refresh_interval')}
                                </span>
                            )}
                            {selectedNodeId && (
                                <span>{t('admin.logs.n_lines', { n: String(wingsFilteredLines.length) })}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Wings node switcher grid */}
                {viewMode === 'wings' && nodes.length > 0 && (
                    <div className='border-border/40 bg-card/30 overflow-hidden rounded-2xl border backdrop-blur-xl'>
                        <div className='border-border/30 flex items-center gap-2 border-b px-4 py-2.5'>
                            <Server className='text-muted-foreground h-3.5 w-3.5' />
                            <span className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                                {t('admin.logs.wings_nodes')}
                            </span>
                            <span className='text-muted-foreground/50 text-[11px]'>
                                {t('admin.logs.wings_nodes_hint')}
                            </span>
                        </div>
                        <div className='divide-border/30 grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3'>
                            {nodes.map((node) => {
                                const isActive = node.id === selectedNodeId;
                                return (
                                    <button
                                        key={node.id}
                                        onClick={() => setSelectedNodeId(node.id)}
                                        className={cn(
                                            'hover:bg-muted/30 flex items-center gap-3 px-4 py-3 text-left transition-colors',
                                            isActive ? 'bg-primary/5' : '',
                                        )}
                                    >
                                        <Server
                                            className={cn(
                                                'h-4 w-4 shrink-0',
                                                isActive ? 'text-primary' : 'text-amber-400',
                                            )}
                                        />
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-2'>
                                                <span className='text-foreground truncate text-xs font-semibold'>
                                                    {node.name}
                                                </span>
                                                {isActive && (
                                                    <span className='text-primary bg-primary/10 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold'>
                                                        {t('admin.logs.active')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className='text-muted-foreground/60 mt-0.5 truncate text-[11px]'>
                                                {node.fqdn}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <WidgetRenderer widgets={getWidgets('admin-logs', 'bottom-of-page')} />
        </>
    );
}
