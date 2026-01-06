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

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/featherui/Button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import {
    Clock,
    Server,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    FileText,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CronLog {
    id: number;
    execution_id: string;
    started_at: string;
    completed_at: string | null;
    status: 'running' | 'completed' | 'failed';
    total_servers_scanned: number;
    total_detections: number;
    total_errors: number;
    summary: string | null;
    details: {
        duration_seconds?: number;
        nodes?: Array<{
            node_id: number;
            node_name: string;
            servers_scanned: number;
            detections: number;
            errors: number;
            error?: string;
        }>;
    } | null;
    error_message: string | null;
}

interface ScanLog {
    id: number;
    execution_id: string;
    server_uuid: string;
    server_name: string | null;
    node_id: number | null;
    node_name: string | null;
    status: 'completed' | 'failed' | 'skipped';
    files_scanned: number;
    detections_count: number;
    errors_count: number;
    duration_seconds: number | string | null;
    detections: Array<Record<string, unknown>> | null;
    error_message: string | null;
    scanned_at: string;
}

const LogsTab = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<CronLog[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 15,
        total: 0,
        totalPages: 1,
    });

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [executionLog, setExecutionLog] = useState<CronLog | null>(null);
    const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/featherzerotrust/logs', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                },
            });

            if (data.success && data.data) {
                setLogs(data.data.logs || []);
                const pag = data.data.pagination;
                setPagination({
                    page: pag.current_page,
                    pageSize: pag.per_page,
                    total: pag.total_records,
                    totalPages: Math.ceil(pag.total_records / pag.per_page),
                });
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.logs.messages.fetchFailed'));
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, t]);

    const fetchLogDetails = async (executionId: string) => {
        setDetailsLoading(true);
        setDrawerOpen(true);
        try {
            const { data } = await axios.get(`/api/admin/featherzerotrust/logs/${executionId}`);
            if (data.success && data.data) {
                setExecutionLog(data.data.execution);
                setScanLogs(data.data.scan_logs || []);
            } else {
                toast.error(t('admin.featherzerotrust.logs.messages.detailsFailed'));
                setDrawerOpen(false);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.logs.messages.detailsFailed'));
            setDrawerOpen(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return CheckCircle;
            case 'running':
                return Clock;
            case 'failed':
                return XCircle;
            default:
                return Clock;
        }
    };

    const formatDuration = (seconds: number | string | null | undefined) => {
        if (!seconds) return 'N/A';
        const numSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
        if (isNaN(numSeconds)) return 'N/A';
        if (numSeconds < 60) return `${numSeconds.toFixed(1)}s`;
        const minutes = Math.floor(numSeconds / 60);
        const secs = numSeconds % 60;
        return `${minutes}m ${secs.toFixed(0)}s`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className='space-y-6'>
            {loading ? (
                <TableSkeleton count={5} />
            ) : logs.length === 0 ? (
                <EmptyState
                    title={t('admin.featherzerotrust.logs.noLogs')}
                    description={t('admin.featherzerotrust.logs.emptyDescription')}
                    icon={FileText}
                />
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {logs.map((log) => (
                        <ResourceCard
                            key={log.execution_id}
                            icon={getStatusIcon(log.status)}
                            title={`${t('admin.featherzerotrust.logs.execution')}: ${log.execution_id}`}
                            subtitle={`${t('admin.featherzerotrust.logs.startedAt')}: ${formatDate(log.started_at)}`}
                            badges={[
                                {
                                    label: log.status.toUpperCase(),
                                    className: cn(
                                        log.status === 'completed' &&
                                            'bg-green-500/10 text-green-600 border-green-500/20',
                                        log.status === 'failed' && 'bg-red-500/10 text-red-600 border-red-500/20',
                                        log.status === 'running' &&
                                            'bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse',
                                    ),
                                },
                            ]}
                            description={
                                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-2'>
                                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                        <Server className='h-3 w-3' />
                                        <span>
                                            {log.total_servers_scanned} {t('admin.featherzerotrust.logs.servers')}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                        <AlertTriangle
                                            className={cn(
                                                'h-3 w-3',
                                                log.total_detections > 0 ? 'text-destructive' : 'text-muted-foreground',
                                            )}
                                        />
                                        <span
                                            className={cn(log.total_detections > 0 && 'text-destructive font-semibold')}
                                        >
                                            {log.total_detections} {t('admin.featherzerotrust.logs.detections')}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                        <Clock className='h-3 w-3' />
                                        <span>{formatDuration(log.details?.duration_seconds)}</span>
                                    </div>
                                    <div className='text-xs text-muted-foreground'>
                                        {t('admin.featherzerotrust.logs.completed')}:{' '}
                                        {log.completed_at
                                            ? formatDate(log.completed_at)
                                            : t('admin.featherzerotrust.logs.inProgress')}
                                    </div>
                                </div>
                            }
                            actions={
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='transition-all hover:scale-105'
                                    onClick={() => fetchLogDetails(log.execution_id)}
                                >
                                    <Eye className='h-4 w-4 mr-2' />
                                    {t('admin.featherzerotrust.logs.viewDetails')}
                                </Button>
                            }
                        />
                    ))}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className='flex items-center justify-center gap-2 mt-8'>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </Button>
                            <span className='text-sm font-medium'>
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            >
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Log Details Sheet */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side='right' className='sm:max-w-2xl overflow-y-auto'>
                    <SheetHeader>
                        <SheetTitle>Execution Details</SheetTitle>
                        <SheetDescription>
                            Detailed scan results for execution ID: {executionLog?.execution_id}
                        </SheetDescription>
                    </SheetHeader>

                    {detailsLoading ? (
                        <div className='flex items-center justify-center py-12'>
                            <RefreshCw className='h-6 w-6 animate-spin text-primary' />
                        </div>
                    ) : (
                        executionLog && (
                            <div className='space-y-6 mt-6'>
                                {/* Summary Stats */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <Card className='bg-muted/30 border-border/50'>
                                        <CardContent className='p-4'>
                                            <div className='text-xs text-muted-foreground'>Total Servers</div>
                                            <div className='text-2xl font-bold'>
                                                {executionLog.total_servers_scanned}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card
                                        className={cn(
                                            'bg-muted/30 border-border/50',
                                            executionLog.total_detections > 0 &&
                                                'border-destructive/30 bg-destructive/5',
                                        )}
                                    >
                                        <CardContent className='p-4'>
                                            <div className='text-xs text-muted-foreground'>Total Detections</div>
                                            <div
                                                className={cn(
                                                    'text-2xl font-bold',
                                                    executionLog.total_detections > 0 && 'text-destructive',
                                                )}
                                            >
                                                {executionLog.total_detections}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Server Scan Results */}
                                <div className='space-y-4'>
                                    <h4 className='text-sm font-semibold flex items-center gap-2'>
                                        <Server className='h-4 w-4 text-primary' />
                                        Server Scan History
                                    </h4>
                                    {scanLogs.length === 0 ? (
                                        <p className='text-sm text-muted-foreground italic'>
                                            No individual server logs found.
                                        </p>
                                    ) : (
                                        <div className='space-y-3'>
                                            {scanLogs.map((log) => (
                                                <div
                                                    key={log.id}
                                                    className='p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all'
                                                >
                                                    <div className='flex items-start justify-between'>
                                                        <div>
                                                            <div className='text-sm font-bold'>
                                                                {log.server_name ||
                                                                    t('admin.featherzerotrust.logs.unknownServer')}
                                                            </div>
                                                            <div className='text-[10px] text-muted-foreground font-mono'>
                                                                {log.server_uuid}
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                log.status === 'completed' ? 'default' : 'destructive'
                                                            }
                                                            className='text-[10px]'
                                                        >
                                                            {log.status.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <div className='grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/30'>
                                                        <div>
                                                            <div className='text-[10px] text-muted-foreground'>
                                                                Files Scanned
                                                            </div>
                                                            <div className='text-xs font-semibold'>
                                                                {log.files_scanned.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className='text-[10px] text-muted-foreground'>
                                                                Detections
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    'text-xs font-semibold',
                                                                    log.detections_count > 0 && 'text-destructive',
                                                                )}
                                                            >
                                                                {log.detections_count}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className='text-[10px] text-muted-foreground'>
                                                                Duration
                                                            </div>
                                                            <div className='text-xs font-semibold'>
                                                                {formatDuration(log.duration_seconds)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {log.error_message && (
                                                        <div className='mt-3 p-2 bg-destructive/10 rounded-lg text-xs text-destructive border border-destructive/20'>
                                                            {log.error_message}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};

// Internal component for spinning icon
const RefreshCw = ({ className }: { className?: string }) => {
    return (
        <svg
            className={className}
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        >
            <path d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
            <path d='M3 3v5h5' />
            <path d='M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' />
            <path d='M16 16h5v5' />
        </svg>
    );
};

export default LogsTab;
