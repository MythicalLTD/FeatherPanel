/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
    Database as DatabaseIcon,
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Shield,
    Network,
} from 'lucide-react';

interface Node {
    id: number;
    name: string;
    description: string;
    location_id: number;
    fqdn: string;
    scheme: string;
    behind_proxy: boolean;
    maintenance_mode: boolean;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemon_token_id: string;
    daemon_token: string;
    daemonListen: number;
    daemonSFTP: number;
    daemonBase: string;
    created_at: string;
    updated_at: string;
}

interface Location {
    id: number;
    name: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export default function NodesPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const locationIdFilter = searchParams.get('location_id');

    const [loading, setLoading] = useState(true);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [nodeHealth, setNodeHealth] = useState<Record<number, string>>({});
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Pagination
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Plugin Widgets
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-nodes');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

    // Fetch locations for mapping
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const { data } = await axios.get('/api/admin/locations', {
                    params: { limit: 100 },
                });
                setLocations(data.data.locations || []);
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };
        fetchLocations();
    }, []);

    // Redirect to locations if no location_id
    useEffect(() => {
        if (!loading && nodes.length === 0 && !locationIdFilter && !debouncedSearchQuery) {
            router.replace('/admin/locations');
        }
    }, [loading, nodes.length, locationIdFilter, debouncedSearchQuery, router]);

    const checkNodeHealth = useCallback(async (nodeId: number) => {
        try {
            const { data } = await axios.get(`/api/wings/admin/node/${nodeId}/system`);
            setNodeHealth((prev) => ({ ...prev, [nodeId]: data.success ? 'online' : 'offline' }));
        } catch (error) {
            console.error(`Error checking health for node ${nodeId}:`, error);
            setNodeHealth((prev) => ({ ...prev, [nodeId]: 'offline' }));
        }
    }, []);

    const checkAllNodesHealth = useCallback(
        async (nodesToCheck: Node[]) => {
            setIsCheckingHealth(true);
            try {
                await Promise.all(nodesToCheck.map((node) => checkNodeHealth(node.id)));
            } catch (error) {
                console.error('Error checking all nodes health:', error);
                toast.error(t('admin.node.messages.health_check_failed'));
            } finally {
                setIsCheckingHealth(false);
            }
        },
        [checkNodeHealth, t],
    );

    const fetchNodes = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: debouncedSearchQuery || undefined,
                    location_id: locationIdFilter || undefined,
                },
            });

            const fetchedNodes = data.data.nodes || [];
            setNodes(fetchedNodes);
            const apiPagination = data.data.pagination;
            setPagination({
                page: apiPagination.current_page,
                pageSize: apiPagination.per_page,
                total: apiPagination.total_records,
                totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                hasNext: apiPagination.has_next,
                hasPrev: apiPagination.has_prev,
            });

            // Auto-check health after fetching nodes
            if (fetchedNodes.length > 0) {
                checkAllNodesHealth(fetchedNodes);
            }
        } catch (error) {
            console.error('Error fetching nodes:', error);
            toast.error(t('admin.node.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, locationIdFilter, t, checkAllNodesHealth]);

    useEffect(() => {
        fetchNodes();
    }, [fetchNodes, refreshKey]);

    const handleDelete = (id: number) => {
        setConfirmDeleteId(id);
    };

    const confirmDelete = async (id: number) => {
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/nodes/${id}`);
            toast.success(t('admin.node.messages.delete_success'));
            setRefreshKey((prev) => prev + 1);
            setConfirmDeleteId(null);
        } catch (error) {
            console.error('Error deleting node:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.node.messages.delete_failed'));
            }
        } finally {
            setDeleting(false);
        }
    };

    const getLocationName = (locationId: number) => {
        return locations.find((l) => l.id === locationId)?.name || t('common.unknown');
    };

    const getNodeHealthStatus = (nodeId: number) => {
        return nodeHealth[nodeId] || 'unknown';
    };

    const currentLocation = locationIdFilter ? locations.find((l) => l.id === parseInt(locationIdFilter)) : null;

    return (
        <div className='space-y-6'>
            {/* Plugin Widgets: Top of Page */}
            <WidgetRenderer widgets={getWidgets('admin-nodes', 'top-of-page')} />

            <PageHeader
                title={t('admin.node.title')}
                description={
                    currentLocation
                        ? t('admin.node.viewAndManage', { location: currentLocation.name })
                        : t('admin.node.description')
                }
                icon={Server}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            loading={isCheckingHealth}
                            onClick={() => checkAllNodesHealth(nodes)}
                            title={t('admin.node.health.refresh')}
                        >
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                        <Button onClick={() => router.push('/admin/nodes/create')}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.node.create')}
                        </Button>
                    </div>
                }
            />

            {/* Plugin Widgets: After Header */}
            <WidgetRenderer widgets={getWidgets('admin-nodes', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.node.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            {/* Plugin Widgets: Before List */}
            <WidgetRenderer widgets={getWidgets('admin-nodes', 'before-list')} />

            {loading ? (
                <TableSkeleton count={5} />
            ) : nodes.length === 0 ? (
                <EmptyState
                    icon={Server}
                    title={t('admin.node.no_results')}
                    description={t('admin.node.search_placeholder')}
                    action={
                        <Button onClick={() => router.push('/admin/nodes/create')}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.node.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {nodes.map((node) => {
                        const health = getNodeHealthStatus(node.id);
                        const badges: ResourceBadge[] = [
                            {
                                label: t(`admin.node.health.${health}`),
                                className:
                                    health === 'online'
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : health === 'offline'
                                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                          : 'bg-muted text-muted-foreground',
                            },
                            {
                                label: getLocationName(node.location_id),
                                className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                            },
                        ];

                        if (node.maintenance_mode) {
                            badges.push({
                                label: 'Maintenance',
                                className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                            });
                        }

                        return (
                            <ResourceCard
                                key={node.id}
                                title={node.name}
                                subtitle={node.fqdn}
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
                                            onClick={() => router.push(`/admin/nodes/${node.id}/databases`)}
                                            title={t('admin.node.actions.databases')}
                                        >
                                            <DatabaseIcon className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => router.push(`/admin/nodes/${node.id}/edit`)}
                                            title={t('admin.node.actions.edit')}
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
                                                    {t('admin.node.actions.confirm_delete')}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    disabled={deleting}
                                                >
                                                    {t('admin.node.actions.cancel_delete')}
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                onClick={() => handleDelete(node.id)}
                                                title={t('admin.node.actions.delete')}
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

            {/* Help Cards */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <PageCard title={t('admin.node.help.what.title')} icon={Server}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.node.help.what.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.node.help.utility.title')} icon={Network}>
                    <ul className='text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1'>
                        <li>{t('admin.node.help.utility.deploy')}</li>
                        <li>{t('admin.node.help.utility.health')}</li>
                        <li>{t('admin.node.help.utility.limits')}</li>
                        <li>{t('admin.node.help.utility.storage')}</li>
                    </ul>
                </PageCard>
                <PageCard title={t('admin.node.help.locations.title')} icon={MapPin}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.node.help.locations.description')}
                    </p>
                </PageCard>
            </div>

            {/* Wings Info Card */}
            <PageCard title={t('admin.node.help.wings.title')} icon={Shield} className='mt-6'>
                <div className='text-sm text-muted-foreground space-y-4'>
                    <p>{t('admin.node.help.wings.p1')}</p>
                    <p>{t('admin.node.help.wings.p2')}</p>
                </div>
            </PageCard>

            {/* Plugin Widgets: Bottom of Page */}
            <WidgetRenderer widgets={getWidgets('admin-nodes', 'bottom-of-page')} />
        </div>
    );
}
