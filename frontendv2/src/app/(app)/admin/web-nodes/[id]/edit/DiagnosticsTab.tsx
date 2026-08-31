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

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clipboard,
    FileText,
    RefreshCw,
    ScrollText,
    Stethoscope,
    Terminal,
} from 'lucide-react';

interface DiagnosticsTabProps {
    nodeId: string;
    onOpenQuilldTab?: () => void;
}

interface DiagnosticCheck {
    id: string;
    status: string;
    message: string;
    detail?: string | null;
}

interface DiagnosticsPayload {
    version?: string;
    uptime_seconds?: number;
    panel_reachable?: boolean;
    last_panel_error?: string | null;
    maintenance_mode?: boolean;
    live_checked_at?: string;
    checks?: DiagnosticCheck[];
    host?: {
        architecture?: string;
        os?: string;
        kernel_version?: string;
        cpu_count?: number;
        cpu_model?: string;
    };
}

interface LogFileEntry {
    name: string;
    size_bytes: number;
    modified_at: string;
    compressed: boolean;
}

function statusBadgeClass(status: string): string {
    if (status === 'ok') return 'bg-emerald-500/15 text-emerald-600';
    if (status === 'warn') return 'bg-amber-500/15 text-amber-600';
    return 'bg-red-500/15 text-red-600';
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function DiagnosticsTab({ nodeId, onOpenQuilldTab }: DiagnosticsTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [diagnostics, setDiagnostics] = useState<DiagnosticsPayload | null>(null);
    const [logFiles, setLogFiles] = useState<LogFileEntry[]>([]);
    const [logsDirectory, setLogsDirectory] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState('latest.log');
    const [logLines, setLogLines] = useState(300);
    const [logContent, setLogContent] = useState<string | null>(null);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);

    const loadDiagnostics = useCallback(async () => {
        const { data } = await axios.get(`/api/admin/web-nodes/${nodeId}/diagnostics`);
        if (!data?.success) {
            throw new Error(data?.message || t('admin.webNodes.diagnostics.fetch_failed'));
        }
        setDiagnostics((data.data?.diagnostics || null) as DiagnosticsPayload | null);
    }, [nodeId, t]);

    const loadLogFiles = useCallback(async () => {
        const { data } = await axios.get(`/api/admin/web-nodes/${nodeId}/system-logs`);
        if (!data?.success) {
            throw new Error(data?.message || t('admin.webNodes.diagnostics.logs_list_failed'));
        }
        const payload = data.data?.logs as { directory?: string; files?: LogFileEntry[] } | undefined;
        const files = payload?.files || [];
        setLogsDirectory(payload?.directory || null);
        setLogFiles(files);
        if (files.length > 0) {
            setSelectedFile((current) => (files.some((f) => f.name === current) ? current : files[0].name));
        }
    }, [nodeId, t]);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        const [diagResult, logsResult] = await Promise.allSettled([loadDiagnostics(), loadLogFiles()]);
        const messages: string[] = [];
        if (diagResult.status === 'rejected') {
            messages.push(
                diagResult.reason instanceof Error
                    ? diagResult.reason.message
                    : t('admin.webNodes.diagnostics.fetch_failed'),
            );
        }
        if (logsResult.status === 'rejected') {
            messages.push(
                logsResult.reason instanceof Error
                    ? logsResult.reason.message
                    : t('admin.webNodes.diagnostics.logs_list_failed'),
            );
        }
        if (messages.length === 2) {
            setError(messages.join(' · '));
        }
        setLoading(false);
    }, [loadDiagnostics, loadLogFiles, t]);

    const fetchLogContent = useCallback(async () => {
        if (!selectedFile) return;
        setLogsLoading(true);
        setLogsError(null);
        try {
            const { data } = await axios.get(
                `/api/admin/web-nodes/${nodeId}/system-logs/${encodeURIComponent(selectedFile)}`,
                { params: { lines: logLines } },
            );
            if (!data?.success) {
                throw new Error(data?.message || t('admin.webNodes.diagnostics.logs_fetch_failed'));
            }
            const log = data.data?.log as { content?: string } | undefined;
            setLogContent(log?.content ?? '');
        } catch (e) {
            const msg =
                e instanceof Error
                    ? e.message
                    : isAxiosError(e)
                      ? e.response?.data?.message || e.message
                      : t('admin.webNodes.diagnostics.logs_fetch_failed');
            setLogsError(msg);
            setLogContent(null);
        } finally {
            setLogsLoading(false);
        }
    }, [logLines, nodeId, selectedFile, t]);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    useEffect(() => {
        if (!loading && selectedFile) {
            void fetchLogContent();
        }
    }, [loading, selectedFile, fetchLogContent]);

    const checks = useMemo(() => diagnostics?.checks || [], [diagnostics?.checks]);
    const failCount = checks.filter((c) => c.status === 'fail').length;
    const warnCount = checks.filter((c) => c.status === 'warn').length;

    const reportText = useMemo(() => {
        const lines: string[] = [];
        lines.push('FeatherQuilld diagnostics report');
        lines.push(`Version: ${diagnostics?.version || '—'}`);
        lines.push(`Panel reachable: ${diagnostics?.panel_reachable ? 'yes' : 'no'}`);
        if (diagnostics?.last_panel_error) {
            lines.push(`Panel error: ${diagnostics.last_panel_error}`);
        }
        lines.push('');
        for (const check of checks) {
            lines.push(`[${check.status.toUpperCase()}] ${check.message}`);
            if (check.detail) lines.push(`  ${check.detail}`);
        }
        return lines.join('\n');
    }, [checks, diagnostics]);

    const copyReport = () => {
        void navigator.clipboard.writeText(reportText);
        toast.success(t('common.copiedToClipboard'));
    };

    const copyLogs = () => {
        if (!logContent) return;
        void navigator.clipboard.writeText(logContent);
        toast.success(t('common.copiedToClipboard'));
    };

    const rerunSelfTest = async () => {
        try {
            await loadDiagnostics();
            toast.success(t('admin.webNodes.diagnostics.self_test_refreshed'));
        } catch (e) {
            const msg =
                e instanceof Error
                    ? e.message
                    : isAxiosError(e)
                      ? e.response?.data?.message || e.message
                      : t('admin.webNodes.diagnostics.fetch_failed');
            toast.error(msg);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <RefreshCw className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-center justify-end gap-2'>
                <Button variant='outline' size='sm' onClick={() => void loadAll()}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('common.refresh')}
                </Button>
                <Button variant='outline' size='sm' onClick={() => void rerunSelfTest()}>
                    <Stethoscope className='mr-2 h-4 w-4' />
                    {t('admin.webNodes.diagnostics.rerun_self_test')}
                </Button>
                <Button variant='outline' size='sm' onClick={copyReport} disabled={checks.length === 0}>
                    <Clipboard className='mr-2 h-4 w-4' />
                    {t('admin.webNodes.diagnostics.copy_report')}
                </Button>
                {onOpenQuilldTab && (
                    <Button variant='outline' size='sm' onClick={onOpenQuilldTab}>
                        <Terminal className='mr-2 h-4 w-4' />
                        {t('admin.webNodes.hostingSetup.openQuilld')}
                    </Button>
                )}
            </div>

            {error && (
                <div className='bg-destructive/10 border-destructive/20 flex items-start gap-3 rounded-2xl border p-4'>
                    <AlertCircle className='text-destructive mt-0.5 h-5 w-5 shrink-0' />
                    <p className='text-destructive text-sm'>{error}</p>
                </div>
            )}

            <PageCard title={t('admin.webNodes.diagnostics.self_test_title')} icon={Stethoscope}>
                <div className='mb-4 flex flex-wrap items-center gap-2'>
                    {diagnostics?.version && <Badge variant='outline'>v{diagnostics.version}</Badge>}
                    {failCount > 0 && (
                        <Badge className='bg-red-500/15 text-red-600'>
                            {failCount} {t('admin.webNodes.diagnostics.failed')}
                        </Badge>
                    )}
                    {warnCount > 0 && (
                        <Badge className='bg-amber-500/15 text-amber-600'>
                            {warnCount} {t('admin.webNodes.diagnostics.warnings')}
                        </Badge>
                    )}
                    {failCount === 0 && warnCount === 0 && checks.length > 0 && (
                        <Badge className='bg-emerald-500/15 text-emerald-600'>
                            <CheckCircle2 className='mr-1 h-3.5 w-3.5' />
                            {t('admin.webNodes.diagnostics.all_clear')}
                        </Badge>
                    )}
                    {diagnostics?.panel_reachable === false && (
                        <Badge className='bg-amber-500/15 text-amber-600'>
                            {t('admin.webNodes.status.unreachable')}
                        </Badge>
                    )}
                </div>

                {checks.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>{t('admin.webNodes.status.no_checks')}</p>
                ) : (
                    <div className='divide-border/50 divide-y'>
                        {checks.map((check) => (
                            <div key={check.id} className='flex items-start justify-between gap-3 py-2.5'>
                                <div className='min-w-0'>
                                    <p className='font-medium'>{check.message}</p>
                                    {check.detail && (
                                        <p className='text-muted-foreground font-mono text-xs break-all'>
                                            {check.detail}
                                        </p>
                                    )}
                                </div>
                                <Badge className={statusBadgeClass(check.status)}>{check.status}</Badge>
                            </div>
                        ))}
                    </div>
                )}

                {diagnostics?.host && (
                    <div className='text-muted-foreground mt-4 grid grid-cols-1 gap-2 border-t pt-4 text-sm sm:grid-cols-2'>
                        <div>
                            {t('admin.webNodes.status.os')}: {diagnostics.host.os || '—'}
                        </div>
                        <div>
                            {t('admin.webNodes.status.arch')}: {diagnostics.host.architecture || '—'}
                        </div>
                        <div>
                            {t('admin.webNodes.status.kernel')}: {diagnostics.host.kernel_version || '—'}
                        </div>
                        <div>CPU: {diagnostics.host.cpu_model || diagnostics.host.cpu_count || '—'}</div>
                    </div>
                )}
            </PageCard>

            <PageCard
                title={t('admin.webNodes.diagnostics.logs_title')}
                description={t('admin.webNodes.diagnostics.logs_description')}
                icon={ScrollText}
            >
                <div className='space-y-4'>
                    {logsDirectory && (
                        <p className='text-muted-foreground font-mono text-xs break-all'>
                            {t('admin.webNodes.diagnostics.logs_directory')}: {logsDirectory}
                        </p>
                    )}

                    <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
                        <div className='min-w-0 flex-1 space-y-2'>
                            <Label>{t('admin.webNodes.diagnostics.log_file')}</Label>
                            <select
                                className='border-input bg-background h-10 w-full rounded-md border px-3 text-sm'
                                value={selectedFile}
                                onChange={(e) => setSelectedFile(e.target.value)}
                            >
                                {logFiles.length === 0 ? (
                                    <option value='latest.log'>latest.log</option>
                                ) : (
                                    logFiles.map((file) => (
                                        <option key={file.name} value={file.name}>
                                            {file.name} ({formatBytes(file.size_bytes)}){file.compressed ? ' · gz' : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webNodes.diagnostics.log_lines')}</Label>
                            <Input
                                type='number'
                                min={50}
                                max={5000}
                                value={logLines}
                                onChange={(e) =>
                                    setLogLines(Math.max(50, Math.min(5000, Number(e.target.value) || 300)))
                                }
                                className='h-10 w-28'
                            />
                        </div>
                        <Button variant='outline' loading={logsLoading} onClick={() => void fetchLogContent()}>
                            <FileText className='mr-2 h-4 w-4' />
                            {t('admin.webNodes.diagnostics.load_logs')}
                        </Button>
                        <Button variant='outline' disabled={!logContent} onClick={copyLogs}>
                            <Clipboard className='mr-2 h-4 w-4' />
                            {t('common.copy')}
                        </Button>
                    </div>

                    {logsError && <p className='text-destructive text-sm'>{logsError}</p>}

                    <div className='overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950'>
                        <pre className='max-h-[28rem] overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-300'>
                            {logsLoading
                                ? t('admin.webNodes.diagnostics.logs_loading')
                                : logContent || t('admin.webNodes.diagnostics.no_logs')}
                        </pre>
                    </div>
                </div>
            </PageCard>

            <PageCard title={t('admin.webNodes.diagnostics.quick_actions')} icon={Activity}>
                <div className='flex flex-wrap gap-2'>
                    <Button variant='outline' size='sm' onClick={() => void loadAll()}>
                        <RefreshCw className='mr-2 h-4 w-4' />
                        {t('admin.webNodes.diagnostics.refresh_all')}
                    </Button>
                    <Button variant='outline' size='sm' onClick={() => void rerunSelfTest()}>
                        <Stethoscope className='mr-2 h-4 w-4' />
                        {t('admin.webNodes.diagnostics.rerun_self_test')}
                    </Button>
                    {onOpenQuilldTab && (
                        <Button variant='outline' size='sm' onClick={onOpenQuilldTab}>
                            <Terminal className='mr-2 h-4 w-4' />
                            {t('admin.webNodes.hostingSetup.openQuilld')}
                        </Button>
                    )}
                </div>
            </PageCard>
        </div>
    );
}
