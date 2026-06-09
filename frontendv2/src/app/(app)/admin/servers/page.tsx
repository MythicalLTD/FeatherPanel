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

import { useState, useEffect, useCallback, type ReactNode, type ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { PageCard } from '@/components/featherui/PageCard';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
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
    Terminal,
    Clock,
} from 'lucide-react';
import { StatusBadge } from '@/components/servers/StatusBadge';
import { displayStatus } from '@/lib/server-utils';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { ApiServer, Pagination, ApiNode } from '@/types/adminServerTypes';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { TransferServerDialog } from '@/components/admin/TransferServerDialog';

function resolveAvatarSrc(avatar?: string): string | undefined {
    if (avatar && (avatar.startsWith('http') || avatar.startsWith('/'))) {
        return avatar;
    }

    return undefined;
}

const SERVERS_LIST_FILTERS_KEY = 'featherpanel_admin_servers_filters_v1';
const SERVERS_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    ownerFilter: '',
    nodeFilter: '',
    realmFilter: '',
    spellFilter: '',
    locationFilter: '',
    serverIdFilter: '',
    uuidFilter: '',
    externalIdFilter: '',
    sortBy: 'id' as 'id' | 'name' | 'created_at' | 'updated_at',
    sortOrder: 'DESC' as 'ASC' | 'DESC',
    showAdvancedFilters: false,
    page: 1,
    pageSize: 10,
    filterOwner: null as { id: number; username: string; email?: string } | null,
    filterNode: null as ApiNode | null,
    filterRealm: null as { id: number; name: string } | null,
    filterSpell: null as { id: number; name: string } | null,
    filterLocation: null as { id: number; name: string } | null,
};

