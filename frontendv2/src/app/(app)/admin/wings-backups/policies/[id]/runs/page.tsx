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

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, HardDrive, History } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { PageCard } from '@/components/featherui/PageCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useTranslation } from '@/contexts/TranslationContext';
import { safeBack } from '@/lib/safe-back';
import { cn } from '@/lib/utils';

type Run = {
    id: number;
    status: string;
    nodes_ok: number;
    nodes_failed: number;
    nodes_skipped: number;
    started_at: string | null;
    completed_at: string | null;
};

type Item = {
    id: number;
    node_name?: string;
    status: string;
    remote_path?: string;
    bytes?: number;
    error?: string;
};

export default function WingsBackupPolicyRunsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);
    const [runs, setRuns] = useState<Run[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get(`/api/admin/wings-backups/policies/${id}/runs`);
                setRuns(data?.data?.runs ?? []);
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.runsLoadFailed'));
            } finally {
                setLoading(false);
            }
        })();
    }, [id, t]);

    const openRun = async (runId: number) => {
        setSelected(runId);
        setItemsLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/wings-backups/policies/${id}/runs/${runId}`);
            setItems(data?.data?.items ?? []);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.runDetailsFailed'));
        } finally {
            setItemsLoading(false);
        }
    };

    const statusClass = (status: string) => {
        if (status === 'failed') return 'bg-destructive/15 text-destructive';
        if (status === 'partial') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
        if (status === 'completed' || status === 'ok' || status === 'success')
            return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300';
        return 'bg-muted text-muted-foreground';
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminWingsBackups.runsTitle')}
                description={t('adminWingsBackups.runsDescription', { id: String(id) })}
                icon={History}
                actions={
                    <Button variant='outline' onClick={() => safeBack(router, '/admin/wings-backups')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('common.back')}
                    </Button>
                }
            />

            {loading ? (
                <TableSkeleton count={4} />
            ) : runs.length === 0 ? (
                <EmptyState
                    icon={HardDrive}
                    title={t('adminWingsBackups.noRunsTitle')}
                    description={t('adminWingsBackups.noRunsDescription')}
                />
            ) : (
                <div className='grid gap-6 lg:grid-cols-2'>
                    <div className='space-y-3'>
                        <h2 className='text-sm font-semibold'>{t('adminWingsBackups.runsList')}</h2>
                        {runs.map((run) => (
                            <button
                                key={run.id}
                                type='button'
                                className='w-full text-left'
                                onClick={() => openRun(run.id)}
                            >
                                <PageCard
                                    className={cn(
                                        'cursor-pointer p-4 transition-all',
                                        selected === run.id && 'ring-primary/40 ring-2',
                                    )}
                                >
                                    <div className='flex items-center justify-between gap-2'>
                                        <div className='font-semibold'>
                                            #{run.id} · {run.status}
                                        </div>
                                        <span
                                            className={cn(
                                                'rounded-md px-2 py-0.5 text-xs font-medium',
                                                statusClass(run.status),
                                            )}
                                        >
                                            {run.status}
                                        </span>
                                    </div>
                                    <div className='text-muted-foreground mt-1 text-sm'>
                                        {t('adminWingsBackups.runSummary', {
                                            ok: String(run.nodes_ok),
                                            failed: String(run.nodes_failed),
                                            skipped: String(run.nodes_skipped),
                                        })}
                                    </div>
                                    <div className='text-muted-foreground mt-1 text-xs'>{run.started_at ?? '—'}</div>
                                </PageCard>
                            </button>
                        ))}
                    </div>

                    <div className='space-y-3'>
                        <h2 className='text-sm font-semibold'>
                            {selected
                                ? t('adminWingsBackups.runItems', { id: String(selected) })
                                : t('adminWingsBackups.selectRun')}
                        </h2>
                        {!selected ? (
                            <PageCard className='p-6'>
                                <p className='text-muted-foreground text-sm'>{t('adminWingsBackups.selectRunHelp')}</p>
                            </PageCard>
                        ) : itemsLoading ? (
                            <TableSkeleton count={3} />
                        ) : items.length === 0 ? (
                            <PageCard className='p-6'>
                                <p className='text-muted-foreground text-sm'>{t('adminWingsBackups.noItems')}</p>
                            </PageCard>
                        ) : (
                            items.map((item) => (
                                <PageCard key={item.id} className='p-4'>
                                    <div className='flex items-center justify-between gap-2'>
                                        <div className='font-medium'>{item.node_name ?? `#${item.id}`}</div>
                                        <span
                                            className={cn(
                                                'rounded-md px-2 py-0.5 text-xs font-medium',
                                                statusClass(item.status),
                                            )}
                                        >
                                            {item.status}
                                        </span>
                                    </div>
                                    {item.remote_path && (
                                        <div className='text-muted-foreground mt-1 font-mono text-xs break-all'>
                                            {item.remote_path}
                                        </div>
                                    )}
                                    {item.error && <div className='text-destructive mt-2 text-xs'>{item.error}</div>}
                                </PageCard>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
