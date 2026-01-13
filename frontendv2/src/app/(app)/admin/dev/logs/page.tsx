/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
                toast.success(t('admin.dev.logs.messages.cleared') || 'Logs cleared successfully');
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
                    title={t('admin.dev.developerModeRequired') || 'Developer Mode Required'}
                    description={
                        t('admin.dev.developerModeDescription') ||
                        'Developer mode must be enabled in settings to access developer tools.'
                    }
                    icon={Lock}
                    action={
                        <Button variant='outline' onClick={() => router.push('/admin/settings')}>
                            {t('admin.dev.goToSettings') || 'Go to Settings'}
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.dev.logs.title') || 'Log Viewer'}
                description={t('admin.dev.logs.description') || 'View and manage application logs'}
                icon={FileText}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={fetchLogs} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('admin.dev.logs.actions.refresh') || 'Refresh'}
                        </Button>
                        <Button
                            variant={autoRefresh ? 'default' : 'outline'}
                            onClick={toggleAutoRefresh}
                            disabled={loading}
                        >
                            {autoRefresh ? (
                                <>
                                    <Square className='w-4 h-4 mr-2' />
                                    {t('admin.dev.logs.actions.stop_auto') || 'Stop Auto'}
                                </>
                            ) : (
                                <>
                                    <Play className='w-4 h-4 mr-2' />
                                    {t('admin.dev.logs.actions.auto_refresh') || 'Auto Refresh'}
                                </>
                            )}
                        </Button>
                        <Button variant='destructive' onClick={clearLogs} disabled={loading}>
                            <Trash2 className='w-4 h-4 mr-2' />
                            {t('admin.dev.logs.actions.clear_logs') || 'Clear Logs'}
                        </Button>
                    </div>
                }
            />

            {/* Controls */}
            <PageCard>
                <div className='flex flex-col md:flex-row gap-4 items-start md:items-center'>
                    <div className='flex items-center gap-2'>
                        <label className='text-sm font-medium'>{t('admin.dev.logs.log_type') || 'Log Type:'}</label>
                        <Select
                            value={currentLogType}
                            onChange={(e) => setCurrentLogType(e.target.value as 'app' | 'web')}
                            className='w-32'
                        >
                            <option value='app'>{t('admin.dev.logs.log_type_app') || 'App Logs'}</option>
                            <option value='web'>{t('admin.dev.logs.log_type_web') || 'Web Logs'}</option>
                        </Select>
                    </div>
                    <div className='flex items-center gap-2'>
                        <label className='text-sm font-medium'>{t('admin.dev.logs.lines') || 'Lines:'}</label>
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

            {/* Loading */}
            {loading && (
                <div className='flex items-center justify-center py-12'>
                    <div className='flex items-center gap-3'>
                        <Loader2 className='w-6 h-6 animate-spin text-primary' />
                        <span className='text-muted-foreground'>
                            {t('admin.dev.logs.loading') || 'Loading logs...'}
                        </span>
                    </div>
                </div>
            )}

            {/* Log Files Info */}
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
                                    {t('admin.dev.logs.modified') || 'Modified:'} {formatDate(file.modified)}
                                </div>
                            </div>
                        </PageCard>
                    ))}
                </div>
            )}

            {/* Logs Output */}
            <PageCard>
                <div className='p-4 flex items-center justify-between border-b border-border/50'>
                    <div className='font-semibold'>{t('admin.dev.logs.logs_output') || 'Logs Output'}</div>
                    <div className='flex items-center gap-2'>
                        <span className='text-sm text-muted-foreground'>
                            {logs.split('\n').length} {t('admin.dev.logs.lines_count') || 'lines'}
                        </span>
                        <Button variant='outline' size='sm' onClick={() => setLogs('')}>
                            {t('admin.dev.logs.clear') || 'Clear'}
                        </Button>
                    </div>
                </div>
                <pre
                    ref={logsContainerRef}
                    className='text-xs whitespace-pre-wrap bg-black text-green-300 p-4 min-h-[400px] max-h-[600px] overflow-auto font-mono rounded-b-xl'
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace" }}
                >
                    {logs || t('admin.dev.logs.no_logs') || 'No logs available'}
                </pre>
            </PageCard>
        </div>
    );
}