export default function ServersPage() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [servers, setServers] = useState<ApiServer[]>([]);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const { filters, patchFilters, resetFilters, hydrated } = usePersistedListFilters(
        SERVERS_LIST_FILTERS_KEY,
        SERVERS_LIST_FILTERS_DEFAULTS,
    );
    const {
        searchQuery,
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
        showAdvancedFilters,
        page,
        pageSize,
        filterOwner,
        filterNode,
        filterRealm,
        filterSpell,
        filterLocation,
    } = filters;
    const [refreshKey, setRefreshKey] = useState(0);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [isHardDelete, setIsHardDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [selectedServer, setSelectedServer] = useState<ApiServer | null>(null);
    const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);

    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [transferServer, setTransferServer] = useState<ApiServer | null>(null);
    const [cancellingTransferId, setCancellingTransferId] = useState<number | null>(null);

    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        from: 0,
        to: 0,
    });

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
    const [nodeSearch, setNodeSearch] = useState('');
    const [nodesList, setNodesList] = useState<ApiNode[]>([]);
    const [loadingNodes, setLoadingNodes] = useState(false);
    const [realmFilterSearch, setRealmFilterSearch] = useState('');
    const [spellFilterSearch, setSpellFilterSearch] = useState('');
    const [locationFilterSearch, setLocationFilterSearch] = useState('');
    const [realmsList, setRealmsList] = useState<{ id: number; name: string; description?: string }[]>([]);
    const [spellsList, setSpellsList] = useState<{ id: number; name: string; description?: string }[]>([]);
    const [locationsList, setLocationsList] = useState<{ id: number; name: string; description?: string }[]>([]);
    const [selectedServerIds, setSelectedServerIds] = useState<number[]>([]);
    const [bulkPowerLoading, setBulkPowerLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                patchFilters({ page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery, patchFilters]);

    const fetchServers = useCallback(async () => {
        if (!hydrated) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/servers', {
                params: {
                    page,
                    limit: pageSize,
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
        page,
        pageSize,
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
        hydrated,
    ]);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-servers');

    useEffect(() => {
        fetchWidgets();
        fetchServers();
    }, [fetchServers, refreshKey, fetchWidgets]);

    const toggleServerSelection = (serverId: number) => {
        setSelectedServerIds((prev) =>
            prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId],
        );
    };

    const clearSelection = () => setSelectedServerIds([]);

    const selectAllVisible = () => {
        const visibleIds = servers.map((server) => server.id);
        setSelectedServerIds(visibleIds);
    };

    const selectedServers = servers.filter((server) => selectedServerIds.includes(server.id));

    const handleBulkPowerAction = async (action: 'start' | 'stop' | 'restart') => {
        if (selectedServers.length === 0) {
            return;
        }

        setBulkPowerLoading(true);
        try {
            const results = await Promise.all(
                selectedServers.map((server) =>
                    axios
                        .post(`/api/user/servers/${server.uuidShort}/power/${action}`)
                        .then(() => true)
                        .catch(() => false),
                ),
            );

            const successCount = results.filter(Boolean).length;

            if (successCount === 0) {
                toast.error(t('servers.bulk.error'));
            } else if (successCount < selectedServers.length) {
                toast.warning(t('servers.bulk.partialSuccess'));
            } else {
                toast.success(
                    t('servers.bulk.success', {
                        count: String(successCount),
                    }),
                );
                clearSelection();
            }
        } finally {
            setBulkPowerLoading(false);
        }
    };

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
        setIsTransferDialogOpen(true);
    };

    const fetchNodes = async (search: string = '') => {
        setLoadingNodes(true);
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: {
                    limit: 50,
                    search: search || undefined,
                },
            });
            setNodesList(data.data.nodes || []);
        } catch (error) {
            console.error('Error fetching nodes for filter:', error);
            setNodesList([]);
        } finally {
            setLoadingNodes(false);
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

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-servers', 'top-of-page')} />

            <PageHeader
                title={t('admin.servers.title')}
                description={t('admin.servers.description')}
                icon={Server}
                actions={
                    <Button onClick={() => router.push('/admin/servers/create')}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.servers.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-servers', 'after-header')} />

            <div className='bg-card/50 border-border flex flex-col items-stretch gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur-md'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.servers.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                        className='h-11 w-full pl-10'
                    />
                </div>
                <div className='flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center'>
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
                            <User className='mr-2 h-3.5 w-3.5' />
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
                            <Network className='mr-2 h-3.5 w-3.5' />
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
                            <Layers className='mr-2 h-3.5 w-3.5' />
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
                            <Gauge className='mr-2 h-3.5 w-3.5' />
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
                                            params: { page: 1, limit: 25, type: 'game' },
                                        })
                                        .then(({ data }) => setLocationsList(data?.data?.locations || []))
                                        .catch(() => setLocationsList([]));
                                }
                            }}
                        >
                            <Database className='mr-2 h-3.5 w-3.5' />
                            {filterLocation
                                ? t('admin.servers.filters.location_selected', { name: filterLocation.name })
                                : t('admin.servers.filters.location')}
                        </Button>
                        <Button
                            variant='ghost'
                            size='sm'
                            className='h-9 text-xs'
                            onClick={() => patchFilters({ showAdvancedFilters: !showAdvancedFilters })}
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
                                patchFilters({ sortBy: field, sortOrder: order, page: 1 });
                            }}
                            className='bg-background/50 border-border/50 h-11 w-55 rounded-xl text-sm'
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
                    <div className='grid grid-cols-1 gap-3 pt-2 md:grid-cols-3'>
                        <Input
                            type='number'
                            min={1}
                            value={serverIdFilter}
                            onChange={(e) => {
                                patchFilters({ serverIdFilter: e.target.value, page: 1 });
                            }}
                            placeholder={t('admin.servers.filters.server_id')}
                            className='h-9 text-xs'
                        />
                        <Input
                            value={uuidFilter}
                            onChange={(e) => {
                                patchFilters({ uuidFilter: e.target.value, page: 1 });
                            }}
                            placeholder={t('admin.servers.filters.uuid')}
                            className='h-9 text-xs'
                        />
                        <Input
                            value={externalIdFilter}
                            onChange={(e) => {
                                patchFilters({ externalIdFilter: e.target.value, page: 1 });
                            }}
                            placeholder={t('admin.servers.filters.external_id')}
                            className='h-9 text-xs'
                        />
                        <Button
                            variant='ghost'
                            size='sm'
                            className='h-9 justify-start text-xs'
                            onClick={() => {
                                resetFilters();
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
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.servers.create')}
                        </Button>
                    }
                />
            ) : (
                <>
                    <div className='border-border bg-card/60 mb-4 flex flex-col items-start justify-between gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center'>
                        <div className='flex items-center gap-2 text-sm'>
                            <button
                                type='button'
                                onClick={selectAllVisible}
                                className='text-primary text-xs font-medium hover:underline sm:text-sm'
                            >
                                {t('servers.bulk.selectAllPage')}
                            </button>
                            <span className='text-muted-foreground text-xs sm:text-sm'>
                                {selectedServers.length > 0
                                    ? t('servers.bulk.selectedCount', {
                                          count: String(selectedServers.length),
                                      })
                                    : t('servers.bulk.noSelection')}
                            </span>
                            {selectedServers.length > 0 && (
                                <button
                                    type='button'
                                    onClick={clearSelection}
                                    className='text-muted-foreground hover:text-foreground text-xs hover:underline sm:text-sm'
                                >
                                    {t('servers.bulk.clearSelection')}
                                </button>
                            )}
                        </div>
                        <div className='flex items-center gap-2'>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => handleBulkPowerAction('start')}
                                disabled={selectedServers.length === 0 || bulkPowerLoading}
                            >
                                {t('servers.start')}
                            </Button>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => handleBulkPowerAction('stop')}
                                disabled={selectedServers.length === 0 || bulkPowerLoading}
                            >
                                {t('servers.stop')}
                            </Button>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => handleBulkPowerAction('restart')}
                                disabled={selectedServers.length === 0 || bulkPowerLoading}
                            >
                                {t('servers.restart')}
                            </Button>
                        </div>
                    </div>
                    {pagination.totalPages > 1 && (
                        <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.hasPrev}
                                onClick={() => patchFilters({ page: page - 1 })}
                                className='gap-1.5'
                            >
                                <ChevronLeft className='h-4 w-4' />
                                {t('common.previous')}
                            </Button>
                            <span className='text-sm font-medium'>
                                {page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.hasNext}
                                onClick={() => patchFilters({ page: page + 1 })}
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
                                    label: server.uuidShort,
                                    className: 'bg-muted/50 text-muted-foreground border-border/50 font-mono',
                                },
                            ];

                            const ownerAvatarSrc = resolveAvatarSrc(server.owner?.avatar);
                            const serverStatus = displayStatus(server as unknown as ServerType);
                            return (
                                <ResourceCard
                                    key={server.id}
                                    title={server.name}
                                    subtitle={
                                        server.owner ? (
                                            <div className='flex items-center gap-2'>
                                                <Avatar className='h-6 w-6 shrink-0'>
                                                    {ownerAvatarSrc && (
                                                        <AvatarImage src={ownerAvatarSrc} alt={server.owner.username} />
                                                    )}
                                                </Avatar>
                                                {server.owner.uuid ? (
                                                    <Link
                                                        href={`/admin/users/${server.owner.uuid}/edit`}
                                                        className='text-primary hover:text-primary/80 font-medium underline-offset-4 transition-colors hover:underline'
                                                    >
                                                        {server.owner.username}
                                                    </Link>
                                                ) : (
                                                    <span className='text-foreground font-medium'>
                                                        {server.owner.username}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className='text-muted-foreground font-medium'>System</span>
                                        )
                                    }
                                    icon={Server}
                                    badges={badges}
                                    description={
                                        <div className='mt-2 flex flex-wrap items-center gap-4'>
                                            <StatusBadge status={serverStatus} t={t} />
                                            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                                                <Database className='h-3.5 w-3.5' />
                                                <span>{formatMemory(server.memory)}</span>
                                            </div>
                                            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                                                <Cpu className='h-3.5 w-3.5' />
                                                <span>{formatCpu(server.cpu)}</span>
                                            </div>
                                            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                                                <HardDrive className='h-3.5 w-3.5' />
                                                <span>{formatDisk(server.disk)}</span>
                                            </div>
                                            {server.owner?.last_seen && (
                                                <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                                                    <Clock className='h-3.5 w-3.5' />
                                                    <span>
                                                        {t('admin.servers.owner_last_seen')}:{' '}
                                                        <span
                                                            title={
                                                                server.owner.last_seen
                                                                    ? formatDateTimeInTz(
                                                                          server.owner.last_seen,
                                                                          dateOpts,
                                                                      )
                                                                    : undefined
                                                            }
                                                        >
                                                            {formatRelativeTime(server.owner.last_seen, dateOpts)}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    }
                                    actions={
                                        <div className='flex items-center gap-2'>
                                            <Checkbox
                                                checked={selectedServerIds.includes(server.id)}
                                                onCheckedChange={() => toggleServerSelection(server.id)}
                                                className='h-4 w-4'
                                            />
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => router.push(`/server/${server.uuidShort}`)}
                                                title={t('admin.servers.details.view_console')}
                                            >
                                                <Terminal className='h-4 w-4' />
                                            </Button>
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
                                                    className='text-amber-500 hover:bg-amber-500/10 hover:text-amber-600'
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
                        <div className='mt-8 flex items-center justify-center gap-2'>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={!pagination.hasPrev}
                                onClick={() => patchFilters({ page: page - 1 })}
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </Button>
                            <span className='text-sm font-medium'>
                                {page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={!pagination.hasNext}
                                onClick={() => patchFilters({ page: page + 1 })}
                            >
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                </>
            )}

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                <PageCard title={t('admin.servers.help.managing.title')} icon={Server}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.servers.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.servers.help.relationships.title')} icon={Layers}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.servers.help.relationships.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.servers.help.resources.title')} icon={Gauge}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.servers.help.resources.description')}
                    </p>
                </PageCard>
                <PageCard
                    title={t('admin.servers.help.tips.title')}
                    icon={HelpCircle}
                    className='md:col-span-2 lg:col-span-3'
                >
                    <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm leading-relaxed'>
                        <li>{t('admin.servers.help.tips.item1')}</li>
                        <li>{t('admin.servers.help.tips.item2')}</li>
                        <li>{t('admin.servers.help.tips.item3')}</li>
                    </ul>
                </PageCard>
            </div>

            <Sheet open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
                <SheetContent side='right' className='custom-scrollbar overflow-y-auto sm:max-w-2xl'>
                    {selectedServer && (
                        <>
                            <SheetHeader>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <SheetTitle className='flex items-center gap-2'>
                                            <Server className='text-primary h-5 w-5' />
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
                                        <Eye className='mr-2 h-4 w-4' />
                                        {t('admin.servers.details.view_console')}
                                    </Button>
                                </div>
                            </SheetHeader>

                            <div className='mt-8 space-y-8'>
                                <Tabs defaultValue='details' className='w-full'>
                                    <TabsList className='bg-muted/50 grid w-full grid-cols-3 rounded-xl p-1'>
                                        <TabsTrigger
                                            value='details'
                                            className='rounded-lg text-xs font-bold tracking-widest uppercase'
                                        >
                                            {t('admin.servers.details.tabs.details')}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value='resources'
                                            className='rounded-lg text-xs font-bold tracking-widest uppercase'
                                        >
                                            {t('admin.servers.details.tabs.resources')}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value='relationships'
                                            className='rounded-lg text-xs font-bold tracking-widest uppercase'
                                        >
                                            {t('admin.servers.details.tabs.relationships')}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value='details' className='mt-6 space-y-6'>
                                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                            <div className='bg-muted/30 border-border/50 rounded-2xl border p-5'>
                                                <h4 className='text-primary mb-4 text-xs font-black tracking-widest uppercase'>
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
                                                            selectedServer?.created_at ? (
                                                                <span
                                                                    title={formatDateTimeInTz(
                                                                        selectedServer.created_at,
                                                                        dateOpts,
                                                                    )}
                                                                >
                                                                    {formatRelativeTime(
                                                                        selectedServer.created_at,
                                                                        dateOpts,
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                'N/A'
                                                            )
                                                        }
                                                    />
                                                    <DetailItem
                                                        label={t('admin.servers.details.labels.updated')}
                                                        value={
                                                            selectedServer?.updated_at ? (
                                                                <span
                                                                    title={formatDateTimeInTz(
                                                                        selectedServer.updated_at,
                                                                        dateOpts,
                                                                    )}
                                                                >
                                                                    {formatRelativeTime(
                                                                        selectedServer.updated_at,
                                                                        dateOpts,
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                'N/A'
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className='bg-muted/30 border-border/50 rounded-2xl border p-5'>
                                                <h4 className='text-primary mb-4 text-xs font-black tracking-widest uppercase'>
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
                                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                            <div className='bg-muted/30 border-border/50 rounded-2xl border p-5'>
                                                <h4 className='text-primary mb-4 text-xs font-black tracking-widest uppercase'>
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

                                            <div className='bg-muted/30 border-border/50 rounded-2xl border p-5'>
                                                <h4 className='text-primary mb-4 text-xs font-black tracking-widest uppercase'>
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
                                                avatarUrl={resolveAvatarSrc(selectedServer?.owner?.avatar)}
                                                nameHref={
                                                    selectedServer?.owner?.uuid
                                                        ? `/admin/users/${selectedServer.owner.uuid}/edit`
                                                        : undefined
                                                }
                                                detail={selectedServer?.owner?.email}
                                                secondary={
                                                    selectedServer?.owner?.last_seen
                                                        ? `${t('admin.users.last_seen')}: ${formatRelativeTime(selectedServer.owner.last_seen, dateOpts)}`
                                                        : undefined
                                                }
                                                secondaryTitle={
                                                    selectedServer?.owner?.last_seen
                                                        ? formatDateTimeInTz(selectedServer.owner.last_seen, dateOpts)
                                                        : undefined
                                                }
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

                            <SheetFooter className='border-border/50 mt-8 border-t pt-6'>
                                <Button
                                    variant='outline'
                                    onClick={() => setIsViewDrawerOpen(false)}
                                    className='w-full rounded-xl sm:w-auto'
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
                <AlertDialogContent className='sm:max-w-125'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='text-destructive flex items-center gap-2'>
                            <AlertTriangle className='h-6 w-6' />
                            {isHardDelete
                                ? t('admin.servers.messages.hard_delete_warning_title')
                                : t('common.areYouSure')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='space-y-4 pt-4'>
                            {isHardDelete ? (
                                <>
                                    <p className='text-foreground font-bold'>
                                        {t('admin.servers.messages.hard_delete_warning_p1')}
                                    </p>
                                    <ul className='list-inside list-disc space-y-1 text-sm'>
                                        <li>{t('admin.servers.messages.hard_delete_item1')}</li>
                                        <li>{t('admin.servers.messages.hard_delete_item2')}</li>
                                        <li>{t('admin.servers.messages.hard_delete_item3')}</li>
                                    </ul>
                                    <div className='bg-destructive/10 border-destructive/20 text-destructive rounded-xl border p-4 text-sm font-bold'>
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
                                {deleting ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
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
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                        <Input
                            placeholder={t('admin.servers.filters.user_search_placeholder')}
                            value={ownerFilterSearch}
                            onChange={(e) => {
                                const value = e.target.value;
                                setOwnerFilterSearch(value);
                                fetchOwnerFilterUsers(value);
                            }}
                            className='h-11 pl-10'
                        />
                    </div>
                    <div className='custom-scrollbar max-h-87.5 space-y-2 overflow-y-auto pr-1'>
                        {ownerFilterLoading ? (
                            <div className='flex items-center justify-center py-10'>
                                <Loader2 className='text-primary h-6 w-6 animate-spin' />
                            </div>
                        ) : ownerFilterResults.length === 0 ? (
                            <div className='text-muted-foreground py-10 text-center text-sm'>
                                {t('admin.servers.filters.user_no_results')}
                            </div>
                        ) : (
                            ownerFilterResults.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        patchFilters({
                                            filterOwner: { id: user.id, username: user.username, email: user.email },
                                            ownerFilter: String(user.id),
                                            page: 1,
                                        });
                                        setIsOwnerFilterModalOpen(false);
                                    }}
                                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                                        filterOwner?.id === user.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-bold'>{user.username}</p>
                                            <p className='text-muted-foreground text-xs'>{user.email}</p>
                                        </div>
                                        {filterOwner?.id === user.id && (
                                            <ShieldCheck className='text-primary h-5 w-5' />
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
                                patchFilters({ filterOwner: null, ownerFilter: '', page: 1 });
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
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                        <Input
                            placeholder={t('admin.servers.filters.node_search_placeholder')}
                            value={nodeSearch}
                            onChange={(e) => {
                                setNodeSearch(e.target.value);
                                fetchNodes(e.target.value);
                            }}
                            className='h-11 pl-10'
                        />
                    </div>
                    <div className='custom-scrollbar max-h-87.5 space-y-2 overflow-y-auto pr-1'>
                        {loadingNodes ? (
                            <div className='flex items-center justify-center py-10'>
                                <Loader2 className='text-primary h-6 w-6 animate-spin' />
                            </div>
                        ) : nodesList.length === 0 ? (
                            <div className='text-muted-foreground py-10 text-center text-sm'>
                                {t('admin.servers.filters.node_no_results')}
                            </div>
                        ) : (
                            nodesList.map((node) => (
                                <button
                                    key={node.id}
                                    onClick={() => {
                                        patchFilters({
                                            filterNode: node,
                                            nodeFilter: String(node.id),
                                            page: 1,
                                        });
                                        setIsNodeFilterModalOpen(false);
                                    }}
                                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                                        filterNode?.id === node.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-bold'>{node.name}</p>
                                            <p className='text-muted-foreground text-xs'>{node.fqdn}</p>
                                        </div>
                                        {filterNode?.id === node.id && <ShieldCheck className='text-primary h-5 w-5' />}
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
                                patchFilters({ filterNode: null, nodeFilter: '', page: 1 });
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
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
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
                            className='h-11 pl-10'
                        />
                    </div>
                    <div className='custom-scrollbar max-h-87.5 space-y-2 overflow-y-auto pr-1'>
                        {realmsList.length === 0 ? (
                            <div className='text-muted-foreground py-10 text-center text-sm'>
                                {t('admin.servers.filters.realm_no_results')}
                            </div>
                        ) : (
                            realmsList.map((realm) => (
                                <button
                                    key={realm.id}
                                    onClick={() => {
                                        patchFilters({
                                            filterRealm: { id: realm.id, name: realm.name },
                                            realmFilter: String(realm.id),
                                            page: 1,
                                        });
                                        setIsRealmFilterModalOpen(false);
                                    }}
                                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                                        filterRealm?.id === realm.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-bold'>{realm.name}</p>
                                            {realm.description && (
                                                <p className='text-muted-foreground line-clamp-2 text-xs'>
                                                    {realm.description}
                                                </p>
                                            )}
                                        </div>
                                        {filterRealm?.id === realm.id && (
                                            <ShieldCheck className='text-primary h-5 w-5' />
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
                                patchFilters({ filterRealm: null, realmFilter: '', page: 1 });
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
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
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
                            className='h-11 pl-10'
                        />
                    </div>
                    <div className='custom-scrollbar max-h-87.5 space-y-2 overflow-y-auto pr-1'>
                        {spellsList.length === 0 ? (
                            <div className='text-muted-foreground py-10 text-center text-sm'>
                                {t('admin.servers.filters.spell_no_results')}
                            </div>
                        ) : (
                            spellsList.map((spell) => (
                                <button
                                    key={spell.id}
                                    onClick={() => {
                                        patchFilters({
                                            filterSpell: { id: spell.id, name: spell.name },
                                            spellFilter: String(spell.id),
                                            page: 1,
                                        });
                                        setIsSpellFilterModalOpen(false);
                                    }}
                                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                                        filterSpell?.id === spell.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-bold'>{spell.name}</p>
                                            {spell.description && (
                                                <p className='text-muted-foreground line-clamp-2 text-xs'>
                                                    {spell.description}
                                                </p>
                                            )}
                                        </div>
                                        {filterSpell?.id === spell.id && (
                                            <ShieldCheck className='text-primary h-5 w-5' />
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
                                patchFilters({ filterSpell: null, spellFilter: '', page: 1 });
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
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
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
                                            type: 'game',
                                        },
                                    });
                                    setLocationsList(data?.data?.locations || []);
                                } catch {
                                    setLocationsList([]);
                                }
                            }}
                            className='h-11 pl-10'
                        />
                    </div>
                    <div className='custom-scrollbar max-h-87.5 space-y-2 overflow-y-auto pr-1'>
                        {locationsList.length === 0 ? (
                            <div className='text-muted-foreground py-10 text-center text-sm'>
                                {t('admin.servers.filters.location_no_results')}
                            </div>
                        ) : (
                            locationsList.map((location) => (
                                <button
                                    key={location.id}
                                    onClick={() => {
                                        patchFilters({
                                            filterLocation: { id: location.id, name: location.name },
                                            locationFilter: String(location.id),
                                            page: 1,
                                        });
                                        setIsLocationFilterModalOpen(false);
                                    }}
                                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                                        filterLocation?.id === location.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-bold'>{location.name}</p>
                                            {location.description && (
                                                <p className='text-muted-foreground line-clamp-2 text-xs'>
                                                    {location.description}
                                                </p>
                                            )}
                                        </div>
                                        {filterLocation?.id === location.id && (
                                            <ShieldCheck className='text-primary h-5 w-5' />
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
                                patchFilters({ filterLocation: null, locationFilter: '', page: 1 });
                            }}
                        >
                            {t('admin.servers.filters.clear')}
                        </Button>
                    )}
                </div>
            </HeadlessModal>

            <TransferServerDialog
                server={transferServer}
                open={isTransferDialogOpen}
                onOpenChange={setIsTransferDialogOpen}
                onCompleted={() => setRefreshKey((prev) => prev + 1)}
            />
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
    value: ReactNode;
    isMono?: boolean;
    truncate?: boolean;
}) {
    return (
        <div className='flex flex-col gap-1'>
            <span className='text-muted-foreground/50 text-[10px] font-black tracking-widest uppercase'>{label}</span>
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
    nameHref,
    avatarUrl,
    detail,
    secondary,
    secondaryTitle,
}: {
    icon: ElementType;
    title: string;
    name: string | undefined;
    nameHref?: string;
    avatarUrl?: string;
    detail?: string;
    secondary?: ReactNode;
    secondaryTitle?: string;
}) {
    const nameContent =
        nameHref && name ? (
            <Link
                href={nameHref}
                className='text-primary hover:text-primary/80 truncate text-sm font-bold underline-offset-4 transition-colors hover:underline'
            >
                {name}
            </Link>
        ) : (
            <p className='truncate text-sm font-bold'>{name || 'N/A'}</p>
        );

    return (
        <div className='bg-muted/30 border-border/50 group hover:border-primary/30 rounded-2xl border p-4 transition-all'>
            <div className='mb-2 flex items-center gap-3'>
                <div className='bg-primary/10 text-primary group-hover:bg-primary rounded-lg p-2 transition-all group-hover:text-white'>
                    {Icon && typeof Icon === 'function' ? <Icon className='h-3.5 w-3.5' /> : null}
                </div>
                <span className='text-muted-foreground/50 text-[10px] font-black tracking-widest uppercase'>
                    {title}
                </span>
            </div>
            {avatarUrl ? (
                <div className='flex min-w-0 items-center gap-2.5'>
                    <Avatar className='h-9 w-9 shrink-0'>
                        <AvatarImage src={avatarUrl} alt={name || ''} />
                    </Avatar>
                    <div className='min-w-0 flex-1'>{nameContent}</div>
                </div>
            ) : (
                nameContent
            )}
            {detail && <p className='text-muted-foreground truncate text-xs'>{detail}</p>}
            {secondary && (
                <p className='text-muted-foreground mt-1 truncate text-xs' title={secondaryTitle}>
                    {secondary}
                </p>
            )}
        </div>
    );
}
