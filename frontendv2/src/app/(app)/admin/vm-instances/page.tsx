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
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { PageCard } from '@/components/featherui/PageCard';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import {
    Server,
    Plus,
    Search,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Loader2,
    Database,
    Cpu,
    HardDrive,
    User,
    Network,
    HelpCircle,
    Layers,
    X,
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
import { Select } from '@/components/ui/select-native';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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
    suspended?: number;
    ip_address: string | null;
    ip_pool_address?: string | null;
    user_username?: string | null;
    user_email?: string | null;
    user_uuid?: string | null;
    vm_node_id?: number | null;
    created_at: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    from: number;
    to: number;
}

interface VmNode {
    id: number;
    name: string;
    pve_host: string;
}

interface User {
    id: number;
    uuid: string;
    username: string;
    email: string;
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
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        from: 0,
        to: 0,
    });

    const [ownerFilter, setOwnerFilter] = useState('');
    const [nodeFilter, setNodeFilter] = useState('');
    const [statusFilter] = useState('');
    const [sortBy, setSortBy] = useState<'id' | 'hostname' | 'created_at'>('id');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

    const [filterOwner, setFilterOwner] = useState<User | null>(null);
    const [filterNode, setFilterNode] = useState<VmNode | null>(null);
    const [isOwnerFilterModalOpen, setIsOwnerFilterModalOpen] = useState(false);
    const [isNodeFilterModalOpen, setIsNodeFilterModalOpen] = useState(false);
    const [ownerFilterSearch, setOwnerFilterSearch] = useState('');
    const [ownerFilterResults, setOwnerFilterResults] = useState<User[]>([]);
    const [ownerFilterLoading, setOwnerFilterLoading] = useState(false);
    const [nodesList, setNodesList] = useState<VmNode[]>([]);
    const [loadingNodes, setLoadingNodes] = useState(false);
    const [selectedInstance, setSelectedInstance] = useState<VmInstance | null>(null);
    const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vm-instances');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            if (searchQuery !== debouncedSearch) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearch]);

    const fetchInstances = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/vm-instances', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: debouncedSearch || undefined,
                    owner_id: ownerFilter || undefined,
                    node_id: nodeFilter || undefined,
                    status: statusFilter || undefined,
                },
            });

            setInstances(data.data?.instances ?? []);
            const pag = data.data?.pagination ?? {};
            setPagination({
                page: pag.current_page || 1,
                pageSize: pag.per_page || 10,
                total: pag.total_records || 0,
                totalPages: Math.ceil((pag.total_records || 0) / (pag.per_page || 10)),
                hasNext: pag.has_next || false,
                hasPrev: pag.has_prev || false,
                from: pag.from || 0,
                to: pag.to || 0,
            });
        } catch (error) {
            console.error('Error fetching VM instances:', error);
            toast.error(t('admin.vmInstances.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, debouncedSearch, ownerFilter, nodeFilter, statusFilter, t]);

    useEffect(() => {
        fetchWidgets();
        fetchInstances();
    }, [fetchInstances, fetchWidgets]);

    const handleDeleteClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setConfirmDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteId) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/vm-instances/${confirmDeleteId}`);
            toast.success(t('admin.vmInstances.messages.delete_success'));
            setConfirmDeleteId(null);
            fetchInstances();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const fetchOwnerFilterUsers = useCallback(async (query: string) => {
        setOwnerFilterLoading(true);
        try {
            const { data } = await axios.get('/api/admin/users', {
                params: {
                    page: 1,
                    limit: 10,
                    search: query || undefined,
                },
            });

            if (data?.success) {
                setOwnerFilterResults(data.data.users || []);
            } else {
                setOwnerFilterResults([]);
            }
        } catch {
            setOwnerFilterResults([]);
        } finally {
            setOwnerFilterLoading(false);
        }
    }, []);

    const fetchNodes = async () => {
        setLoadingNodes(true);
        try {
            const { data } = await axios.get('/api/admin/vm-nodes', {
                params: { limit: 50 },
            });
            setNodesList(data.data?.vm_nodes || []);
        } catch (error) {
            console.error('Error fetching nodes:', error);
        } finally {
            setLoadingNodes(false);
        }
    };

    const handleView = async (instance: VmInstance) => {
        try {
            const { data } = await axios.get(`/api/admin/vm-instances/${instance.id}`);
            if (data && data.success && data.data) {
                setSelectedInstance(data.data.instance);
                setIsViewDrawerOpen(true);
            } else {
                toast.error(t('admin.vmInstances.messages.fetch_failed'));
            }
        } catch (error) {
            console.error('Error fetching VM instance details:', error);
            toast.error(t('admin.vmInstances.messages.fetch_failed'));
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
                title={t('admin.vmInstances.title')}
                description={t('admin.vmInstances.description')}
                icon={Server}
                actions={
                    <Button size='sm' onClick={() => router.push('/admin/vm-instances/create')}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.vmInstances.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-vm-instances', 'after-header')} />

            <div className='flex flex-col gap-4 items-stretch bg-card/40 backdrop-blur-md p-4 rounded-2xl'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.vmInstances.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
                <div className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Button
                            variant={filterOwner ? 'default' : 'outline'}
                            size='sm'
                            className='h-9 text-xs'
                            onClick={() => {
                                setIsOwnerFilterModalOpen(true);
                                if (!ownerFilterResults.length) {
                                    fetchOwnerFilterUsers('');
                                }
                            }}
                        >
                            <User className='h-3.5 w-3.5 mr-2' />
                            {filterOwner
                                ? t('admin.vmInstances.filters.user_selected', { username: filterOwner.username })
                                : t('admin.vmInstances.filters.user')}
                        </Button>
                        <Button
                            variant={filterNode ? 'default' : 'outline'}
                            size='sm'
                            className='h-9 text-xs'
                            onClick={() => {
                                fetchNodes();
                                setIsNodeFilterModalOpen(true);
                            }}
                        >
                            <Network className='h-3.5 w-3.5 mr-2' />
                            {filterNode
                                ? t('admin.vmInstances.filters.node_selected', { name: filterNode.name })
                                : t('admin.vmInstances.filters.node')}
                        </Button>
                        {(filterOwner || filterNode) && (
                            <Button
                                variant='ghost'
                                size='sm'
                                className='h-9 text-xs'
                                onClick={() => {
                                    setOwnerFilter('');
                                    setNodeFilter('');
                                    setFilterOwner(null);
                                    setFilterNode(null);
                                    setPagination((p) => ({ ...p, page: 1 }));
                                }}
                            >
                                <X className='h-3.5 w-3.5 mr-2' />
                                {t('admin.vmInstances.filters.clear')}
                            </Button>
                        )}
                    </div>
                    <div className='flex items-center gap-2'>
                        <Select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-') as [
                                    'id' | 'hostname' | 'created_at',
                                    'ASC' | 'DESC',
                                ];
                                setSortBy(field);
                                setSortOrder(order);
                            }}
                            className='w-[220px] h-11 rounded-xl bg-background/50 border-border/50 text-sm'
                        >
                            <option value='id-DESC'>{t('admin.vmInstances.sort.newest')}</option>
                            <option value='id-ASC'>{t('admin.vmInstances.sort.oldest')}</option>
                            <option value='hostname-ASC'>{t('admin.vmInstances.sort.hostname_asc')}</option>
                            <option value='hostname-DESC'>{t('admin.vmInstances.sort.hostname_desc')}</option>
                            <option value='created_at-DESC'>{t('admin.vmInstances.sort.created_desc')}</option>
                            <option value='created_at-ASC'>{t('admin.vmInstances.sort.created_asc')}</option>
                        </Select>
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-vm-instances', 'before-list')} />

            {loading ? (
                <TableSkeleton count={5} />
            ) : instances.length === 0 ? (
                <EmptyState
                    icon={Server}
                    title={t('admin.vmInstances.no_results')}
                    description={t('admin.vmInstances.empty_desc')}
                    action={
                        <Button size='sm' onClick={() => router.push('/admin/vm-instances/create')}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.vmInstances.create')}
                        </Button>
                    }
                />
            ) : (
                <>
                    {pagination.totalPages > 1 && (
                        <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50 mb-4'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.hasPrev}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                className='gap-1.5'
                            >
                                <ChevronLeft className='h-4 w-4' />
                                {t('common.previous')}
                            </Button>
                            <span className='text-sm font-medium'>
                                {pagination.page} / {pagination.totalPages}
                                {pagination.total > 0 && ` (${pagination.total} ${t('common.total')})`}
                            </span>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.hasNext}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                className='gap-1.5'
                            >
                                {t('common.next')}
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                    <div className='grid grid-cols-1 gap-4'>
                        {instances.map((inst) => {
                            const badges: ResourceBadge[] = [
                                {
                                    label: inst.node_name || t('admin.vmInstances.unknown_node'),
                                    className: 'bg-primary/10 text-primary border-primary/20',
                                },
                                {
                                    label: inst.user_username || t('admin.vmInstances.unassigned'),
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
                                    onClick={() => router.push(`/vds/${inst.id}`)}
                                    actions={
                                        <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => handleView(inst)}
                                                title={t('admin.servers.actions.view')}
                                            >
                                                <Eye className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => router.push(`/admin/vm-instances/${inst.id}/edit`)}
                                                title={t('common.edit')}
                                            >
                                                <Pencil className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                onClick={(e) => handleDeleteClick(e, inst.id)}
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

                    {pagination.totalPages > 1 && (
                        <div className='flex items-center justify-center gap-2 mt-8'>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={!pagination.hasPrev}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </Button>
                            <span className='text-sm font-medium'>
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={!pagination.hasNext}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                            >
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                </>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <PageCard title={t('admin.vmInstances.help.managing.title')} icon={Server}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vmInstances.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.vmInstances.help.resources.title')} icon={Layers}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vmInstances.help.resources.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.vmInstances.help.tips.title')} icon={HelpCircle} className='md:col-span-2'>
                    <ul className='text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1'>
                        <li>{t('admin.vmInstances.help.tips.item1')}</li>
                        <li>{t('admin.vmInstances.help.tips.item2')}</li>
                        <li>{t('admin.vmInstances.help.tips.item3')}</li>
                    </ul>
                </PageCard>
            </div>

            <AlertDialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.vmInstances.delete_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('admin.vmInstances.delete_confirm_desc')}</AlertDialogDescription>
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
                                    {t('common.deleting')}
                                </>
                            ) : (
                                t('common.delete')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <HeadlessModal
                isOpen={isOwnerFilterModalOpen}
                onClose={() => setIsOwnerFilterModalOpen(false)}
                title={t('admin.vmInstances.filters.select_user')}
            >
                <div className='p-6'>
                    <Input
                        placeholder={t('common.search')}
                        value={ownerFilterSearch}
                        onChange={(e) => {
                            setOwnerFilterSearch(e.target.value);
                            fetchOwnerFilterUsers(e.target.value);
                        }}
                        className='mb-4'
                    />
                    <div className='space-y-2 max-h-[400px] overflow-y-auto'>
                        {ownerFilterLoading ? (
                            <div className='text-center py-4'>
                                <Loader2 className='h-6 w-6 animate-spin mx-auto' />
                            </div>
                        ) : ownerFilterResults.length === 0 ? (
                            <p className='text-center py-4 text-muted-foreground'>{t('common.no_results')}</p>
                        ) : (
                            ownerFilterResults.map((user) => (
                                <button
                                    key={user.id}
                                    type='button'
                                    onClick={() => {
                                        setFilterOwner(user);
                                        setOwnerFilter(String(user.id));
                                        setIsOwnerFilterModalOpen(false);
                                        setPagination((p) => ({ ...p, page: 1 }));
                                    }}
                                    className='w-full p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 text-left'
                                >
                                    <div className='flex flex-col'>
                                        <span className='font-semibold'>{user.username}</span>
                                        <span className='text-xs text-muted-foreground'>{user.email}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isNodeFilterModalOpen}
                onClose={() => setIsNodeFilterModalOpen(false)}
                title={t('admin.vmInstances.filters.select_node')}
            >
                <div className='p-6'>
                    <div className='space-y-2 max-h-[400px] overflow-y-auto'>
                        {loadingNodes ? (
                            <div className='text-center py-4'>
                                <Loader2 className='h-6 w-6 animate-spin mx-auto' />
                            </div>
                        ) : nodesList.length === 0 ? (
                            <p className='text-center py-4 text-muted-foreground'>{t('common.no_results')}</p>
                        ) : (
                            nodesList.map((node) => (
                                <button
                                    key={node.id}
                                    type='button'
                                    onClick={() => {
                                        setFilterNode(node);
                                        setNodeFilter(String(node.id));
                                        setIsNodeFilterModalOpen(false);
                                        setPagination((p) => ({ ...p, page: 1 }));
                                    }}
                                    className='w-full p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 text-left'
                                >
                                    <div className='flex flex-col'>
                                        <span className='font-semibold'>{node.name}</span>
                                        <span className='text-xs text-muted-foreground'>{node.pve_host}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>

            <Sheet open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
                <SheetContent side='right' className='sm:max-w-2xl overflow-y-auto custom-scrollbar'>
                    {selectedInstance && (
                        <>
                            <SheetHeader>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <SheetTitle className='flex items-center gap-2'>
                                            <Server className='h-5 w-5 text-primary' />
                                            {t('admin.vmInstances.details.title')}
                                        </SheetTitle>
                                        <SheetDescription>
                                            {t('admin.vmInstances.details.subtitle', {
                                                name: selectedInstance.hostname || `VM ${selectedInstance.vmid}`,
                                            })}
                                        </SheetDescription>
                                    </div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => router.push(`/vds/${selectedInstance.id}`)}
                                        className='rounded-xl border-dashed'
                                    >
                                        <Eye className='h-4 w-4 mr-2' />
                                        {t('admin.vmInstances.details.view_client_area')}
                                    </Button>
                                </div>
                            </SheetHeader>

                            <div className='mt-8 space-y-6'>
                                <div className='grid grid-cols-1 gap-4'>
                                    <div className='p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                        <h4 className='text-xs font-black uppercase tracking-widest text-primary mb-4'>
                                            {t('admin.vmInstances.details.basic_info')}
                                        </h4>
                                        <div className='space-y-4'>
                                            <DetailItem
                                                label={t('admin.vmInstances.details.labels.vmid')}
                                                value={String(selectedInstance.vmid)}
                                                isMono
                                            />
                                            <DetailItem
                                                label={t('admin.vmInstances.details.labels.hostname')}
                                                value={
                                                    selectedInstance.hostname || t('admin.vmInstances.details.not_set')
                                                }
                                            />
                                            <DetailItem
                                                label={t('admin.vmInstances.details.labels.ip_address')}
                                                value={
                                                    selectedInstance.ip_pool_address ||
                                                    selectedInstance.ip_address ||
                                                    t('admin.vmInstances.details.not_assigned')
                                                }
                                                isMono
                                            />
                                            <DetailItem
                                                label={t('admin.vmInstances.details.labels.status')}
                                                value={
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full border',
                                                            vmStatusStyles[selectedInstance.status] ??
                                                                vmStatusStyles.unknown,
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                'h-2 w-2 rounded-full shrink-0',
                                                                statusDotStyles[selectedInstance.status] ??
                                                                    'bg-muted-foreground',
                                                            )}
                                                        />
                                                        {selectedInstance.status}
                                                    </span>
                                                }
                                            />
                                            <DetailItem
                                                label={t('admin.vmInstances.details.labels.created')}
                                                value={
                                                    selectedInstance.created_at
                                                        ? new Date(selectedInstance.created_at).toLocaleString()
                                                        : 'N/A'
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className='p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                        <h4 className='text-xs font-black uppercase tracking-widest text-primary mb-4'>
                                            {t('admin.vmInstances.details.ownership_node')}
                                        </h4>
                                        <div className='space-y-4'>
                                            <DetailItem
                                                label={t('admin.vmInstances.details.labels.owner')}
                                                value={
                                                    selectedInstance.user_username || t('admin.vmInstances.unassigned')
                                                }
                                            />
                                            {selectedInstance.user_email && (
                                                <DetailItem
                                                    label={t('admin.vmInstances.details.labels.owner_email')}
                                                    value={selectedInstance.user_email}
                                                    isMono
                                                />
                                            )}
                                            <DetailItem
                                                label={t('admin.vmInstances.details.labels.node')}
                                                value={
                                                    selectedInstance.node_name || t('admin.vmInstances.details.unknown')
                                                }
                                            />
                                            {selectedInstance.plan_name && (
                                                <DetailItem
                                                    label={t('admin.vmInstances.details.labels.plan')}
                                                    value={selectedInstance.plan_name}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function DetailItem({ label, value, isMono = false }: { label: string; value: React.ReactNode; isMono?: boolean }) {
    return (
        <div className='flex items-start justify-between gap-4'>
            <span className='text-sm font-medium text-muted-foreground shrink-0'>{label}</span>
            <span className={cn('text-sm text-foreground text-right break-all', isMono && 'font-mono')}>{value}</span>
        </div>
    );
}
