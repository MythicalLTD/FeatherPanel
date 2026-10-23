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

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/featherui/Button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ResourceCard, ResourceTable } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ListPagination } from '@/components/featherui/ListPagination';
import { Clock, Server, AlertTriangle, CheckCircle, XCircle, Eye, FileText, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-errors';
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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.logs.messages.fetchFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.logs.messages.detailsFailed'));
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

    const statusBadgeClass = (status: string) => {
        if (status === 'failed') return 'bg-destructive/10 text-destructive border-destructive/20';
        if (status === 'running') return 'bg-primary/10 text-primary border-primary/20';
        return 'bg-secondary text-secondary-foreground border-transparent';
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
                <>
                    {pagination.totalPages > 1 && (
                        <ListPagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={(nextPage) => setPagination({ ...pagination, page: nextPage })}
                        />
                    )}
                    <ResourceTable>
                        {logs.map((log) => (
                            <ResourceCard
                                key={log.execution_id}
                                icon={getStatusIcon(log.status)}
                                title={`${t('admin.featherzerotrust.logs.execution')}: ${log.execution_id}`}
                                subtitle={`${t('admin.featherzerotrust.logs.startedAt')}: ${formatDate(log.started_at)}`}
                                badges={[
                                    {
                                        label: log.status.toUpperCase(),
                                        className: statusBadgeClass(log.status),
                                    },
                                ]}
                                description={
                                    <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                                            <Server className='h-3.5 w-3.5 shrink-0' />
                                            <span>
                                                {log.total_servers_scanned} {t('admin.featherzerotrust.logs.servers')}
                                            </span>
                                        </div>
                                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                                            <AlertTriangle
                                                className={cn(
                                                    'h-3.5 w-3.5 shrink-0',
                                                    log.total_detections > 0 && 'text-destructive',
                                                )}
                                            />
                                            <span
                                                className={cn(
                                                    log.total_detections > 0 && 'text-destructive font-medium',
                                                )}
                                            >
                                                {log.total_detections} {t('admin.featherzerotrust.logs.detections')}
                                            </span>
                                        </div>
                                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                                            <Clock className='h-3.5 w-3.5 shrink-0' />
                                            <span>{formatDuration(log.details?.duration_seconds)}</span>
                                        </div>
                                        <div className='text-muted-foreground text-xs'>
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
                                        className='h-9'
                                        onClick={() => void fetchLogDetails(log.execution_id)}
                                    >
                                        <Eye className='mr-2 h-4 w-4' />
                                        {t('admin.featherzerotrust.logs.viewDetails')}
                                    </Button>
                                }
                            />
                        ))}
                    </ResourceTable>
                    {pagination.totalPages > 1 && (
                        <ListPagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={(nextPage) => setPagination({ ...pagination, page: nextPage })}
                        />
                    )}
                </>
            )}

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side='right' className='overflow-y-auto sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.featherzerotrust.logs.executionDetails')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.featherzerotrust.logs.executionDetailsDescription', {
                                id: executionLog?.execution_id ?? '',
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    {detailsLoading ? (
                        <div className='flex items-center justify-center py-12'>
                            <RefreshCw className='text-primary h-6 w-6 animate-spin' />
                        </div>
                    ) : (
                        executionLog && (
                            <div className='mt-6 space-y-6'>
                                <div className='grid grid-cols-2 gap-3'>
                                    <div className='fp-surface-solid rounded-xl border px-4 py-3'>
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.featherzerotrust.logs.totalServers')}
                                        </p>
                                        <p className='mt-1 text-sm font-medium'>
                                            {executionLog.total_servers_scanned}
                                        </p>
                                    </div>
                                    <div className='fp-surface-solid rounded-xl border px-4 py-3'>
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.featherzerotrust.logs.totalDetections')}
                                        </p>
                                        <p
                                            className={cn(
                                                'mt-1 text-sm font-medium',
                                                executionLog.total_detections > 0 && 'text-destructive',
                                            )}
                                        >
                                            {executionLog.total_detections}
                                        </p>
                                    </div>
                                </div>

                                <div className='space-y-3'>
                                    <h4 className='flex items-center gap-2 text-sm font-semibold'>
                                        <Server className='text-primary h-4 w-4' />
                                        {t('ui.admin.featherzerotrust.tabs.logsTab.serverScanHistory')}
                                    </h4>
                                    {scanLogs.length === 0 ? (
                                        <p className='text-muted-foreground text-sm'>
                                            {t('ui.admin.featherzerotrust.tabs.logsTab.noIndividualServerLogsFound')}
                                        </p>
                                    ) : (
                                        <div className='space-y-2'>
                                            {scanLogs.map((log) => (
                                                <div
                                                    key={log.id}
                                                    className='fp-surface-solid rounded-xl border p-4'
                                                >
                                                    <div className='flex items-start justify-between gap-3'>
                                                        <div className='min-w-0'>
                                                            <div className='truncate text-sm font-medium'>
                                                                {log.server_name ||
                                                                    t('admin.featherzerotrust.logs.unknownServer')}
                                                            </div>
                                                            <div className='text-muted-foreground truncate font-mono text-[10px]'>
                                                                {log.server_uuid}
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                log.status === 'completed' ? 'secondary' : 'destructive'
                                                            }
                                                            className='shrink-0 text-[10px]'
                                                        >
                                                            {log.status.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <div className='border-border mt-3 grid grid-cols-3 gap-2 border-t pt-3'>
                                                        <div>
                                                            <div className='text-muted-foreground text-[10px]'>
                                                                {t(
                                                                    'ui.admin.featherzerotrust.tabs.logsTab.filesScanned',
                                                                )}
                                                            </div>
                                                            <div className='text-xs font-medium'>
                                                                {log.files_scanned.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className='text-muted-foreground text-[10px]'>
                                                                {t('ui.admin.featherzerotrust.tabs.logsTab.detections')}
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    'text-xs font-medium',
                                                                    log.detections_count > 0 && 'text-destructive',
                                                                )}
                                                            >
                                                                {log.detections_count}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className='text-muted-foreground text-[10px]'>
                                                                {t('ui.admin.featherzerotrust.tabs.logsTab.duration')}
                                                            </div>
                                                            <div className='text-xs font-medium'>
                                                                {formatDuration(log.duration_seconds)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {log.error_message && (
                                                        <div className='border-destructive/20 bg-destructive/5 text-destructive mt-3 rounded-lg border p-2 text-xs'>
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

export default LogsTab;
