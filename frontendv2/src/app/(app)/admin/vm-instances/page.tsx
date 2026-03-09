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

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { PageCard } from '@/components/featherui/PageCard';
import { toast } from 'sonner';
import {
    Server,
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    Pencil,
    Trash2,
    Play,
    Square,
    RotateCw,
    Loader2,
    Cpu,
    HardDrive,
    Database,
    Network,
    HelpCircle,
    Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VmInstance {
    id: number;
    vmid: number;
    hostname: string | null;
    node_name: string | null;
    plan_name: string | null;
    plan_memory?: number | null;
    plan_cpus?: number | null;
    plan_cores?: number | null;
    plan_disk?: number | null;
    status: string;
    ip_address: string | null;
    ip_pool_address?: string | null;
    user_username?: string | null;
    user_email?: string | null;
    created_at: string;
}

function formatMemory(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
}

function formatDisk(gb: number): string {
    return `${gb} GB`;
}

export default function VmInstancesPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [instances, setInstances] = useState<VmInstance[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const limit = 10;

    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [poweringId, setPoweringId] = useState<number | null>(null);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vm-instances');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchInstances = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/vm-instances', {
                params: { page, limit, search: debouncedSearch || undefined },
            });
            setInstances(data.data?.instances ?? []);
            const pag = data.data?.pagination ?? {};
            setTotal(pag.total_records ?? 0);
            setTotalPages(Math.ceil((pag.total_records ?? 0) / limit) || 1);
        } catch {
            toast.error(t('admin.vmInstances.errors.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, t]);

    useEffect(() => {
        fetchInstances();
    }, [fetchInstances]);

    useEffect(() => {
        if (debouncedSearch !== searchQuery) setPage(1);
    }, [debouncedSearch, searchQuery]);

    const handlePower = async (id: number, action: 'start' | 'stop' | 'reboot') => {
        setPoweringId(id);
        try {
            await axios.post(`/api/admin/vm-instances/${id}/power`, { action });
            toast.success(t('admin.vmInstances.power_success') ?? `Power action "${action}" completed`);
            fetchInstances();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setPoweringId(null);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setConfirmDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteId) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/vm-instances/${confirmDeleteId}`);
            toast.success(t('admin.vmInstances.delete_success') ?? 'VM instance deleted');
            setConfirmDeleteId(null);
            fetchInstances();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const vmStatusStyles: Record<string, string> = {
        running: 'bg-green-500/10 text-green-600 border-green-500/20',
        stopped: 'bg-red-500/10 text-red-600 border-red-500/20',
        starting: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        stopping: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        suspended: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        error: 'bg-red-500/10 text-red-600 border-red-500/20',
        creating: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        deleting: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        unknown: 'bg-muted text-muted-foreground border-border/50',
    };

    const statusDotStyles: Record<string, string> = {
        running: 'bg-green-500',
        stopped: 'bg-red-500',
        starting: 'bg-blue-500',
        stopping: 'bg-orange-500',
        suspended: 'bg-amber-500',
        error: 'bg-red-500',
        creating: 'bg-blue-500',
        deleting: 'bg-orange-500',
        unknown: 'bg-muted-foreground',
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-vm-instances', 'top-of-page')} />

            <PageHeader
                title={
                    t('navigation.items.virtualServersVds') ?? t('admin.vmInstances.title') ?? 'Virtual Servers (VDS)'
                }
                description={t('admin.vmInstances.description') ?? 'Manage VPS/VM instances on Proxmox nodes'}
                icon={Server}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' size='sm' loading={loading} onClick={() => fetchInstances()}>
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                        <Button size='sm' onClick={() => router.push('/admin/vm-instances/create')}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.vmInstances.create') ?? 'Create instance'}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-vm-instances', 'after-header')} />

            <div className='flex flex-col gap-4 items-stretch bg-card/40 backdrop-blur-md p-4 rounded-2xl'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.vmInstances.search_placeholder') ?? 'Search by hostname, IP, node…'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-vm-instances', 'before-list')} />

            {totalPages > 1 && !loading && (
                <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50 mb-4'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {page} / {totalPages}
                        {total > 0 && ` (${total} ${t('common.total') ?? 'total'})`}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {loading ? (
                <TableSkeleton count={5} />
            ) : instances.length === 0 ? (
                <EmptyState
                    icon={Server}
                    title={t('admin.vmInstances.empty') ?? 'No VM instances'}
                    description={t('admin.vmInstances.empty_desc') ?? 'Create one from a plan (VM Plans or here).'}
                    action={
                        <Button size='sm' onClick={() => router.push('/admin/vm-instances/create')}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.vmInstances.create') ?? 'Create instance'}
                        </Button>
                    }
                />
            ) : (
                <>
                    <div className='grid grid-cols-1 gap-4'>
                        {instances.map((inst) => {
                            const badges: ResourceBadge[] = [
                                {
                                    label: inst.node_name || 'Unknown Node',
                                    className: 'bg-primary/10 text-primary border-primary/20',
                                },
                                {
                                    label: inst.user_username || 'Unassigned',
                                    className: 'bg-muted text-muted-foreground border-border/50',
                                },
                            ];
                            const mem = inst.plan_memory ?? 0;
                            const cpus = (inst.plan_cpus ?? 1) * (inst.plan_cores ?? 1);
                            const disk = inst.plan_disk ?? 0;
                            const ip = inst.ip_pool_address ?? inst.ip_address ?? null;
                            return (
                                <ResourceCard
                                    key={inst.id}
                                    title={inst.hostname ?? `VM ${inst.vmid}`}
                                    subtitle={`VMID ${inst.vmid}`}
                                    icon={Server}
                                    badges={badges}
                                    description={
                                        <div className='flex items-center gap-4 mt-2 flex-wrap'>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full border',
                                                    vmStatusStyles[inst.status] ?? vmStatusStyles.unknown,
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'h-2 w-2 rounded-full shrink-0',
                                                        statusDotStyles[inst.status] ?? 'bg-muted-foreground',
                                                    )}
                                                />
                                                {inst.status}
                                            </span>
                                            {ip && (
                                                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                    <Network className='h-3.5 w-3.5' />
                                                    <span className='font-mono'>{ip}</span>
                                                </div>
                                            )}
                                            {mem > 0 && (
                                                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                    <Database className='h-3.5 w-3.5' />
                                                    <span>{formatMemory(mem)}</span>
                                                </div>
                                            )}
                                            {cpus > 0 && (
                                                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                    <Cpu className='h-3.5 w-3.5' />
                                                    <span>{cpus} vCPU</span>
                                                </div>
                                            )}
                                            {disk > 0 && (
                                                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                    <HardDrive className='h-3.5 w-3.5' />
                                                    <span>{formatDisk(disk)}</span>
                                                </div>
                                            )}
                                        </div>
                                    }
                                    onClick={() => router.push(`/admin/vm-instances/${inst.id}`)}
                                    actions={
                                        <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => router.push(`/admin/vm-instances/${inst.id}`)}
                                                title={t('common.view') ?? 'View'}
                                            >
                                                <Eye className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => router.push(`/admin/vm-instances/${inst.id}/edit`)}
                                                title={t('common.edit') ?? 'Edit'}
                                            >
                                                <Pencil className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-green-600 hover:text-green-700 hover:bg-green-500/10'
                                                disabled={poweringId !== null}
                                                onClick={() => handlePower(inst.id, 'start')}
                                                title='Start'
                                            >
                                                {poweringId === inst.id ? (
                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                ) : (
                                                    <Play className='h-4 w-4' />
                                                )}
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                disabled={poweringId !== null}
                                                onClick={() => handlePower(inst.id, 'stop')}
                                                title='Stop'
                                            >
                                                <Square className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                disabled={poweringId !== null}
                                                onClick={() => handlePower(inst.id, 'reboot')}
                                                title='Reboot'
                                            >
                                                <RotateCw className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                onClick={(e) => handleDeleteClick(e, inst.id)}
                                                title={t('common.delete') ?? 'Delete'}
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    }
                                />
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className='flex items-center justify-center gap-2 mt-8'>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </Button>
                            <span className='text-sm font-medium'>
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                </>
            )}

            <WidgetRenderer widgets={getWidgets('admin-vm-instances', 'bottom-of-page')} />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                <PageCard title={t('admin.vmInstances.help.managing.title') ?? 'Managing VDS'} icon={Server}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vmInstances.help.managing.description') ??
                            'Create instances from VM Plans and templates. Assign an owner so the user sees the server in their panel. Use power actions or open the instance to view details and edit.'}
                    </p>
                </PageCard>
                <PageCard title={t('admin.vmInstances.help.resources.title') ?? 'Plans & resources'} icon={Layers}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vmInstances.help.resources.description') ??
                            'Each instance uses a VM Plan (CPU, memory, disk). Templates are defined per VDS node. Configure plans and templates under VM Nodes (VDS Nodes) and VM Plans.'}
                    </p>
                </PageCard>
                <PageCard
                    title={t('admin.vmInstances.help.tips.title') ?? 'Tips'}
                    icon={HelpCircle}
                    className='md:col-span-2 lg:col-span-3'
                >
                    <ul className='text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1'>
                        <li>
                            {t('admin.vmInstances.help.tips.item1') ??
                                "Assign an owner when creating or editing so the VM appears under the user's servers."}
                        </li>
                        <li>
                            {t('admin.vmInstances.help.tips.item2') ??
                                'Creation runs in the background; the list updates when the clone and setup finish.'}
                        </li>
                        <li>
                            {t('admin.vmInstances.help.tips.item3') ??
                                'Ensure the VDS node has free IPs and templates before creating instances.'}
                        </li>
                    </ul>
                </PageCard>
            </div>

            <AlertDialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('admin.vmInstances.delete_confirm_title') ?? 'Delete VM instance?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.vmInstances.delete_confirm_desc') ??
                                'This will stop and remove the VM from Proxmox and delete the record. This cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                    {t('common.deleting') ?? 'Deleting…'}
                                </>
                            ) : (
                                t('common.delete')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
