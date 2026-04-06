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
import { useRouter, useSearchParams } from 'next/navigation';
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
    Search,
    RefreshCw,
    Trash2,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Shield,
    Network,
    Pencil,
    HeartHandshakeIcon,
} from 'lucide-react';

interface VmNode {
    id: number;
    name: string;
    description: string | null;
    location_id: number;
    fqdn: string;
    scheme: string;
    port: number;
    user: string;
    token_id: string;
    secret: string;
    tls_no_verify: 'true' | 'false';
    timeout: number;
    addional_headers?: string | null;
    additional_params?: string | null;
    created_at: string;
    updated_at: string;
}

interface Location {
    id: number;
    name: string;
    type: 'game' | 'vps' | 'web';
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

type ConnectionStatus = 'unknown' | 'online' | 'offline';

export default function VdsNodesPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const locationIdFilter = searchParams.get('location_id');

    const [loading, setLoading] = useState(true);
    const [vmNodes, setVmNodes] = useState<VmNode[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<Record<number, ConnectionStatus>>({});
    const [isCheckingConnections, setIsCheckingConnections] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vm-nodes');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const { data } = await axios.get('/api/admin/locations', {
                    params: { limit: 100, type: 'vps' },
                });
                setLocations((data.data.locations || []) as Location[]);
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };
        fetchLocations();
    }, []);

    const testConnection = useCallback(
        async (vmNodeId: number) => {
            try {
                const { data } = await axios.get(`/api/admin/vm-nodes/${vmNodeId}/test-connection`);
                const ok = data.data?.ok ?? false;
                setConnectionStatus((prev) => ({ ...prev, [vmNodeId]: ok ? 'online' : 'offline' }));
                if (!ok) {
                    toast.error(t('admin.vdsNodes.messages.connection_failed'));
                }
            } catch (error) {
                console.error(`Error testing connection for VM node ${vmNodeId}:`, error);
                setConnectionStatus((prev) => ({ ...prev, [vmNodeId]: 'offline' }));
                if (isAxiosError(error) && error.response?.data?.message) {
                    toast.error(error.response.data.message);
                } else {
                    toast.error(t('admin.vdsNodes.messages.connection_failed'));
                }
            }
        },
        [t],
    );

    const testAllConnections = useCallback(
        async (nodesToCheck: VmNode[]) => {
            setIsCheckingConnections(true);
            try {
                await Promise.all(nodesToCheck.map((node) => testConnection(node.id)));
            } catch (error) {
                console.error('Error testing all VM node connections:', error);
                toast.error(t('admin.vdsNodes.messages.connection_check_failed'));
            } finally {
                setIsCheckingConnections(false);
            }
        },
        [testConnection, t],
    );

    const fetchVmNodes = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/vm-nodes', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: debouncedSearchQuery || undefined,
                    location_id: locationIdFilter || undefined,
                },
            });

            const fetchedNodes = (data.data.vm_nodes || []) as VmNode[];
            setVmNodes(fetchedNodes);
            const apiPagination = data.data.pagination;
            setPagination({
                page: apiPagination.current_page,
                pageSize: apiPagination.per_page,
                total: apiPagination.total_records,
                totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                hasNext: apiPagination.has_next,
                hasPrev: apiPagination.has_prev,
            });

            // Automatically test connections for all nodes on initial load / refresh.
            if (fetchedNodes.length > 0) {
                testAllConnections(fetchedNodes);
            }
        } catch (error) {
            console.error('Error fetching VM nodes:', error);
            toast.error(t('admin.vdsNodes.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, locationIdFilter, t, testAllConnections]);

    useEffect(() => {
        fetchVmNodes();
    }, [fetchVmNodes, refreshKey]);

    const handleDelete = (id: number) => {
        setConfirmDeleteId(id);
    };

    const confirmDelete = async (id: number) => {
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/vm-nodes/${id}`);
            toast.success(t('admin.vdsNodes.messages.delete_success'));
            setRefreshKey((prev) => prev + 1);
            setConfirmDeleteId(null);
        } catch (error) {
            console.error('Error deleting VM node:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.messages.delete_failed'));
            }
        } finally {
            setDeleting(false);
        }
    };

    const getLocationName = (locationId: number) => {
        return locations.find((l) => l.id === locationId)?.name || t('common.unknown');
    };

    const getConnectionStatus = (nodeId: number): ConnectionStatus => {
        return connectionStatus[nodeId] || 'unknown';
    };

    const currentLocation = locationIdFilter ? locations.find((l) => l.id === parseInt(locationIdFilter)) : null;

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-vm-nodes', 'top-of-page')} />

            <PageHeader
                title={t('admin.vdsNodes.title')}
                description={
                    currentLocation
                        ? t('admin.vdsNodes.viewAndManage', { location: currentLocation.name })
                        : t('admin.vdsNodes.description')
                }
                icon={Server}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            loading={isCheckingConnections}
                            onClick={() => testAllConnections(vmNodes)}
                            title={t('admin.vdsNodes.health.refresh')}
                        >
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                        <Button onClick={() => router.push('/admin/vds-nodes/create')}>
                            <Server className='h-4 w-4 mr-2' />
                            {t('admin.vdsNodes.form.create_short')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-vm-nodes', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.vdsNodes.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-vm-nodes', 'before-list')} />

            {pagination.totalPages > 1 && !loading && (
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

            {loading ? (
                <TableSkeleton count={5} />
            ) : vmNodes.length === 0 ? (
                <EmptyState
                    icon={Server}
                    title={t('admin.vdsNodes.no_results')}
                    description={t('admin.vdsNodes.search_placeholder')}
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {vmNodes.map((node) => {
                        const status = getConnectionStatus(node.id);
                        const badges: ResourceBadge[] = [
                            {
                                label: t(`admin.vdsNodes.connection.${status}`),
                                className:
                                    status === 'online'
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : status === 'offline'
                                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                          : 'bg-muted text-muted-foreground',
                            },
                            {
                                label: getLocationName(node.location_id),
                                className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                            },
                        ];

                        return (
                            <ResourceCard
                                key={node.id}
                                title={node.name}
                                subtitle={`${node.scheme}://${node.fqdn}:${node.port}`}
                                icon={Server}
                                badges={badges}
                                description={
                                    <div className='text-sm text-muted-foreground mt-1 line-clamp-1'>
                                        {node.description || t('common.nA')}
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => testConnection(node.id)}
                                            title={t('admin.vdsNodes.actions.test_connection')}
                                        >
                                            <HeartHandshakeIcon className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => router.push(`/admin/vds-nodes/${node.id}/edit`)}
                                            title={t('admin.vdsNodes.actions.edit')}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        {confirmDeleteId === node.id ? (
                                            <>
                                                <Button
                                                    size='sm'
                                                    variant='destructive'
                                                    onClick={() => confirmDelete(node.id)}
                                                    loading={deleting}
                                                >
                                                    {t('admin.vdsNodes.actions.confirm_delete')}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    disabled={deleting}
                                                >
                                                    {t('admin.vdsNodes.actions.cancel_delete')}
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                onClick={() => handleDelete(node.id)}
                                                title={t('admin.vdsNodes.actions.delete')}
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

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

            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <PageCard title={t('admin.vdsNodes.help.what.title')} icon={Server}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vdsNodes.help.what.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.vdsNodes.help.utility.title')} icon={Network}>
                    <ul className='text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1'>
                        <li>{t('admin.vdsNodes.help.utility.connect')}</li>
                        <li>{t('admin.vdsNodes.help.utility.monitor')}</li>
                        <li>{t('admin.vdsNodes.help.utility.mapLocations')}</li>
                    </ul>
                </PageCard>
                <PageCard title={t('admin.vdsNodes.help.locations.title')} icon={MapPin}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vdsNodes.help.locations.description')}
                    </p>
                </PageCard>
            </div>

            <PageCard title={t('admin.vdsNodes.help.proxmox.title')} icon={Shield} className='mt-6'>
                <div className='text-sm text-muted-foreground space-y-4'>
                    <p>{t('admin.vdsNodes.help.proxmox.p1')}</p>
                    <p>{t('admin.vdsNodes.help.proxmox.p2')}</p>
                </div>
            </PageCard>

            <WidgetRenderer widgets={getWidgets('admin-vm-nodes', 'bottom-of-page')} />
        </div>
    );
}
