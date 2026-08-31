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
import axios from 'axios';
import { Copy, ExternalLink, Loader2, RefreshCw, Search, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { useTranslation } from '@/contexts/TranslationContext';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { copyToClipboard, cn } from '@/lib/utils';
import { toast } from 'sonner';

export type LogType = 'web' | 'app' | 'mail' | 'runner';

type LogFile = { name: string; size: number; modified: number; type: string };

type UploadEntry = { success?: boolean; url?: string; raw?: string; id?: string; error?: string };

const LOG_TYPES: LogType[] = ['app', 'web', 'runner', 'mail'];
const LINE_OPTIONS = [100, 250, 500, 1000, 2500, 5000];

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatLogTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function lineTone(line: string): string {
    if (/ERROR|❌|panic|fatal/i.test(line)) return 'text-red-400';
    if (/WARN|⚠|warning/i.test(line)) return 'text-amber-300';
    if (/INFO|✅|DEBUG/i.test(line)) return 'text-slate-300';
    return 'text-slate-400';
}

function stripAnsi(value: string): string {
    return value.replace(/\x1b\[[0-9;]*m/g, '');
}

export function PanelDebugLogsSection({ enabled }: { enabled: boolean }) {
    const { t } = useTranslation();

    const [logType, setLogType] = useState<LogType>('app');
    const [lineCount, setLineCount] = useState(500);
    const [logFiles, setLogFiles] = useState<LogFile[]>([]);
    const [logContent, setLogContent] = useState('');
    const [logMeta, setLogMeta] = useState<{ file?: string; lines_count?: number } | null>(null);
    const [logFilter, setLogFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState<Record<string, UploadEntry> | null>(null);

    const fetchLogFiles = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        try {
            const res = await axios.get<{ success: boolean; data: { files: LogFile[] } }>(
                '/api/admin/log-viewer/files',
            );
            setLogFiles(res.data?.data?.files ?? []);
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message ?? t('globalSearch.debug.logsLoadFailed'));
        } finally {
            setLoading(false);
        }
    }, [enabled, t]);

    const fetchLogs = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        try {
            const res = await axios.get<{
                success: boolean;
                data: { logs: string; file: string; type: string; lines_count: number };
                message?: string;
            }>('/api/admin/log-viewer/get', {
                params: { type: logType, lines: lineCount },
            });
            if (!res.data?.success) {
                toast.error(res.data?.message ?? t('globalSearch.debug.logTailFailed'));
                return;
            }
            setLogContent(res.data.data.logs ?? '');
            setLogMeta({ file: res.data.data.file, lines_count: res.data.data.lines_count });
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message ?? t('globalSearch.debug.logTailFailed'));
        } finally {
            setLoading(false);
        }
    }, [enabled, lineCount, logType, t]);

    useEffect(() => {
        if (!enabled) return;
        void fetchLogFiles();
        void fetchLogs();
    }, [enabled, fetchLogFiles, fetchLogs]);

    const filteredLines = useMemo(() => {
        const q = logFilter.trim().toLowerCase();
        const lines = logContent.split('\n');
        if (!q) return lines;
        return lines.filter((line) => stripAnsi(line).toLowerCase().includes(q));
    }, [logContent, logFilter]);

    const uploadLogs = useCallback(async () => {
        if (!enabled) return;
        setUploadLoading(true);
        setUploadResult(null);
        try {
            const data = await adminSettingsApi.uploadLogs();
            if (!data.success || !data.data) {
                toast.error(data.message ?? t('globalSearch.debug.logsUploadFailed'));
                return;
            }

            const normalized = LOG_TYPES.reduce<Record<string, UploadEntry>>((acc, type) => {
                acc[type] = data.data![type as keyof typeof data.data] ?? {
                    success: false,
                    error: t('globalSearch.debug.logTypeMissing'),
                };
                return acc;
            }, {});

            setUploadResult(normalized);
            const ok = LOG_TYPES.filter((type) => normalized[type]?.success).length;

            if (ok === 0) {
                toast.error(t('globalSearch.debug.logsUploadNone'));
            } else if (ok < LOG_TYPES.length) {
                toast.success(
                    t('globalSearch.debug.logsUploadPartial', { ok: String(ok), total: String(LOG_TYPES.length) }),
                );
            } else {
                toast.success(t('globalSearch.debug.logsUploaded'));
            }
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? (error.response?.data?.message ?? error.message)
                : t('globalSearch.debug.logsUploadFailed');
            toast.error(typeof message === 'string' ? message : t('globalSearch.debug.logsUploadFailed'));
        } finally {
            setUploadLoading(false);
        }
    }, [enabled, t]);

    if (!enabled) {
        return <p className='text-muted-foreground text-sm'>{t('globalSearch.debug.logsAdminOnly')}</p>;
    }

    const filesForType = logFiles.filter((file) => file.type === logType);

    return (
        <div className='flex min-h-[24rem] flex-col gap-4 lg:flex-row'>
            <aside className='border-border/60 bg-muted/20 w-full shrink-0 rounded-xl border lg:w-56'>
                <div className='border-border/60 border-b px-3 py-2.5'>
                    <p className='text-foreground text-xs font-medium'>{t('globalSearch.debug.logTypes')}</p>
                </div>
                <ul className='p-2'>
                    {LOG_TYPES.map((type) => {
                        const count = logFiles.filter((f) => f.type === type).length;
                        const active = logType === type;
                        return (
                            <li key={type}>
                                <button
                                    type='button'
                                    onClick={() => setLogType(type)}
                                    className={cn(
                                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                                        active
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-background/60',
                                    )}
                                >
                                    <span className='font-medium uppercase'>{type}</span>
                                    <span className='text-muted-foreground text-[10px] tabular-nums'>{count}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {filesForType.length > 0 ? (
                    <div className='border-border/60 border-t p-2'>
                        <p className='text-muted-foreground px-2 py-1 text-[10px] font-medium uppercase'>
                            {t('globalSearch.debug.logFiles')}
                        </p>
                        <ul className='space-y-1'>
                            {filesForType.map((file) => (
                                <li key={file.name} className='rounded-lg px-2 py-1.5 text-[11px]'>
                                    <p className='text-foreground truncate font-medium'>{file.name}</p>
                                    <p className='text-muted-foreground'>
                                        {formatBytes(file.size)} · {formatLogTime(file.modified)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </aside>

            <div className='flex min-w-0 flex-1 flex-col gap-3'>
                <div className='flex flex-wrap items-center gap-2'>
                    <select
                        value={lineCount}
                        onChange={(e) => setLineCount(Number(e.target.value))}
                        className='border-border bg-background h-9 rounded-lg border px-2 text-sm'
                    >
                        {LINE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {t('globalSearch.debug.linesOption', { count: String(n) })}
                            </option>
                        ))}
                    </select>
                    <Button size='sm' variant='outline' onClick={() => void fetchLogs()} disabled={loading}>
                        {loading ? (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <RefreshCw className='mr-2 h-4 w-4' />
                        )}
                        {t('globalSearch.debug.loadLogs')}
                    </Button>
                    <Button size='sm' onClick={() => void uploadLogs()} disabled={uploadLoading}>
                        {uploadLoading ? (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <UploadCloud className='mr-2 h-4 w-4' />
                        )}
                        {t('globalSearch.debug.uploadAllLogs')}
                    </Button>
                    {logContent ? (
                        <Button size='sm' variant='ghost' onClick={() => void copyToClipboard(logContent, t)}>
                            <Copy className='mr-2 h-4 w-4' />
                            {t('globalSearch.debug.copyLogTail')}
                        </Button>
                    ) : null}
                </div>

                <div className='relative'>
                    <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                        placeholder={t('globalSearch.debug.logFilterPlaceholder')}
                        className='h-9 pl-9'
                    />
                    {logFilter ? (
                        <button
                            type='button'
                            onClick={() => setLogFilter('')}
                            className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1'
                        >
                            <X className='h-3.5 w-3.5' />
                        </button>
                    ) : null}
                </div>

                {logMeta ? (
                    <p className='text-muted-foreground text-xs'>
                        {logMeta.file} · {t('globalSearch.debug.linesShown', { count: String(filteredLines.length) })}
                        {logMeta.lines_count ? ` / ${logMeta.lines_count}` : ''}
                    </p>
                ) : null}

                <div className='border-border/60 bg-muted/10 rounded-xl border p-3'>
                    <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                        <p className='text-foreground text-xs font-medium'>
                            {t('globalSearch.debug.uploadAllTypesTitle')}
                        </p>
                        {uploadResult ? (
                            <span className='text-muted-foreground text-[11px]'>
                                {t('globalSearch.debug.uploadAllTypesSummary', {
                                    ok: String(LOG_TYPES.filter((type) => uploadResult[type]?.success).length),
                                    total: String(LOG_TYPES.length),
                                })}
                            </span>
                        ) : (
                            <span className='text-muted-foreground text-[11px]'>
                                {t('globalSearch.debug.uploadAllTypesHint')}
                            </span>
                        )}
                    </div>
                    <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                        {LOG_TYPES.map((type) => {
                            const entry = uploadResult?.[type];
                            const hasFile = logFiles.some((file) => file.type === type);
                            return (
                                <div
                                    key={type}
                                    className={cn(
                                        'rounded-lg border px-3 py-2 text-xs',
                                        entry?.success
                                            ? 'border-border/50 bg-background/80'
                                            : entry
                                              ? 'border-destructive/30 bg-destructive/5'
                                              : 'border-border/40 bg-background/40',
                                    )}
                                >
                                    <div className='flex items-center justify-between gap-2'>
                                        <span className='font-semibold uppercase'>{type}</span>
                                        <span
                                            className={cn(
                                                entry?.success
                                                    ? 'text-emerald-600'
                                                    : entry
                                                      ? 'text-destructive'
                                                      : 'text-muted-foreground',
                                            )}
                                        >
                                            {entry
                                                ? entry.success
                                                    ? t('globalSearch.debug.uploadOk')
                                                    : t('globalSearch.debug.uploadFailed')
                                                : hasFile
                                                  ? t('globalSearch.debug.uploadPending')
                                                  : t('globalSearch.debug.uploadNoFile')}
                                        </span>
                                    </div>
                                    {entry?.error ? (
                                        <p className='text-muted-foreground mt-1 leading-snug'>{entry.error}</p>
                                    ) : null}
                                    {entry?.url ? (
                                        <div className='mt-2 flex flex-wrap gap-2'>
                                            <a
                                                href={entry.url}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='text-primary inline-flex items-center gap-1 hover:underline'
                                            >
                                                {t('globalSearch.debug.openPaste')}
                                                <ExternalLink className='h-3 w-3' />
                                            </a>
                                            <button
                                                type='button'
                                                className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1'
                                                onClick={() => void copyToClipboard(entry.url!, t)}
                                            >
                                                <Copy className='h-3 w-3' />
                                                {t('common.copy')}
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className='border-border/60 min-h-[18rem] flex-1 overflow-hidden rounded-xl border bg-[#0b0f14]'>
                    {loading && !logContent ? (
                        <div className='text-muted-foreground flex h-full items-center justify-center gap-2 py-16 text-sm'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('globalSearch.debug.loadingLogs')}
                        </div>
                    ) : filteredLines.length === 0 ? (
                        <div className='text-muted-foreground flex h-full items-center justify-center py-16 text-sm'>
                            {logFilter ? t('globalSearch.debug.logFilterEmpty') : t('globalSearch.debug.logEmpty')}
                        </div>
                    ) : (
                        <pre className='custom-scrollbar h-full max-h-[min(50vh,28rem)] overflow-auto p-4 font-mono text-[11px] leading-relaxed'>
                            {filteredLines.map((line, index) => (
                                <div key={`${index}-${line.slice(0, 24)}`} className={lineTone(line)}>
                                    {stripAnsi(line) || ' '}
                                </div>
                            ))}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
}
