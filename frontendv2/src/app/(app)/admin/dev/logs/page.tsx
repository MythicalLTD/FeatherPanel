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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Select } from '@/components/ui/select-native';
import { EmptyState } from '@/components/featherui/EmptyState';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { toast } from 'sonner';
import { FileText, Lock, Loader2, RefreshCw, Trash2, Play, Square } from 'lucide-react';

interface LogFile {
    name: string;
    size: number;
    modified: number;
    type: string;
}

interface LogResponse {
    success: boolean;
    data: {
        logs: string;
        file: string;
        type: string;
        lines_count: number;
    };
    message?: string;
}

interface LogFilesResponse {
    success: boolean;
    data: {
        files: LogFile[];
    };
    message?: string;
}

function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}

export default function LogViewerPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isDeveloperModeEnabled, loading: developerModeLoading } = useDeveloperMode();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState('');
    const [currentLogType, setCurrentLogType] = useState<'app' | 'web'>('app');
    const [lines, setLines] = useState(100);
    const [logFiles, setLogFiles] = useState<LogFile[]>([]);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const logsContainerRef = useRef<HTMLPreElement>(null);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (logsContainerRef.current) {
                logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
            }
        }, 0);
    }, []);

    const fetchLogFiles = useCallback(async () => {
        if (isDeveloperModeEnabled !== true) return;

        try {
            const response = await axios.get<LogFilesResponse>('/api/admin/log-viewer/files');
            if (response.data.success) {
                setLogFiles(response.data.data.files);
            } else {
                toast.error(response.data.message || t('admin.dev.logs.messages.fetch_files_failed'));
            }
        } catch (error) {
            console.error('Failed to fetch log files:', error);
            toast.error(t('admin.dev.logs.messages.fetch_files_failed'));
        }
    }, [isDeveloperModeEnabled, t]);

    const fetchLogs = useCallback(async () => {
        if (isDeveloperModeEnabled !== true) return;

        setLoading(true);
        try {
            const response = await axios.get<LogResponse>('/api/admin/log-viewer/get', {
                params: {
                    type: currentLogType,
                    lines: lines,
                },
            });
            if (response.data.success) {
                setLogs(response.data.data.logs);
                scrollToBottom();
            } else {
                toast.error(response.data.message || t('admin.dev.logs.messages.fetch_failed'));
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            toast.error(t('admin.dev.logs.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [isDeveloperModeEnabled, currentLogType, lines, scrollToBottom, t]);

    const clearLogs = useCallback(async () => {
        if (isDeveloperModeEnabled !== true) return;

        try {
            const response = await axios.post<{ success: boolean; message?: string }>('/api/admin/log-viewer/clear', {
                type: currentLogType,
            });
            if (response.data.success) {
                setLogs('');
                toast.success(t('admin.dev.logs.messages.cleared'));
            } else {
                toast.error(response.data.message || t('admin.dev.logs.messages.clear_failed'));
            }
        } catch (error) {
            console.error('Failed to clear logs:', error);
            toast.error(t('admin.dev.logs.messages.clear_failed'));
        }
    }, [isDeveloperModeEnabled, currentLogType, t]);

    const toggleAutoRefresh = useCallback(() => {
        setAutoRefresh((prev) => {
            const newValue = !prev;
            if (newValue) {
                refreshIntervalRef.current = setInterval(() => {
                    fetchLogs();
                }, 10000); // 10 seconds
            } else {
                if (refreshIntervalRef.current) {
                    clearInterval(refreshIntervalRef.current);
                    refreshIntervalRef.current = null;
                }
            }
            return newValue;
        });
    }, [fetchLogs]);

    useEffect(() => {
        if (isDeveloperModeEnabled === true) {
            fetchLogFiles();
            fetchLogs();
        }
    }, [isDeveloperModeEnabled, fetchLogFiles, fetchLogs]);

    useEffect(() => {
        if (isDeveloperModeEnabled === true) {
            fetchLogs();
        }
    }, [currentLogType, lines, isDeveloperModeEnabled, fetchLogs]);

    useEffect(() => {
        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);

    // Developer Mode Check
    if (developerModeLoading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
        );
    }

    if (isDeveloperModeEnabled === false) {
        return (
            <div className='space-y-6'>
                <EmptyState
                    title={t('admin.dev.developerModeRequired')}
                    description={
                        t('admin.dev.developerModeDescription') ||
                        'Developer mode must be enabled in settings to access developer tools.'
                    }
                    icon={Lock}
                    action={
                        <Button variant='outline' onClick={() => router.push('/admin/settings')}>
                            {t('admin.dev.goToSettings')}
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.dev.logs.title')}
                description={t('admin.dev.logs.description')}
                icon={FileText}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={fetchLogs} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('admin.dev.logs.actions.refresh')}
                        </Button>
                        <Button
                            variant={autoRefresh ? 'default' : 'outline'}
                            onClick={toggleAutoRefresh}
                            disabled={loading}
                        >
                            {autoRefresh ? (
                                <>
                                    <Square className='w-4 h-4 mr-2' />
                                    {t('admin.dev.logs.actions.stop_auto')}
                                </>
                            ) : (
                                <>
                                    <Play className='w-4 h-4 mr-2' />
                                    {t('admin.dev.logs.actions.auto_refresh')}
                                </>
                            )}
                        </Button>
                        <Button variant='destructive' onClick={clearLogs} disabled={loading}>
                            <Trash2 className='w-4 h-4 mr-2' />
                            {t('admin.dev.logs.actions.clear_logs')}
                        </Button>
                    </div>
                }
            />

            <PageCard>
                <div className='flex flex-col md:flex-row gap-4 items-start md:items-center'>
                    <div className='flex items-center gap-2'>
                        <label className='text-sm font-medium'>{t('admin.dev.logs.log_type')}</label>
                        <Select
                            value={currentLogType}
                            onChange={(e) => setCurrentLogType(e.target.value as 'app' | 'web')}
                            className='w-32'
                        >
                            <option value='app'>{t('admin.dev.logs.log_type_app')}</option>
                            <option value='web'>{t('admin.dev.logs.log_type_web')}</option>
                        </Select>
                    </div>
                    <div className='flex items-center gap-2'>
                        <label className='text-sm font-medium'>{t('admin.dev.logs.lines')}</label>
                        <Select
                            value={lines.toString()}
                            onChange={(e) => setLines(parseInt(e.target.value))}
                            className='w-32'
                        >
                            <option value='50'>50</option>
                            <option value='100'>100</option>
                            <option value='200'>200</option>
                            <option value='500'>500</option>
                        </Select>
                    </div>
                </div>
            </PageCard>

            {loading && (
                <div className='flex items-center justify-center py-12'>
                    <div className='flex items-center gap-3'>
                        <Loader2 className='w-6 h-6 animate-spin text-primary' />
                        <span className='text-muted-foreground'>{t('admin.dev.logs.loading')}</span>
                    </div>
                </div>
            )}

            {logFiles.length > 0 && (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {logFiles.map((file) => (
                        <PageCard key={file.name}>
                            <div className='flex items-center justify-between mb-2'>
                                <div className='font-semibold text-sm uppercase'>{file.type}</div>
                                <div className='text-xs text-muted-foreground'>{formatFileSize(file.size)}</div>
                            </div>
                            <div className='text-xs text-muted-foreground space-y-1'>
                                <div>{file.name}</div>
                                <div>
                                    {t('admin.dev.logs.modified')} {formatDate(file.modified)}
                                </div>
                            </div>
                        </PageCard>
                    ))}
                </div>
            )}

            <PageCard>
                <div className='p-4 flex items-center justify-between border-b border-border/50'>
                    <div className='font-semibold'>{t('admin.dev.logs.logs_output')}</div>
                    <div className='flex items-center gap-2'>
                        <span className='text-sm text-muted-foreground'>
                            {logs.split('\n').length} {t('admin.dev.logs.lines_count')}
                        </span>
                        <Button variant='outline' size='sm' onClick={() => setLogs('')}>
                            {t('admin.dev.logs.clear')}
                        </Button>
                    </div>
                </div>
                <pre
                    ref={logsContainerRef}
                    className='text-xs whitespace-pre-wrap bg-black text-green-300 p-4 min-h-[400px] max-h-[600px] overflow-auto font-mono rounded-b-xl'
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace" }}
                >
                    {logs || t('admin.dev.logs.no_logs')}
                </pre>
            </PageCard>
        </div>
    );
}
