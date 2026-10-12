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

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { PageLoading } from '@/components/featherui/PageLoading';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { toast } from 'sonner';
import { Archive, ArrowLeft, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { safeBack } from '@/lib/safe-back';
import Link from 'next/link';

type Run = {
    id: number;
    status: string;
    servers_total: number;
    servers_ok: number;
    servers_failed: number;
    servers_skipped: number;
    started_at: string | null;
    completed_at: string | null;
};

type RunItem = {
    id: number;
    server_id: number;
    server_name?: string;
    server_uuid_short?: string;
    status: string;
    reason?: string | null;
    backup_uuid?: string | null;
    error?: string | null;
};

export default function BackupScheduleRunsPage() {
    const { id } = useParams() as { id: string };
    const { t } = useTranslation();
    const router = useRouter();
    const [policyName, setPolicyName] = React.useState('');
    const [runs, setRuns] = React.useState<Run[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [expanded, setExpanded] = React.useState<number | null>(null);
    const [items, setItems] = React.useState<Record<number, RunItem[]>>({});
    const [loadingItems, setLoadingItems] = React.useState<number | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axios.get(`/api/admin/backup-schedules/${id}/runs`);
                if (cancelled) return;
                setPolicyName(data?.data?.policy?.name ?? '');
                setRuns(data?.data?.runs ?? []);
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'adminBackupSchedules.loadFailed'));
                router.push('/admin/backup-schedules');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, router, t]);

    const toggleRun = async (runId: number) => {
        if (expanded === runId) {
            setExpanded(null);
            return;
        }
        setExpanded(runId);
        if (items[runId]) return;
        setLoadingItems(runId);
        try {
            const { data } = await axios.get(`/api/admin/backup-schedules/${id}/runs/${runId}`);
            setItems((prev) => ({ ...prev, [runId]: data?.data?.items ?? [] }));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminBackupSchedules.loadFailed'));
        } finally {
            setLoadingItems(null);
        }
    };

    if (loading) return <PageLoading />;

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminBackupSchedules.historyTitle')}
                description={policyName}
                icon={Archive}
                actions={
                    <Button variant='outline' onClick={() => safeBack(router, '/admin/backup-schedules')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('common.back')}
                    </Button>
                }
            />

            {runs.length === 0 ? (
                <EmptyState
                    icon={Archive}
                    title={t('adminBackupSchedules.noRunsTitle')}
                    description={t('adminBackupSchedules.noRunsDescription')}
                />
            ) : (
                <div className='grid gap-3'>
                    {runs.map((run) => (
                        <div key={run.id} className='space-y-2'>
                            <ResourceCard
                                key={run.id}
                                icon={Archive}
                                title={`#${run.id} · ${run.status}`}
                                description={t('adminBackupSchedules.runSummary', {
                                    ok: String(run.servers_ok),
                                    failed: String(run.servers_failed),
                                    skipped: String(run.servers_skipped),
                                    total: String(run.servers_total),
                                    started: run.started_at ?? '—',
                                })}
                                actions={
                                    <Button size='sm' variant='ghost' onClick={() => toggleRun(run.id)}>
                                        {expanded === run.id ? (
                                            <ChevronDown className='mr-1 h-4 w-4' />
                                        ) : (
                                            <ChevronRight className='mr-1 h-4 w-4' />
                                        )}
                                        {t('adminBackupSchedules.details')}
                                    </Button>
                                }
                            />
                            {expanded === run.id && (
                                <div className='bg-muted/30 ml-2 space-y-2 rounded-md border p-3 text-sm'>
                                    {loadingItems === run.id ? (
                                        <p className='text-muted-foreground'>{t('common.loading')}</p>
                                    ) : (items[run.id] ?? []).length === 0 ? (
                                        <p className='text-muted-foreground'>{t('adminBackupSchedules.noItems')}</p>
                                    ) : (
                                        (items[run.id] ?? []).map((item) => (
                                            <div
                                                key={item.id}
                                                className='flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0'
                                            >
                                                <div>
                                                    <div className='font-medium'>
                                                        {item.server_name ?? `#${item.server_id}`}{' '}
                                                        <span className='text-muted-foreground'>
                                                            ({item.status}
                                                            {item.reason ? ` · ${item.reason}` : ''})
                                                        </span>
                                                    </div>
                                                    {item.error && (
                                                        <p className='text-destructive text-xs'>{item.error}</p>
                                                    )}
                                                </div>
                                                {item.server_uuid_short && (
                                                    <Link
                                                        href={`/server/${item.server_uuid_short}/backups`}
                                                        className='text-primary inline-flex items-center gap-1 text-xs'
                                                    >
                                                        {t('adminBackupSchedules.openServerBackups')}
                                                        <ExternalLink className='h-3 w-3' />
                                                    </Link>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
