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
import axios, { isAxiosError } from 'axios';
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
    ShieldCheck,
    ArrowLeftRight,
    X,
    Loader2,
    Database,
    Cpu,
    HardDrive,
    User,
    Layers,
    Gauge,
    HelpCircle,
    AlertTriangle,
    Network,
} from 'lucide-react';
import { StatusBadge } from '@/components/servers/StatusBadge';
import { displayStatus } from '@/lib/server-utils';
import { ApiServer, Pagination, ApiNode, ApiAllocation } from '@/types/adminServerTypes';
import type { Server as ServerType } from '@/types/server';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select-native';
import { HeadlessModal } from '@/components/ui/headless-modal';

export default function ServersPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [servers, setServers] = useState<ApiServer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [isHardDelete, setIsHardDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [selectedServer, setSelectedServer] = useState<ApiServer | null>(null);
    const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);

    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [transferServer, setTransferServer] = useState<ApiServer | null>(null);
    const [isInitiatingTransfer, setIsInitiatingTransfer] = useState(false);
    const [cancellingTransferId, setCancellingTransferId] = useState<number | null>(null);

    const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<ApiNode | null>(null);
    const [selectedAllocation, setSelectedAllocation] = useState<ApiAllocation | null>(null);
    const [nodesList, setNodesList] = useState<ApiNode[]>([]);
    const [allocationsList, setAllocationsList] = useState<ApiAllocation[]>([]);
    const [loadingNodes, setLoadingNodes] = useState(false);
    const [loadingAllocations, setLoadingAllocations] = useState(false);
    const [nodeSearch, setNodeSearch] = useState('');
    const [allocationSearch, setAllocationSearch] = useState('');

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
    const [realmFilter, setRealmFilter] = useState('');
    const [spellFilter, setSpellFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [serverIdFilter, setServerIdFilter] = useState('');
    const [uuidFilter, setUuidFilter] = useState('');
    const [externalIdFilter, setExternalIdFilter] = useState('');
    const [sortBy, setSortBy] = useState<'id' | 'name' | 'created_at' | 'updated_at'>('id');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [filterOwner, setFilterOwner] = useState<{ id: number; username: string; email?: string } | null>(null);
    const [filterNode, setFilterNode] = useState<ApiNode | null>(null);
    const [filterRealm, setFilterRealm] = useState<{ id: number; name: string } | null>(null);
    const [filterSpell, setFilterSpell] = useState<{ id: number; name: string } | null>(null);
    const [filterLocation, setFilterLocation] = useState<{ id: number; name: string } | null>(null);
    const [isOwnerFilterModalOpen, setIsOwnerFilterModalOpen] = useState(false);
    const [isNodeFilterModalOpen, setIsNodeFilterModalOpen] = useState(false);
    const [isRealmFilterModalOpen, setIsRealmFilterModalOpen] = useState(false);
    const [isSpellFilterModalOpen, setIsSpellFilterModalOpen] = useState(false);
    const [isLocationFilterModalOpen, setIsLocationFilterModalOpen] = useState(false);
    const [ownerFilterSearch, setOwnerFilterSearch] = useState('');
    const [ownerFilterResults, setOwnerFilterResults] = useState<
        { id: number; uuid: string; username: string; email: string }[]
    >([]);
    const [ownerFilterLoading, setOwnerFilterLoading] = useState(false);
    const [realmFilterSearch, setRealmFilterSearch] = useState('');
    const [spellFilterSearch, setSpellFilterSearch] = useState('');
    const [locationFilterSearch, setLocationFilterSearch] = useState('');
    const [realmsList, setRealmsList] = useState<{ id: number; name: string; description?: string }[]>([]);
    const [spellsList, setSpellsList] = useState<{ id: number; name: string; description?: string }[]>([]);
    const [locationsList, setLocationsList] = useState<{ id: number; name: string; description?: string }[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

    const fetchServers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/servers', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: debouncedSearchQuery || undefined,
                    owner_id: ownerFilter || undefined,
                    node_id: nodeFilter || undefined,
                    realm_id: realmFilter || undefined,
                    spell_id: spellFilter || undefined,
                    location_id: locationFilter || undefined,
                    server_id: serverIdFilter || undefined,
                    uuid: uuidFilter || undefined,
                    external_id: externalIdFilter || undefined,
                    sort_by: sortBy,
                    sort_order: sortOrder,
                },
            });

            setServers(data.data.servers || []);
            const apiPagination = data.data.pagination;
            setPagination({
                page: apiPagination.current_page,
                pageSize: apiPagination.per_page,
                total: apiPagination.total_records,
                totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                hasNext: apiPagination.has_next,
                hasPrev: apiPagination.has_prev,
                from: apiPagination.from,
                to: apiPagination.to,
            });
        } catch (error) {
            console.error('Error fetching servers:', error);
            toast.error(t('admin.servers.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [
        pagination.page,
        pagination.pageSize,
        debouncedSearchQuery,
        ownerFilter,
        nodeFilter,
        realmFilter,
        spellFilter,
        locationFilter,
        serverIdFilter,
        uuidFilter,
        externalIdFilter,
        sortBy,
        sortOrder,
        t,
    ]);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-servers');

    useEffect(() => {
        fetchWidgets();
        fetchServers();
    }, [fetchServers, refreshKey, fetchWidgets]);

    const handleDelete = (server: ApiServer, hard: boolean = false) => {
        setConfirmDeleteId(server.id);
        setIsHardDelete(hard);
    };

    const confirmDelete = async () => {
        if (!confirmDeleteId) return;
        setDeleting(true);
        try {
            const endpoint = isHardDelete
                ? `/api/admin/servers/${confirmDeleteId}/hard`
                : `/api/admin/servers/${confirmDeleteId}`;

            await axios.delete(endpoint);
            toast.success(
                t(
                    isHardDelete
                        ? 'admin.servers.messages.hard_delete_success'
                        : 'admin.servers.messages.delete_success',
                ),
            );
            setRefreshKey((prev) => prev + 1);
            setConfirmDeleteId(null);
        } catch (error) {
            console.error('Error deleting server:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.servers.messages.delete_failed'));
            }
        } finally {
            setDeleting(false);
        }
    };

    const handleView = async (server: ApiServer) => {
        try {
            const { data } = await axios.get(`/api/admin/servers/${server.id}`);
            if (data && data.success && data.data) {
                setSelectedServer(data.data);
                setIsViewDrawerOpen(true);
            } else {
                toast.error(t('admin.servers.messages.fetch_details_failed'));
            }
        } catch (error) {
            console.error('Error fetching server details:', error);
            toast.error(t('admin.servers.messages.fetch_details_failed'));
        }
    };

    const handleCancelTransfer = async (server: ApiServer) => {
        setCancellingTransferId(server.id);
        try {
            await axios.delete(`/api/admin/servers/${server.id}/transfer`);
            toast.success(t('admin.servers.messages.transfer_cancelled'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error cancelling transfer:', error);
            toast.error(t('admin.servers.messages.transfer_cancel_failed'));
        } finally {
            setCancellingTransferId(null);
        }
    };

    const openTransferDialog = (server: ApiServer) => {
        setTransferServer(server);
        setSelectedNode(null);
        setSelectedAllocation(null);
        setIsTransferDialogOpen(true);
    };

    const fetchNodes = async (search: string = '') => {
        setLoadingNodes(true);
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: {
                    limit: 50,
                    search,
                },
            });

            const filteredNodes = (data.data.nodes || []).filter(
                (node: ApiNode) => String(node.id) !== String(transferServer?.node_id),
            );
            setNodesList(filteredNodes);
        } catch (error) {
            console.error('Error fetching nodes for transfer:', error);
        } finally {
            setLoadingNodes(false);
        }
    };

    const fetchAllocations = async (nodeId: number, search: string = '') => {
        setLoadingAllocations(true);
        try {
            const { data } = await axios.get('/api/admin/allocations', {
                params: {
                    limit: 50,
                    node_id: nodeId,
                    not_used: true,
                    search: search || undefined,
                },
            });
            setAllocationsList(data.data.allocations || []);
        } catch (error) {
            console.error('Error fetching allocations for transfer:', error);
        } finally {
            setLoadingAllocations(false);
        }
    };

    const initiateTransfer = async () => {
        if (!transferServer || !selectedNode || !selectedAllocation) return;

        setIsInitiatingTransfer(true);
        try {
            await axios.post(`/api/admin/servers/${transferServer.id}/transfer`, {
                destination_node_id: selectedNode.id,
                destination_allocation_id: selectedAllocation.id,
            });
            toast.success(t('admin.servers.messages.transfer_initiated'));
            setIsTransferDialogOpen(false);
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error initiating transfer:', error);
            toast.error(t('admin.servers.messages.transfer_failed'));
        } finally {
            setIsInitiatingTransfer(false);
        }
    };

    const formatMemory = (mb: number) => {
        if (mb === 0) return '∞';
        if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb} MB`;
    };

    const formatDisk = (mb: number) => {
        if (mb === 0) return '∞';
        if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb} MB`;
    };

    const formatCpu = (cpu: number) => {
        if (cpu === 0) return '∞';
        return `${cpu}%`;
    };

    const fetchOwnerFilterUsers = useCallback(
        async (query: string) => {
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
        },
        [],
    );

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-servers', 'top-of-page')} />

            <PageHeader
                title={t('admin.servers.title')}
                description={t('admin.servers.description')}
                icon={Server}
                actions={
                    <Button onClick={() => router.push('/admin/servers/create')}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.servers.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-servers', 'after-header')} />

            <div className='flex flex-col gap-4 items-stretch bg-card/40 backdrop-blur-md p-4 rounded-2xl'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.servers.search_placeholder')}
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
                                ? t('admin.servers.filters.user_selected', { username: filterOwner.username })
                                : t('admin.servers.filters.user')}
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
                                ? t('admin.servers.filters.node_selected', { name: filterNode.name })
                                : t('admin.servers.filters.node')}
                        </Button>
                        <Button
                            variant={filterRealm ? 'default' : 'outline'}
                            size='sm'
                            className='h-9 text-xs'
                            onClick={() => {
                                setIsRealmFilterModalOpen(true);
                            }}
                        >
                            <Layers className='h-3.5 w-3.5 mr-2' />
                            {filterRealm
                                ? t('admin.servers.filters.realm_selected', { name: filterRealm.name })
                                : t('admin.servers.filters.realm')}
                        </Button>
                        <Button
                            variant={filterSpell ? 'default' : 'outline'}
                            size='sm'
                            className='h-9 text-xs'
                            onClick={() => {
                                setIsSpellFilterModalOpen(true);
                                if (!spellsList.length) {
                                    // initial load without search
                                    axios
                                        .get('/api/admin/spells', {
                                            params: { page: 1, limit: 25, realm_id: filterRealm?.id || undefined },
                                        })
                                        .then(({ data }) => setSpellsList(data?.data?.spells || []))
                                        .catch(() => setSpellsList([]));
                                }
                            }}
                        >
                            <Gauge className='h-3.5 w-3.5 mr-2' />
                            {filterSpell
                                ? t('admin.servers.filters.spell_selected', { name: filterSpell.name })
                                : t('admin.servers.filters.spell')}
                        </Button>
                        <Button
                            variant={filterLocation ? 'default' : 'outline'}
                            size='sm'
                            className='h-9 text-xs'
                            onClick={() => {
                                setIsLocationFilterModalOpen(true);
                                if (!locationsList.length) {
                                    axios
                                        .get('/api/admin/locations', {
                                            params: { page: 1, limit: 25 },
                                        })
                                        .then(({ data }) => setLocationsList(data?.data?.locations || []))
                                        .catch(() => setLocationsList([]));
                                }
                            }}
                        >
                            <Database className='h-3.5 w-3.5 mr-2' />
                            {filterLocation
                                ? t('admin.servers.filters.location_selected', { name: filterLocation.name })
                                : t('admin.servers.filters.location')}
                        </Button>
                        <Button
                            variant='ghost'
                            size='sm'
                            className='h-9 text-xs'
                            onClick={() => setShowAdvancedFilters((prev) => !prev)}
                        >
                            {t('admin.servers.filters.advanced')}
                        </Button>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-') as [
                                    'id' | 'name' | 'created_at' | 'updated_at',
                                    'ASC' | 'DESC',
                                ];
                                setSortBy(field);
                                setSortOrder(order);
                            }}
                            className='w-[220px] h-11 rounded-xl bg-background/50 border-border/50 text-sm'
                        >
                            <option value='id-DESC'>{t('admin.servers.sort.newest')}</option>
                            <option value='id-ASC'>{t('admin.servers.sort.oldest')}</option>
                            <option value='name-ASC'>{t('admin.servers.sort.name_asc')}</option>
                            <option value='name-DESC'>{t('admin.servers.sort.name_desc')}</option>
                            <option value='created_at-DESC'>{t('admin.servers.sort.created_desc')}</option>
                            <option value='created_at-ASC'>{t('admin.servers.sort.created_asc')}</option>
                        </Select>
                    </div>
                </div>
                {showAdvancedFilters && (
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3 pt-2'>
                        <Input
                            type='number'
                            min={1}
                            value={serverIdFilter}
                            onChange={(e) => {
                                setServerIdFilter(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            placeholder={t('admin.servers.filters.server_id')}
                            className='h-9 text-xs'
                        />
                        <Input
                            value={uuidFilter}
                            onChange={(e) => {
                                setUuidFilter(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            placeholder={t('admin.servers.filters.uuid')}
                            className='h-9 text-xs'
                        />
                        <Input
                            value={externalIdFilter}
                            onChange={(e) => {
                                setExternalIdFilter(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            placeholder={t('admin.servers.filters.external_id')}
                            className='h-9 text-xs'
                        />
                        <Button
                            variant='ghost'
                            size='sm'
                            className='h-9 justify-start text-xs'
                            onClick={() => {
                                setOwnerFilter('');
                                setNodeFilter('');
                                setFilterOwner(null);
                                setFilterNode(null);
                                setRealmFilter('');
                                setSpellFilter('');
                                setLocationFilter('');
                                setFilterRealm(null);
                                setFilterSpell(null);
                                setFilterLocation(null);
                                setServerIdFilter('');
                                setUuidFilter('');
                                setExternalIdFilter('');
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            {t('admin.servers.filters.clear')}
                        </Button>
                    </div>
                )}
            </div>

            <WidgetRenderer widgets={getWidgets('admin-servers', 'before-list')} />

            {loading ? (
                <TableSkeleton count={5} />
            ) : servers.length === 0 ? (
                <EmptyState
                    icon={Server}
                    title={t('admin.servers.no_results')}
                    description={t('admin.servers.search_placeholder')}
                    action={
                        <Button onClick={() => router.push('/admin/servers/create')}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.servers.create')}
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
                        {servers.map((server) => {
                            const badges: ResourceBadge[] = [
                                {
                                    label: server.node?.name || 'Unknown Node',
                                    className: 'bg-primary/10 text-primary border-primary/20',
                                },
                                {
                                    label: server.owner?.username || 'System',
                                    className: 'bg-muted text-muted-foreground border-border/50',
                                },
                            ];

                            const serverStatus = displayStatus(server as unknown as ServerType);
                            return (
                                <ResourceCard
                                    key={server.id}
                                    title={server.name}
                                    subtitle={server.uuidShort}
                                    icon={Server}
                                    badges={badges}
                                    description={
                                        <div className='flex items-center gap-4 mt-2 flex-wrap'>
                                            <StatusBadge status={serverStatus} t={t} />
                                            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                <Database className='h-3.5 w-3.5' />
                                                <span>{formatMemory(server.memory)}</span>
                                            </div>
                                            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                <Cpu className='h-3.5 w-3.5' />
                                                <span>{formatCpu(server.cpu)}</span>
                                            </div>
                                            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                <HardDrive className='h-3.5 w-3.5' />
                                                <span>{formatDisk(server.disk)}</span>
                                            </div>
                                        </div>
                                    }
                                    actions={
                                        <div className='flex items-center gap-2'>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => handleView(server)}
                                                title={t('admin.servers.actions.view')}
                                            >
                                                <Eye className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => router.push(`/admin/servers/${server.id}/edit`)}
                                                title={t('admin.servers.actions.edit')}
                                            >
                                                <Pencil className='h-4 w-4' />
                                            </Button>
                                            {server.status === 'transferring' ? (
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                                                    onClick={() => handleCancelTransfer(server)}
                                                    loading={cancellingTransferId === server.id}
                                                    title={t('common.cancel')}
                                                >
                                                    <X className='h-4 w-4' />
                                                </Button>
                                            ) : (
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() => openTransferDialog(server)}
                                                    title={t('admin.servers.actions.transfer')}
                                                >
                                                    <ArrowLeftRight className='h-4 w-4' />
                                                </Button>
                                            )}

                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                onClick={() => handleDelete(server)}
                                                title={t('admin.servers.actions.delete')}
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

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                <PageCard title={t('admin.servers.help.managing.title')} icon={Server}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.servers.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.servers.help.relationships.title')} icon={Layers}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.servers.help.relationships.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.servers.help.resources.title')} icon={Gauge}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.servers.help.resources.description')}
                    </p>
                </PageCard>
                <PageCard
                    title={t('admin.servers.help.tips.title')}
                    icon={HelpCircle}
                    className='md:col-span-2 lg:col-span-3'
                >
                    <ul className='text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1'>
                        <li>{t('admin.servers.help.tips.item1')}</li>
                        <li>{t('admin.servers.help.tips.item2')}</li>
                        <li>{t('admin.servers.help.tips.item3')}</li>
                    </ul>
                </PageCard>
            </div>

            <Sheet open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
                <SheetContent side='right' className='sm:max-w-2xl overflow-y-auto custom-scrollbar'>
                    {selectedServer && (
                        <>
                            <SheetHeader>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <SheetTitle className='flex items-center gap-2'>
                                            <Server className='h-5 w-5 text-primary' />
                                            {t('admin.servers.details.title')}
                                        </SheetTitle>
                                        <SheetDescription>
                                            {t('admin.servers.details.subtitle', { name: selectedServer?.name })}
                                        </SheetDescription>
                                    </div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => router.push(`/server/${selectedServer?.uuidShort}`)}
                                        className='rounded-xl border-dashed'
                                    >
                                        <Eye className='h-4 w-4 mr-2' />
                                        {t('admin.servers.details.view_console')}
                                    </Button>
                                </div>
                            </SheetHeader>

                            <div className='mt-8 space-y-8'>
                                <Tabs defaultValue='details' className='w-full'>
                                    <TabsList className='grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl'>
                                        <TabsTrigger
                                            value='details'
                                            className='rounded-lg font-bold text-xs uppercase tracking-widest'
                                        >
                                            {t('admin.servers.details.tabs.details')}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value='resources'
                                            className='rounded-lg font-bold text-xs uppercase tracking-widest'
                                        >
                                            {t('admin.servers.details.tabs.resources')}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value='relationships'
                                            className='rounded-lg font-bold text-xs uppercase tracking-widest'
                                        >
                                            {t('admin.servers.details.tabs.relationships')}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value='details' className='mt-6 space-y-6'>
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                            <div className='p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                                <h4 className='text-xs font-black uppercase tracking-widest text-primary mb-4'>
                                                    {t('admin.servers.details.basic_info')}
                                                </h4>
                                                <div className='space-y-4'>
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.uuid')}
                                                        value={selectedServer?.uuid}
                                                        isMono
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.short_uuid')}
                                                        value={selectedServer?.uuidShort}
                                                        isMono
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.created')}
                                                        value={
                                                            selectedServer?.created_at
                                                                ? new Date(selectedServer.created_at).toLocaleString()
                                                                : 'N/A'
                                                        }
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.updated')}
                                                        value={
                                                            selectedServer?.updated_at
                                                                ? new Date(selectedServer.updated_at).toLocaleString()
                                                                : 'N/A'
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className='p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                                <h4 className='text-xs font-black uppercase tracking-widest text-primary mb-4'>
                                                    {t('admin.servers.details.configuration')}
                                                </h4>
                                                <div className='space-y-4'>
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.image')}
                                                        value={selectedServer?.image}
                                                        truncate
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.startup')}
                                                        value={selectedServer?.startup}
                                                        isMono
                                                        truncate
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.skip_scripts')}
                                                        value={
                                                            selectedServer?.skip_scripts
                                                                ? t('common.yes')
                                                                : t('common.no')
                                                        }
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.oom_disabled')}
                                                        value={
                                                            selectedServer?.oom_disabled
                                                                ? t('common.yes')
                                                                : t('common.no')
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value='resources' className='mt-6 space-y-6'>
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                            <div className='p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                                <h4 className='text-xs font-black uppercase tracking-widest text-primary mb-4'>
                                                    {t('admin.servers.details.resource_limits')}
                                                </h4>
                                                <div className='space-y-4'>
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.memory')}
                                                        value={formatMemory(selectedServer?.memory || 0)}
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.swap')}
                                                        value={formatMemory(selectedServer?.swap || 0)}
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.disk')}
                                                        value={formatDisk(selectedServer?.disk || 0)}
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.cpu')}
                                                        value={formatCpu(selectedServer?.cpu || 0)}
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.io')}
                                                        value={selectedServer?.io}
                                                    />
                                                </div>
                                            </div>

                                            <div className='p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                                <h4 className='text-xs font-black uppercase tracking-widest text-primary mb-4'>
                                                    {t('admin.servers.details.system_quotas')}
                                                </h4>
                                                <div className='space-y-4'>
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.allocation_limit')}
                                                        value={selectedServer?.allocation_limit || '∞'}
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.database_limit')}
                                                        value={selectedServer?.database_limit || '∞'}
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.backup_limit')}
                                                        value={selectedServer?.backup_limit || '∞'}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value='relationships' className='mt-6'>
                                        <div className='grid grid-cols-1 gap-4'>
                                            <RelationCard
                                                icon={User}
                                                title={t('admin.servers.details.labels.owner')}
                                                name={selectedServer?.owner?.username}
                                                detail={selectedServer?.owner?.email}
                                            />
                                            <RelationCard
                                                icon={Network}
                                                title={t('admin.servers.details.labels.node')}
                                                name={selectedServer?.node?.name}
                                                detail={selectedServer?.node?.fqdn}
                                            />
                                            <RelationCard
                                                icon={Layers}
                                                title={t('admin.servers.details.labels.realm_spell')}
                                                name={`${selectedServer?.realm?.name} / ${selectedServer?.spell?.name}`}
                                                detail={`${selectedServer?.realm?.description?.substring(0, 50)}...`}
                                            />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            <SheetFooter className='mt-8 pt-6 border-t border-border/50'>
                                <Button
                                    variant='outline'
                                    onClick={() => setIsViewDrawerOpen(false)}
                                    className='w-full sm:w-auto rounded-xl'
                                >
                                    {t('common.close')}
                                </Button>
                            </SheetFooter>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={confirmDeleteId !== null}
                onOpenChange={(open) => !open && !deleting && setConfirmDeleteId(null)}
            >
                <AlertDialogContent className='sm:max-w-[500px]'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='flex items-center gap-2 text-destructive'>
                            <AlertTriangle className='h-6 w-6' />
                            {isHardDelete
                                ? t('admin.servers.messages.hard_delete_warning_title')
                                : t('common.areYouSure')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='space-y-4 pt-4'>
                            {isHardDelete ? (
                                <>
                                    <p className='font-bold text-foreground'>
                                        {t('admin.servers.messages.hard_delete_warning_p1')}
                                    </p>
                                    <ul className='list-disc list-inside space-y-1 text-sm'>
                                        <li>{t('admin.servers.messages.hard_delete_item1')}</li>
                                        <li>{t('admin.servers.messages.hard_delete_item2')}</li>
                                        <li>{t('admin.servers.messages.hard_delete_item3')}</li>
                                    </ul>
                                    <div className='p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-bold'>
                                        {t('admin.servers.messages.hard_delete_caution')}
                                    </div>
                                    <p className='text-xs italic'>{t('admin.servers.messages.hard_delete_p2')}</p>
                                </>
                            ) : (
                                t('common.delete_confirm_description')
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
                        <div className='flex gap-2'>
                            {!isHardDelete && (
                                <Button
                                    variant='outline'
                                    className='border-destructive text-destructive hover:bg-destructive/10'
                                    onClick={() => setIsHardDelete(true)}
                                    disabled={deleting}
                                >
                                    {t('admin.servers.actions.hard_delete')}
                                </Button>
                            )}
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmDelete();
                                }}
                                disabled={deleting}
                                className='bg-destructive hover:bg-destructive/90'
                            >
                                {deleting ? <Loader2 className='h-4 w-4 animate-spin mr-2' /> : null}
                                {t('admin.servers.actions.confirm_delete')}
                            </AlertDialogAction>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <HeadlessModal
                isOpen={isOwnerFilterModalOpen}
                onClose={() => setIsOwnerFilterModalOpen(false)}
                title={t('admin.servers.filters.user')}
            >
                <div className='space-y-4'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder={t('admin.servers.filters.user_search_placeholder')}
                            value={ownerFilterSearch}
                            onChange={(e) => {
                                const value = e.target.value;
                                setOwnerFilterSearch(value);
                                fetchOwnerFilterUsers(value);
                            }}
                            className='pl-10 h-11'
                        />
                    </div>
                    <div className='max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar pr-1'>
                        {ownerFilterLoading ? (
                            <div className='flex items-center justify-center py-10'>
                                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                            </div>
                        ) : ownerFilterResults.length === 0 ? (
                            <div className='text-center py-10 text-muted-foreground text-sm'>
                                {t('admin.servers.filters.user_no_results')}
                            </div>
                        ) : (
                            ownerFilterResults.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        setFilterOwner({ id: user.id, username: user.username, email: user.email });
                                        setOwnerFilter(String(user.id));
                                        setPagination((p) => ({ ...p, page: 1 }));
                                        setIsOwnerFilterModalOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                                        filterOwner?.id === user.id
                                            ? 'border-primary bg-primary/5 '
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='font-bold text-sm'>{user.username}</p>
                                            <p className='text-xs text-muted-foreground'>{user.email}</p>
                                        </div>
                                        {filterOwner?.id === user.id && (
                                            <ShieldCheck className='h-5 w-5 text-primary' />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    {filterOwner && (
                        <Button
                            variant='ghost'
                            size='sm'
                            className='w-full justify-start text-xs'
                            onClick={() => {
                                setFilterOwner(null);
                                setOwnerFilter('');
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            {t('admin.servers.filters.clear')}
                        </Button>
                    )}
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isNodeFilterModalOpen}
                onClose={() => setIsNodeFilterModalOpen(false)}
                title={t('admin.servers.filters.node')}
            >
                <div className='space-y-4'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder={t('admin.servers.filters.node_search_placeholder')}
                            value={nodeSearch}
                            onChange={(e) => {
                                setNodeSearch(e.target.value);
                                fetchNodes(e.target.value);
                            }}
                            className='pl-10 h-11'
                        />
                    </div>
                    <div className='max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar pr-1'>
                        {loadingNodes ? (
                            <div className='flex items-center justify-center py-10'>
                                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                            </div>
                        ) : nodesList.length === 0 ? (
                            <div className='text-center py-10 text-muted-foreground text-sm'>
                                {t('admin.servers.filters.node_no_results')}
                            </div>
                        ) : (
                            nodesList.map((node) => (
                                <button
                                    key={node.id}
                                    onClick={() => {
                                        setFilterNode(node);
                                        setNodeFilter(String(node.id));
                                        setPagination((p) => ({ ...p, page: 1 }));
                                        setIsNodeFilterModalOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                                        filterNode?.id === node.id
                                            ? 'border-primary bg-primary/5 '
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='font-bold text-sm'>{node.name}</p>
                                            <p className='text-xs text-muted-foreground'>{node.fqdn}</p>
                                        </div>
                                        {filterNode?.id === node.id && (
                                            <ShieldCheck className='h-5 w-5 text-primary' />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    {filterNode && (
                        <Button
                            variant='ghost'
                            size='sm'
                            className='w-full justify-start text-xs'
                            onClick={() => {
                                setFilterNode(null);
                                setNodeFilter('');
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            {t('admin.servers.filters.clear')}
                        </Button>
                    )}
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isRealmFilterModalOpen}
                onClose={() => setIsRealmFilterModalOpen(false)}
                title={t('admin.servers.filters.realm')}
            >
                <div className='space-y-4'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder={t('admin.servers.filters.realm_search_placeholder')}
                            value={realmFilterSearch}
                            onChange={async (e) => {
                                const value = e.target.value;
                                setRealmFilterSearch(value);
                                try {
                                    const { data } = await axios.get('/api/admin/realms', {
                                        params: { page: 1, limit: 25, search: value || undefined },
                                    });
                                    setRealmsList(data?.data?.realms || []);
                                } catch {
                                    setRealmsList([]);
                                }
                            }}
                            className='pl-10 h-11'
                        />
                    </div>
                    <div className='max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar pr-1'>
                        {realmsList.length === 0 ? (
                            <div className='text-center py-10 text-muted-foreground text-sm'>
                                {t('admin.servers.filters.realm_no_results')}
                            </div>
                        ) : (
                            realmsList.map((realm) => (
                                <button
                                    key={realm.id}
                                    onClick={() => {
                                        setFilterRealm({ id: realm.id, name: realm.name });
                                        setRealmFilter(String(realm.id));
                                        setPagination((p) => ({ ...p, page: 1 }));
                                        setIsRealmFilterModalOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                                        filterRealm?.id === realm.id
                                            ? 'border-primary bg-primary/5 '
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='font-bold text-sm'>{realm.name}</p>
                                            {realm.description && (
                                                <p className='text-xs text-muted-foreground line-clamp-2'>
                                                    {realm.description}
                                                </p>
                                            )}
                                        </div>
                                        {filterRealm?.id === realm.id && (
                                            <ShieldCheck className='h-5 w-5 text-primary' />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    {filterRealm && (
                        <Button
                            variant='ghost'
                            size='sm'
                            className='w-full justify-start text-xs'
                            onClick={() => {
                                setFilterRealm(null);
                                setRealmFilter('');
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            {t('admin.servers.filters.clear')}
                        </Button>
                    )}
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isSpellFilterModalOpen}
                onClose={() => setIsSpellFilterModalOpen(false)}
                title={t('admin.servers.filters.spell')}
            >
                <div className='space-y-4'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder={t('admin.servers.filters.spell_search_placeholder')}
                            value={spellFilterSearch}
                            onChange={async (e) => {
                                const value = e.target.value;
                                setSpellFilterSearch(value);
                                try {
                                    const { data } = await axios.get('/api/admin/spells', {
                                        params: {
                                            page: 1,
                                            limit: 25,
                                            search: value || undefined,
                                            realm_id: filterRealm?.id || undefined,
                                        },
                                    });
                                    setSpellsList(data?.data?.spells || []);
                                } catch {
                                    setSpellsList([]);
                                }
                            }}
                            className='pl-10 h-11'
                        />
                    </div>
                    <div className='max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar pr-1'>
                        {spellsList.length === 0 ? (
                            <div className='text-center py-10 text-muted-foreground text-sm'>
                                {t('admin.servers.filters.spell_no_results')}
                            </div>
                        ) : (
                            spellsList.map((spell) => (
                                <button
                                    key={spell.id}
                                    onClick={() => {
                                        setFilterSpell({ id: spell.id, name: spell.name });
                                        setSpellFilter(String(spell.id));
                                        setPagination((p) => ({ ...p, page: 1 }));
                                        setIsSpellFilterModalOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                                        filterSpell?.id === spell.id
                                            ? 'border-primary bg-primary/5 '
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='font-bold text-sm'>{spell.name}</p>
                                            {spell.description && (
                                                <p className='text-xs text-muted-foreground line-clamp-2'>
                                                    {spell.description}
                                                </p>
                                            )}
                                        </div>
                                        {filterSpell?.id === spell.id && (
                                            <ShieldCheck className='h-5 w-5 text-primary' />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    {filterSpell && (
                        <Button
                            variant='ghost'
                            size='sm'
                            className='w-full justify-start text-xs'
                            onClick={() => {
                                setFilterSpell(null);
                                setSpellFilter('');
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            {t('admin.servers.filters.clear')}
                        </Button>
                    )}
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isLocationFilterModalOpen}
                onClose={() => setIsLocationFilterModalOpen(false)}
                title={t('admin.servers.filters.location')}
            >
                <div className='space-y-4'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder={t('admin.servers.filters.location_search_placeholder')}
                            value={locationFilterSearch}
                            onChange={async (e) => {
                                const value = e.target.value;
                                setLocationFilterSearch(value);
                                try {
                                    const { data } = await axios.get('/api/admin/locations', {
                                        params: {
                                            page: 1,
                                            limit: 25,
                                            search: value || undefined,
                                        },
                                    });
                                    setLocationsList(data?.data?.locations || []);
                                } catch {
                                    setLocationsList([]);
                                }
                            }}
                            className='pl-10 h-11'
                        />
                    </div>
                    <div className='max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar pr-1'>
                        {locationsList.length === 0 ? (
                            <div className='text-center py-10 text-muted-foreground text-sm'>
                                {t('admin.servers.filters.location_no_results')}
                            </div>
                        ) : (
                            locationsList.map((location) => (
                                <button
                                    key={location.id}
                                    onClick={() => {
                                        setFilterLocation({ id: location.id, name: location.name });
                                        setLocationFilter(String(location.id));
                                        setPagination((p) => ({ ...p, page: 1 }));
                                        setIsLocationFilterModalOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                                        filterLocation?.id === location.id
                                            ? 'border-primary bg-primary/5 '
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='font-bold text-sm'>{location.name}</p>
                                            {location.description && (
                                                <p className='text-xs text-muted-foreground line-clamp-2'>
                                                    {location.description}
                                                </p>
                                            )}
                                        </div>
                                        {filterLocation?.id === location.id && (
                                            <ShieldCheck className='h-5 w-5 text-primary' />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    {filterLocation && (
                        <Button
                            variant='ghost'
                            size='sm'
                            className='w-full justify-start text-xs'
                            onClick={() => {
                                setFilterLocation(null);
                                setLocationFilter('');
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            {t('admin.servers.filters.clear')}
                        </Button>
                    )}
                </div>
            </HeadlessModal>

            <AlertDialog
                open={isTransferDialogOpen}
                onOpenChange={(open) => !open && !isInitiatingTransfer && setIsTransferDialogOpen(false)}
            >
                <AlertDialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='flex items-center gap-2 mb-2'>
                            <ArrowLeftRight className='h-5 w-5 text-amber-500' />
                            {t('admin.servers.transfer.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>{t('admin.servers.transfer.description')}</AlertDialogDescription>
                    </AlertDialogHeader>

                    <WidgetRenderer widgets={getWidgets('admin-servers', 'bottom-of-page')} />

                    <div className='space-y-6 pt-4'>
                        {transferServer && (
                            <div className='grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm'>
                                <div>
                                    <p className='text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1'>
                                        {t('admin.servers.transfer.server')}
                                    </p>
                                    <p className='font-bold'>{transferServer.name}</p>
                                </div>
                                <div>
                                    <p className='text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1'>
                                        {t('admin.servers.transfer.current_node')}
                                    </p>
                                    <p className='font-bold'>{transferServer.node?.name || 'Unknown'}</p>
                                </div>
                            </div>
                        )}

                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <label className='text-sm font-bold'>
                                    {t('admin.servers.transfer.destination_node')}
                                </label>
                                <Button
                                    variant='outline'
                                    className='w-full h-12 justify-between rounded-xl px-4 border border-border  bg-background/50'
                                    onClick={() => {
                                        fetchNodes();
                                        setIsNodeModalOpen(true);
                                    }}
                                    disabled={isInitiatingTransfer}
                                >
                                    <span
                                        className={
                                            selectedNode ? 'text-foreground font-medium' : 'text-muted-foreground'
                                        }
                                    >
                                        {selectedNode
                                            ? `${selectedNode.name} (${selectedNode.fqdn})`
                                            : t('admin.servers.transfer.select_node')}
                                    </span>
                                    <ChevronRight className='h-4 w-4 text-muted-foreground' />
                                </Button>
                            </div>

                            <div className='space-y-2'>
                                <label className='text-sm font-bold'>
                                    {t('admin.servers.transfer.destination_allocation')}
                                </label>
                                <Button
                                    variant='outline'
                                    className='w-full h-12 justify-between rounded-xl px-4 border border-border  bg-background/50'
                                    onClick={() => {
                                        if (selectedNode) {
                                            fetchAllocations(selectedNode.id);
                                            setIsAllocationModalOpen(true);
                                        } else {
                                            toast.error(t('admin.servers.transfer.select_node'));
                                        }
                                    }}
                                    disabled={isInitiatingTransfer || !selectedNode}
                                >
                                    <span
                                        className={
                                            selectedAllocation ? 'text-foreground font-medium' : 'text-muted-foreground'
                                        }
                                    >
                                        {selectedAllocation
                                            ? `${selectedAllocation.ip}:${selectedAllocation.port}`
                                            : t('admin.servers.transfer.select_allocation')}
                                    </span>
                                    <ChevronRight className='h-4 w-4 text-muted-foreground' />
                                </Button>
                            </div>
                        </div>

                        <div className='space-y-4'>
                            <div className='p-4 bg-red-500/10 border border-red-500/20 rounded-2xl'>
                                <p className='text-sm font-black text-red-500 text-center mb-2'>
                                    {t('admin.servers.transfer.warning_banner')}
                                </p>
                                <p className='text-xs text-red-500/80 leading-relaxed'>
                                    {t('admin.servers.transfer.warning_text')}
                                </p>
                            </div>

                            <div className='p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3'>
                                <p className='text-sm font-bold text-amber-500'>
                                    {t('admin.servers.transfer.beta_title')}
                                </p>
                                <ul className='text-xs text-amber-600/80 space-y-1 list-disc list-inside'>
                                    <li>{t('admin.servers.transfer.beta_item1')}</li>
                                    <li>{t('admin.servers.transfer.beta_item2')}</li>
                                    <li>{t('admin.servers.transfer.beta_item5')}</li>
                                    <li>{t('admin.servers.transfer.beta_item7')}</li>
                                    <li>{t('admin.servers.transfer.beta_item8')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter className='pt-6 border-t border-border/50 mt-6'>
                        <AlertDialogCancel disabled={isInitiatingTransfer} className='rounded-xl'>
                            {t('common.cancel')}
                        </AlertDialogCancel>
                        <Button
                            onClick={initiateTransfer}
                            disabled={!selectedNode || !selectedAllocation || isInitiatingTransfer}
                            className='bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-11 px-6 '
                        >
                            {isInitiatingTransfer ? (
                                <>
                                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                    {t('admin.servers.transfer.submitting')}
                                </>
                            ) : (
                                t('admin.servers.transfer.submit')
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <HeadlessModal
                isOpen={isNodeModalOpen}
                onClose={() => setIsNodeModalOpen(false)}
                title={t('admin.servers.transfer.destination_node')}
            >
                <div className='space-y-4'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder='Search nodes...'
                            value={nodeSearch}
                            onChange={(e) => {
                                setNodeSearch(e.target.value);
                                fetchNodes(e.target.value);
                            }}
                            className='pl-10 h-11'
                        />
                    </div>
                    <div className='max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar pr-1'>
                        {loadingNodes ? (
                            <div className='flex items-center justify-center py-10'>
                                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                            </div>
                        ) : nodesList.length === 0 ? (
                            <div className='text-center py-10 text-muted-foreground'>No results found</div>
                        ) : (
                            nodesList.map((node) => (
                                <button
                                    key={node.id}
                                    onClick={() => {
                                        setSelectedNode(node);
                                        setSelectedAllocation(null);
                                        setIsNodeModalOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${selectedNode?.id === node.id ? 'border-primary bg-primary/5 ' : 'border-border/50 hover:bg-muted/50'}`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='font-bold text-sm'>{node.name}</p>
                                            <p className='text-xs text-muted-foreground'>{node.fqdn}</p>
                                        </div>
                                        {selectedNode?.id === node.id && (
                                            <ShieldCheck className='h-5 w-5 text-primary' />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={isAllocationModalOpen}
                onClose={() => setIsAllocationModalOpen(false)}
                title={t('admin.servers.transfer.destination_allocation')}
            >
                <div className='space-y-4'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder='Search allocations...'
                            value={allocationSearch}
                            onChange={(e) => {
                                setAllocationSearch(e.target.value);
                                if (selectedNode) fetchAllocations(selectedNode.id, e.target.value);
                            }}
                            className='pl-10 h-11'
                        />
                    </div>
                    <div className='max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar pr-1'>
                        {loadingAllocations ? (
                            <div className='flex items-center justify-center py-10'>
                                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                            </div>
                        ) : allocationsList.length === 0 ? (
                            <div className='text-center py-10 text-muted-foreground'>No free allocations found</div>
                        ) : (
                            allocationsList.map((allc) => (
                                <button
                                    key={allc.id}
                                    onClick={() => {
                                        setSelectedAllocation(allc);
                                        setIsAllocationModalOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${selectedAllocation?.id === allc.id ? 'border-primary bg-primary/5 ' : 'border-border/50 hover:bg-muted/50'}`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='font-bold text-sm'>
                                                {allc.ip}:{allc.port}
                                            </p>
                                            <p className='text-xs text-muted-foreground'>
                                                {allc.ip_alias || 'No Alias'}
                                            </p>
                                        </div>
                                        {selectedAllocation?.id === allc.id && (
                                            <ShieldCheck className='h-5 w-5 text-primary' />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>
        </div>
    );
}

function DetailItem({
    label,
    value,
    isMono = false,
    truncate = false,
}: {
    label: string;
    value: React.ReactNode;
    isMono?: boolean;
    truncate?: boolean;
}) {
    return (
        <div className='flex flex-col gap-1'>
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{label}</span>
            <div className={`text-sm font-medium ${isMono ? 'font-mono text-xs' : ''} ${truncate ? 'truncate' : ''}`}>
                {value}
            </div>
        </div>
    );
}

function RelationCard({
    icon: Icon,
    title,
    name,
    detail,
}: {
    icon: React.ElementType;
    title: string;
    name: string | undefined;
    detail?: string;
}) {
    return (
        <div className='p-4 rounded-2xl bg-muted/30 border border-border/50 group hover:border-primary/30 transition-all'>
            <div className='flex items-center gap-3 mb-2'>
                <div className='p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all'>
                    {Icon && typeof Icon === 'function' ? <Icon className='h-3.5 w-3.5' /> : null}
                </div>
                <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                    {title}
                </span>
            </div>
            <p className='text-sm font-bold truncate'>{name || 'N/A'}</p>
            {detail && <p className='text-xs text-muted-foreground truncate'>{detail}</p>}
        </div>
    );
}
