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
import { toast } from 'sonner';
import {
    HardDrive,
    Plus,
    RefreshCw,
    Play,
    Trash2,
    History,
    Pencil,
    Server,
    HelpCircle,
    CalendarClock,
    Shield,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useTranslation } from '@/contexts/TranslationContext';

type Policy = {
    id: number;
    name: string;
    mode: string;
    scope_type: string;
    is_active: number;
    retention_days: number;
    next_run_at: string | null;
    last_run_at: string | null;
};

type Destination = {
    id: number;
    name: string;
    type: string;
    last_test_ok: number | null;
};

export default function AdminWingsBackupsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [tab, setTab] = useState<'policies' | 'destinations'>('policies');
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningId, setRunningId] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [p, d] = await Promise.all([
                axios.get('/api/admin/wings-backups/policies', { params: { limit: 50 } }),
                axios.get('/api/admin/wings-backups/destinations', { params: { limit: 50 } }),
            ]);
            setPolicies(p.data?.data?.policies ?? []);
            setDestinations(d.data?.data?.destinations ?? []);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const runPolicy = async (id: number) => {
        setRunningId(id);
        try {
            const { data } = await axios.post(`/api/admin/wings-backups/policies/${id}/run`);
            toast.success(t('adminWingsBackups.runSuccess', { status: String(data?.data?.status ?? 'completed') }));
            load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.runFailed'));
        } finally {
            setRunningId(null);
        }
    };

    const deletePolicy = async (policy: Policy) => {
        if (!confirm(t('adminWingsBackups.deletePolicyConfirm', { name: policy.name }))) return;
        try {
            await axios.delete(`/api/admin/wings-backups/policies/${policy.id}`);
            toast.success(t('adminWingsBackups.deletePolicySuccess'));
            load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.deletePolicyFailed'));
        }
    };

    const deleteDestination = async (dest: Destination) => {
        if (!confirm(t('adminWingsBackups.deleteDestinationConfirm', { name: dest.name }))) return;
        try {
            await axios.delete(`/api/admin/wings-backups/destinations/${dest.id}`);
            toast.success(t('adminWingsBackups.deleteDestinationSuccess'));
            load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.deleteDestinationFailed'));
        }
    };

    const testDestination = async (id: number) => {
        try {
            await axios.post(`/api/admin/wings-backups/destinations/${id}/test`);
            toast.success(t('adminWingsBackups.testSuccess'));
            load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.testFailed'));
        }
    };

    const modeLabel = (mode: string) => {
        if (mode === 'volumes') return t('adminWingsBackups.modeVolumes');
        if (mode === 'user_backups_only') return t('adminWingsBackups.modeUserBackups');
        return t('adminWingsBackups.modeFull');
    };

    const scopeLabel = (scope: string) => {
        if (scope === 'nodes') return t('adminWingsBackups.scopeSelectedNodes');
        return t('adminWingsBackups.scopeAllNodes');
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminWingsBackups.title')}
                description={t('adminWingsBackups.description')}
                icon={HardDrive}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' size='icon' onClick={load} title={t('common.refresh')}>
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                        {tab === 'policies' ? (
                            <Button onClick={() => router.push('/admin/wings-backups/policies/new')}>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('adminWingsBackups.newPolicy')}
                            </Button>
                        ) : (
                            <Button onClick={() => router.push('/admin/wings-backups/destinations/new')}>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('adminWingsBackups.newDestination')}
                            </Button>
                        )}
                    </div>
                }
            />

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'policies' | 'destinations')} className='space-y-6'>
                <TabsList className='border-border/30 bg-card/40 flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg border p-1 shadow-sm sm:w-auto'>
                    <TabsTrigger value='policies'>{t('adminWingsBackups.tabPolicies')}</TabsTrigger>
                    <TabsTrigger value='destinations'>{t('adminWingsBackups.tabDestinations')}</TabsTrigger>
                </TabsList>

                <TabsContent value='policies' className='space-y-6'>
                    {loading ? (
                        <TableSkeleton count={4} />
                    ) : policies.length === 0 ? (
                        <EmptyState
                            icon={HardDrive}
                            title={t('adminWingsBackups.emptyPoliciesTitle')}
                            description={t('adminWingsBackups.emptyPoliciesDescription')}
                            action={
                                <Button onClick={() => router.push('/admin/wings-backups/policies/new')}>
                                    <Plus className='mr-2 h-4 w-4' />
                                    {t('adminWingsBackups.newPolicy')}
                                </Button>
                            }
                        />
                    ) : (
                        <div className='grid grid-cols-1 gap-4'>
                            {policies.map((policy) => {
                                const badges: ResourceBadge[] = [
                                    {
                                        label: policy.is_active
                                            ? t('adminWingsBackups.active')
                                            : t('adminWingsBackups.inactive'),
                                        className: policy.is_active
                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                            : 'bg-muted text-muted-foreground',
                                    },
                                    { label: modeLabel(policy.mode) },
                                    { label: scopeLabel(policy.scope_type) },
                                    {
                                        label: t('adminWingsBackups.retentionBadge', {
                                            days: String(policy.retention_days),
                                        }),
                                    },
                                ];
                                return (
                                    <ResourceCard
                                        key={policy.id}
                                        icon={HardDrive}
                                        title={policy.name}
                                        subtitle={
                                            policy.last_run_at
                                                ? t('adminWingsBackups.lastRun', {
                                                      time: String(policy.last_run_at),
                                                  })
                                                : t('adminWingsBackups.neverRun')
                                        }
                                        description={
                                            policy.next_run_at
                                                ? t('adminWingsBackups.nextRun', {
                                                      time: String(policy.next_run_at),
                                                  })
                                                : t('adminWingsBackups.noNextRun')
                                        }
                                        badges={badges}
                                        actions={
                                            <div className='flex items-center gap-1'>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    disabled={runningId === policy.id}
                                                    onClick={() => runPolicy(policy.id)}
                                                    title={t('adminWingsBackups.runNow')}
                                                >
                                                    <Play className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() =>
                                                        router.push(`/admin/wings-backups/policies/${policy.id}/runs`)
                                                    }
                                                    title={t('adminWingsBackups.history')}
                                                >
                                                    <History className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() =>
                                                        router.push(`/admin/wings-backups/policies/${policy.id}/edit`)
                                                    }
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() => deletePolicy(policy)}
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
                </TabsContent>

                <TabsContent value='destinations' className='space-y-6'>
                    {loading ? (
                        <TableSkeleton count={4} />
                    ) : destinations.length === 0 ? (
                        <EmptyState
                            icon={Server}
                            title={t('adminWingsBackups.emptyDestinationsTitle')}
                            description={t('adminWingsBackups.emptyDestinationsDescription')}
                            action={
                                <Button onClick={() => router.push('/admin/wings-backups/destinations/new')}>
                                    <Plus className='mr-2 h-4 w-4' />
                                    {t('adminWingsBackups.newDestination')}
                                </Button>
                            }
                        />
                    ) : (
                        <div className='grid grid-cols-1 gap-4'>
                            {destinations.map((dest) => {
                                const testLabel =
                                    dest.last_test_ok === null || dest.last_test_ok === undefined
                                        ? t('adminWingsBackups.testNever')
                                        : dest.last_test_ok
                                          ? t('adminWingsBackups.testOk')
                                          : t('adminWingsBackups.testFailedBadge');
                                const badges: ResourceBadge[] = [
                                    { label: dest.type.toUpperCase() },
                                    {
                                        label: testLabel,
                                        className:
                                            dest.last_test_ok === 1
                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                                : dest.last_test_ok === 0
                                                  ? 'bg-destructive/15 text-destructive'
                                                  : 'bg-muted text-muted-foreground',
                                    },
                                ];
                                return (
                                    <ResourceCard
                                        key={dest.id}
                                        icon={Server}
                                        title={dest.name}
                                        subtitle={t('adminWingsBackups.lastTest', { status: testLabel })}
                                        badges={badges}
                                        actions={
                                            <div className='flex items-center gap-1'>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() => testDestination(dest.id)}
                                                    title={t('adminWingsBackups.testConnection')}
                                                >
                                                    {t('adminWingsBackups.test')}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() =>
                                                        router.push(`/admin/wings-backups/destinations/${dest.id}/edit`)
                                                    }
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() => deleteDestination(dest)}
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
                </TabsContent>
            </Tabs>

            <div className='grid gap-4 md:grid-cols-3'>
                <PageCard title={t('adminWingsBackups.help.how.title')} icon={CalendarClock}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('adminWingsBackups.help.how.body')}
                    </p>
                </PageCard>
                <PageCard title={t('adminWingsBackups.help.retention.title')} icon={Shield}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('adminWingsBackups.help.retention.body')}
                    </p>
                </PageCard>
                <PageCard title={t('adminWingsBackups.help.tips.title')} icon={HelpCircle}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('adminWingsBackups.help.tips.body')}
                    </p>
                </PageCard>
            </div>
        </div>
    );
}
