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
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { toast } from 'sonner';
import {
    Archive,
    Plus,
    Search,
    Pencil,
    Trash2,
    Play,
    History,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    HelpCircle,
    CalendarClock,
    Shield,
} from 'lucide-react';

type Policy = {
    id: number;
    name: string;
    scope_type: string;
    is_active: number;
    is_processing: number;
    next_run_at: string | null;
    last_run_at: string | null;
    target_count: number;
    latest_run?: { status: string } | null;
};

const FILTERS_KEY = 'featherpanel_admin_backup_schedules_filters_v1';
const FILTERS_DEFAULTS = { searchQuery: '', page: 1, pageSize: 10 };

export default function AdminBackupSchedulesPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { filters, patchFilters } = usePersistedListFilters(FILTERS_KEY, FILTERS_DEFAULTS);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [runningId, setRunningId] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/backup-schedules', {
                params: {
                    page: filters.page,
                    limit: filters.pageSize,
                    search: filters.searchQuery,
                },
            });
            setPolicies(data?.data?.policies ?? []);
            setTotalPages(data?.data?.pagination?.total_pages ?? 1);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminBackupSchedules.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.page, filters.pageSize, filters.searchQuery]);

    const handleDelete = async (policy: Policy) => {
        if (!confirm(t('adminBackupSchedules.deleteConfirm', { name: policy.name }))) return;
        try {
            await axios.delete(`/api/admin/backup-schedules/${policy.id}`);
            toast.success(t('adminBackupSchedules.deleteSuccess'));
            load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminBackupSchedules.deleteFailed'));
        }
    };

    const handleRun = async (policy: Policy) => {
        setRunningId(policy.id);
        try {
            const { data } = await axios.post(`/api/admin/backup-schedules/${policy.id}/run`);
            toast.success(
                t('adminBackupSchedules.runSuccess', {
                    ok: String(data?.data?.servers_ok ?? 0),
                    failed: String(data?.data?.servers_failed ?? 0),
                }),
            );
            load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminBackupSchedules.runFailed'));
        } finally {
            setRunningId(null);
        }
    };

    const scopeLabel = (scope: string) => {
        if (scope === 'node') return t('adminBackupSchedules.scopeNode');
        if (scope === 'servers') return t('adminBackupSchedules.scopeServers');
        return t('adminBackupSchedules.scopeAll');
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminBackupSchedules.title')}
                description={t('adminBackupSchedules.description')}
                icon={Archive}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' size='icon' onClick={load} title={t('common.refresh')}>
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                        <Button onClick={() => router.push('/admin/backup-schedules/new')}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('adminBackupSchedules.create')}
                        </Button>
                    </div>
                }
            />

            <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('adminBackupSchedules.searchPlaceholder')}
                        value={filters.searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value, page: 1 })}
                        className='h-11 w-full pl-10'
                    />
                </div>
            </div>

            {totalPages > 1 && !loading && (
                <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={filters.page <= 1}
                        onClick={() => patchFilters({ page: filters.page - 1 })}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {filters.page} / {totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={filters.page >= totalPages}
                        onClick={() => patchFilters({ page: filters.page + 1 })}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {loading ? (
                <TableSkeleton count={5} />
            ) : policies.length === 0 ? (
                <EmptyState
                    icon={Archive}
                    title={t('adminBackupSchedules.emptyTitle')}
                    description={t('adminBackupSchedules.emptyDescription')}
                    action={
                        <Button onClick={() => router.push('/admin/backup-schedules/new')}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('adminBackupSchedules.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {policies.map((policy) => {
                        const badges: ResourceBadge[] = [
                            {
                                label: policy.is_processing
                                    ? t('adminBackupSchedules.running')
                                    : policy.is_active
                                      ? t('adminBackupSchedules.active')
                                      : t('adminBackupSchedules.inactive'),
                                className: policy.is_processing
                                    ? 'bg-primary/15 text-primary'
                                    : policy.is_active
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                      : 'bg-muted text-muted-foreground',
                            },
                            { label: scopeLabel(policy.scope_type) },
                            {
                                label: t('adminBackupSchedules.targetCount', {
                                    count: String(policy.target_count ?? 0),
                                }),
                            },
                        ];
                        if (policy.latest_run?.status) {
                            badges.push({
                                label: policy.latest_run.status,
                                className:
                                    policy.latest_run.status === 'failed'
                                        ? 'bg-destructive/15 text-destructive'
                                        : policy.latest_run.status === 'partial'
                                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
                            });
                        }
                        return (
                            <ResourceCard
                                key={policy.id}
                                icon={Archive}
                                title={policy.name}
                                subtitle={
                                    policy.last_run_at
                                        ? t('adminBackupSchedules.lastRun', { time: String(policy.last_run_at) })
                                        : t('adminBackupSchedules.neverRun')
                                }
                                description={
                                    policy.next_run_at
                                        ? t('adminBackupSchedules.nextRun', { time: String(policy.next_run_at) })
                                        : t('adminBackupSchedules.noNextRun')
                                }
                                badges={badges}
                                actions={
                                    <div className='flex items-center gap-1'>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            disabled={runningId === policy.id || policy.is_processing === 1}
                                            onClick={() => handleRun(policy)}
                                            title={t('adminBackupSchedules.runNow')}
                                        >
                                            <Play className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => router.push(`/admin/backup-schedules/${policy.id}/runs`)}
                                            title={t('adminBackupSchedules.history')}
                                        >
                                            <History className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => router.push(`/admin/backup-schedules/${policy.id}/edit`)}
                                            title={t('common.edit')}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => handleDelete(policy)}
                                            title={t('common.delete')}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            <div className='grid gap-4 md:grid-cols-3'>
                <PageCard title={t('adminBackupSchedules.help.schedules.title')} icon={CalendarClock}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('adminBackupSchedules.help.schedules.body')}
                    </p>
                </PageCard>
                <PageCard title={t('adminBackupSchedules.help.retention.title')} icon={Shield}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('adminBackupSchedules.help.retention.body')}
                    </p>
                </PageCard>
                <PageCard title={t('adminBackupSchedules.help.tips.title')} icon={HelpCircle}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('adminBackupSchedules.help.tips.body')}
                    </p>
                </PageCard>
            </div>
        </div>
    );
}
