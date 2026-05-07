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
            className='overflow-auto font-mono text-[12px] leading-5 bg-[#0d1117] min-h-[420px] max-h-[68vh] p-4'
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace" }}
        >
            {loading ? (
                <div className='flex items-center gap-3 text-slate-500 py-4'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>{t('admin.logs.loading')}</span>
                </div>
            ) : isEmpty ? (
                <div className='flex flex-col items-center justify-center h-40 gap-3 text-slate-600'>
                    <EmptyIcon className={cn('w-8 h-8 opacity-50', emptyIconColor)} />
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
                                'flex group rounded-sm',
                                highlighted ? 'bg-yellow-500/10 ring-1 ring-yellow-500/30' : '',
                            )}
                        >
                            <span className='select-none text-slate-600 w-10 shrink-0 text-right pr-3 pt-px text-[11px] group-hover:text-slate-500 transition-colors'>
                                {i + 1}
                            </span>
                            <span className={cn('flex-1 break-all whitespace-pre-wrap', ansiLineClass(line))}>
                                {highlighted && searchQuery
                                    ? (() => {
                                          const idx = clean.toLowerCase().indexOf(searchQuery.toLowerCase());
                                          return (
                                              <>
                                                  {clean.slice(0, idx)}
                                                  <mark className='bg-yellow-400/30 text-yellow-200 rounded-sm'>
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
        <div className='flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-background/30'>
            <div className='relative flex-1 max-w-sm'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none' />
                <input
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('admin.logs.filter_placeholder')}
                    className='w-full h-7 pl-8 pr-7 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-muted/60 transition-all'
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                    >
                        <X className='w-3 h-3' />
                    </button>
                )}
            </div>
            {searchQuery && (
                <span className='text-[11px] text-muted-foreground font-medium whitespace-nowrap'>
                    {t('admin.logs.filter_matches', { filtered: String(filteredCount), total: String(totalCount) })}
                </span>
            )}
            <div className='flex-1' />
            {extra}
            <button
                onClick={onToggleAutoScroll}
                className={cn(
                    'flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all',
                    autoScroll
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border/40 text-muted-foreground hover:text-foreground',
                )}
                title={t('admin.logs.auto_scroll')}
            >
                <ArrowDown className='w-3 h-3' />
                {t('admin.logs.auto_scroll')}
            </button>
            <button
                onClick={onCopy}
                disabled={logsEmpty}
                className='flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold border border-border/40 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40'
                title={t('admin.logs.copy')}
            >
                {copied ? <Check className='w-3 h-3 text-emerald-400' /> : <Copy className='w-3 h-3' />}
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
                        <div className='flex items-center gap-2 flex-wrap justify-end'>
                            {viewMode === 'panel' && (
                                <>
                                    {panelAutoRefresh && (
                                        <span className='flex items-center gap-1.5 text-xs text-emerald-400 font-medium'>
                                            <span className='relative flex h-2 w-2'>
                                                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                                                <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-400' />
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
                                            className={cn('w-3.5 h-3.5 mr-1.5', panelLoading && 'animate-spin')}
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
                                                <Square className='w-3.5 h-3.5 mr-1.5' />
                                                {t('admin.logs.actions.stop_auto')}
                                            </>
                                        ) : (
                                            <>
                                                <Play className='w-3.5 h-3.5 mr-1.5' />
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
                                        <Trash2 className='w-3.5 h-3.5 mr-1.5' />
                                        {t('admin.logs.actions.clear_logs')}
                                    </Button>
                                </>
                            )}
                            {viewMode === 'wings' && selectedNodeId && (
                                <>
                                    {wingsAutoRefresh && (
                                        <span className='flex items-center gap-1.5 text-xs text-emerald-400 font-medium'>
                                            <span className='relative flex h-2 w-2'>
                                                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                                                <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-400' />
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
                                            className={cn('w-3.5 h-3.5 mr-1.5', wingsLoading && 'animate-spin')}
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
                                                <Square className='w-3.5 h-3.5 mr-1.5' />
                                                {t('admin.logs.wings_stop_auto')}
                                            </>
                                        ) : (
                                            <>
                                                <Play className='w-3.5 h-3.5 mr-1.5' />
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
                                            <Loader2 className='w-3.5 h-3.5 mr-1.5 animate-spin' />
                                        ) : (
                                            <UploadCloud className='w-3.5 h-3.5 mr-1.5' />
                                        )}
                                        {t('admin.logs.wings_upload_logs')}
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />

                {/* Mode switcher tabs */}
                <div className='flex items-center gap-1 p-1 bg-card/50 border border-border/40 rounded-2xl w-fit backdrop-blur-xl'>
                    <button
                        onClick={() => setViewMode('panel')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                            viewMode === 'panel'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                        )}
                    >
                        <Terminal className='w-4 h-4' />
                        {t('admin.logs.tab_panel')}
                    </button>
                    <button
                        onClick={() => setViewMode('wings')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                            viewMode === 'wings'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                        )}
                    >
                        <Server className='w-4 h-4' />
                        {t('admin.logs.tab_wings')}
                    </button>
                </div>

                {/* Panel logs view */}
                {viewMode === 'panel' && (
                    <div className='rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl overflow-hidden'>
                        {/* Panel toolbar */}
                        <div className='flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/20'>
                            {/* Log type pills */}
                            <div className='flex items-center gap-1 p-1 bg-background/60 rounded-xl border border-border/40'>
                                {(Object.entries(LOG_TYPE_META) as [LogType, (typeof LOG_TYPE_META)[LogType]][]).map(
                                    ([type, meta]) => {
                                        const Icon = meta.icon;
                                        const active = currentLogType === type;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setCurrentLogType(type)}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                                    active
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                                                )}
                                            >
                                                <Icon className={cn('w-3.5 h-3.5', active ? undefined : meta.color)} />
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
                                    className='flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/50 bg-background/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all'
                                >
                                    {t('admin.logs.n_lines', { n: String(panelLines) })}{' '}
                                    <ChevronDown className='w-3 h-3' />
                                </button>
                                {panelLineDropdownOpen && (
                                    <div className='absolute top-full mt-1 left-0 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden min-w-[90px]'>
                                        {LINE_OPTIONS.map((n) => (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    setPanelLines(n);
                                                    setPanelLineDropdownOpen(false);
                                                }}
                                                className={cn(
                                                    'w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors',
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
                                <div className='hidden lg:flex items-center gap-3 text-[11px] text-muted-foreground/70 font-medium'>
                                    <span className='flex items-center gap-1'>
                                        <HardDrive className='w-3 h-3' />
                                        {formatFileSize(panelCurrentFileInfo.size)}
                                    </span>
                                    <span className='flex items-center gap-1'>
                                        <Clock className='w-3 h-3' />
                                        {formatDate(panelCurrentFileInfo.modified)}
                                    </span>
                                </div>
                            )}

                            <Badge variant='secondary' className='text-[11px] hidden sm:inline-flex'>
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
                        <div className='flex items-center gap-4 px-4 py-2 border-t border-border/30 bg-muted/10 text-[11px] text-muted-foreground/60 font-medium'>
                            <div className='flex items-center gap-1.5'>
                                <PanelTypeIcon className={cn('w-3 h-3', panelTypeColor) as string} />
                                <span className='uppercase tracking-wide'>{safePanelMeta.label}</span>
                            </div>
                            {panelCurrentFileInfo && (
                                <>
                                    <span>·</span>
                                    <span className='flex items-center gap-1'>
                                        <HardDrive className='w-3 h-3' />
                                        {formatFileSize(panelCurrentFileInfo.size)}
                                    </span>
                                    <span>·</span>
                                    <span className='flex items-center gap-1'>
                                        <Clock className='w-3 h-3' />
                                        {formatDate(panelCurrentFileInfo.modified)}
                                    </span>
                                </>
                            )}
                            <div className='flex-1' />
                            {panelAutoRefresh && (
                                <span className='text-emerald-500 flex items-center gap-1'>
                                    <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                                    {t('admin.logs.panel_auto_refresh_interval')}
                                </span>
                            )}
                            <span>{t('admin.logs.n_lines', { n: String(panelFilteredLines.length) })}</span>
                        </div>
                    </div>
                )}

                {/* Panel log file inventory */}
                {viewMode === 'panel' && logFiles.length > 0 && (
                    <div className='rounded-2xl border border-border/40 bg-card/30 backdrop-blur-xl overflow-hidden'>
                        <div className='px-4 py-2.5 border-b border-border/30 flex items-center gap-2'>
                            <HardDrive className='w-3.5 h-3.5 text-muted-foreground' />
                            <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                                {t('admin.logs.files_on_disk')}
                            </span>
                        </div>
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/30'>
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
                                            'flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors',
                                            isActive ? 'bg-primary/5' : '',
                                        )}
                                    >
                                        <Icon className={cn('w-4 h-4 shrink-0', color)} />
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-2'>
                                                <span className='text-xs font-semibold text-foreground uppercase'>
                                                    {file.type}
                                                </span>
                                                {isActive && (
                                                    <span className='text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full'>
                                                        {t('admin.logs.active')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className='text-[11px] text-muted-foreground/60 truncate mt-0.5'>
                                                {file.name}
                                            </div>
                                        </div>
                                        <div className='text-right shrink-0'>
                                            <div className='text-xs font-semibold text-muted-foreground'>
                                                {formatFileSize(file.size)}
                                            </div>
                                            <div className='text-[10px] text-muted-foreground/50 mt-0.5'>
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
                    <div className='rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl overflow-hidden'>
                        {/* Wings toolbar */}
                        <div className='flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/20'>
                            {/* Node picker */}
                            <div className='relative' onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setWingsNodeDropdownOpen((v) => !v)}
                                    disabled={nodesLoading}
                                    className='flex items-center gap-2 h-8 px-3 rounded-lg border border-border/50 bg-background/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all disabled:opacity-50 max-w-[220px]'
                                >
                                    <Server className='w-3.5 h-3.5 shrink-0 text-amber-400' />
                                    <span className='truncate'>
                                        {nodesLoading
                                            ? t('admin.logs.wings_loading_nodes')
                                            : (selectedNode?.name ?? t('admin.logs.wings_select_node'))}
                                    </span>
                                    <ChevronDown className='w-3 h-3 shrink-0' />
                                </button>
                                {wingsNodeDropdownOpen && nodes.length > 0 && (
                                    <div className='absolute top-full mt-1 left-0 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden min-w-[200px] max-h-60 overflow-y-auto'>
                                        {nodes.map((node) => (
                                            <button
                                                key={node.id}
                                                onClick={() => {
                                                    setSelectedNodeId(node.id);
                                                    setWingsNodeDropdownOpen(false);
                                                }}
                                                className={cn(
                                                    'w-full text-left px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-2',
                                                    selectedNodeId === node.id
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-muted text-muted-foreground',
                                                )}
                                            >
                                                <Server className='w-3.5 h-3.5 shrink-0' />
                                                <div className='min-w-0'>
                                                    <div className='truncate'>{node.name}</div>
                                                    <div
                                                        className={cn(
                                                            'text-[10px] truncate',
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
                                    <div className='absolute top-full mt-1 left-0 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 text-xs text-muted-foreground min-w-[180px]'>
                                        {t('admin.logs.wings_no_nodes')}
                                    </div>
                                )}
                            </div>

                            {/* Wings lines picker */}
                            <div className='relative' onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setWingsLineDropdownOpen((v) => !v)}
                                    className='flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/50 bg-background/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all'
                                >
                                    {t('admin.logs.n_lines', { n: String(wingsLines) })}{' '}
                                    <ChevronDown className='w-3 h-3' />
                                </button>
                                {wingsLineDropdownOpen && (
                                    <div className='absolute top-full mt-1 left-0 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden min-w-[90px]'>
                                        {LINE_OPTIONS.map((n) => (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    setWingsLines(n);
                                                    setWingsLineDropdownOpen(false);
                                                }}
                                                className={cn(
                                                    'w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors',
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
                                <div className='hidden lg:flex items-center gap-3 text-[11px] text-muted-foreground/70 font-medium'>
                                    <span className='flex items-center gap-1'>
                                        <Globe className='w-3 h-3' />
                                        {selectedNode.fqdn}
                                    </span>
                                    <span className='flex items-center gap-1'>
                                        <Clock className='w-3 h-3' />
                                        {t('admin.logs.tab_wings')}
                                    </span>
                                </div>
                            )}

                            <Badge variant='secondary' className='text-[11px] hidden sm:inline-flex'>
                                {t('admin.logs.n_lines', { n: String(wingsFilteredLines.length) })}
                            </Badge>
                        </div>

                        {/* Upload URL banner */}
                        {wingsUploadUrl && (
                            <div className='flex items-center gap-3 px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs font-medium text-emerald-400'>
                                <Check className='w-3.5 h-3.5 shrink-0' />
                                <span>{t('admin.logs.wings_uploaded')}</span>
                                <a
                                    href={wingsUploadUrl}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='underline underline-offset-2 hover:text-emerald-300 flex items-center gap-1 truncate'
                                >
                                    {wingsUploadUrl}
                                    <ExternalLink className='w-3 h-3 shrink-0' />
                                </a>
                                <button
                                    onClick={() => navigator.clipboard.writeText(wingsUploadUrl)}
                                    className='shrink-0 hover:text-emerald-300'
                                >
                                    <Copy className='w-3 h-3' />
                                </button>
                            </div>
                        )}

                        {/* No node selected */}
                        {!selectedNodeId && !nodesLoading && (
                            <div className='flex flex-col items-center justify-center h-48 gap-3 bg-[#0d1117] text-slate-600'>
                                <Server className='w-10 h-10 opacity-30' />
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
                                            <span className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                                                <Loader2 className='w-3 h-3 animate-spin' />
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
                        <div className='flex items-center gap-4 px-4 py-2 border-t border-border/30 bg-muted/10 text-[11px] text-muted-foreground/60 font-medium'>
                            <div className='flex items-center gap-1.5'>
                                <Server className='w-3 h-3 text-amber-400' />
                                <span className='uppercase tracking-wide'>
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
                                <span className='text-emerald-500 flex items-center gap-1'>
                                    <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
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
                    <div className='rounded-2xl border border-border/40 bg-card/30 backdrop-blur-xl overflow-hidden'>
                        <div className='px-4 py-2.5 border-b border-border/30 flex items-center gap-2'>
                            <Server className='w-3.5 h-3.5 text-muted-foreground' />
                            <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                                {t('admin.logs.wings_nodes')}
                            </span>
                            <span className='text-[11px] text-muted-foreground/50'>
                                {t('admin.logs.wings_nodes_hint')}
                            </span>
                        </div>
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/30'>
                            {nodes.map((node) => {
                                const isActive = node.id === selectedNodeId;
                                return (
                                    <button
                                        key={node.id}
                                        onClick={() => setSelectedNodeId(node.id)}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors',
                                            isActive ? 'bg-primary/5' : '',
                                        )}
                                    >
                                        <Server
                                            className={cn(
                                                'w-4 h-4 shrink-0',
                                                isActive ? 'text-primary' : 'text-amber-400',
                                            )}
                                        />
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-2'>
                                                <span className='text-xs font-semibold text-foreground truncate'>
                                                    {node.name}
                                                </span>
                                                {isActive && (
                                                    <span className='text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0'>
                                                        {t('admin.logs.active')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className='text-[11px] text-muted-foreground/60 truncate mt-0.5'>
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
