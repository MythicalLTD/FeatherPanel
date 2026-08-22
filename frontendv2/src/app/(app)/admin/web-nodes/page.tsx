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
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import { Server, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, MapPin, LayoutTemplate } from 'lucide-react';

interface WebNode {
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    location_id: number;
    fqdn: string;
    scheme: string;
    behind_proxy: number | boolean;
    maintenance_mode: number | boolean;
    memory: number;
    disk: number;
    daemonListen: number;
    daemonBase: string;
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

const WEB_NODES_LIST_FILTERS_KEY = 'featherpanel_admin_web_nodes_filters_v1';
const WEB_NODES_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    locationId: '',
    page: 1,
    pageSize: 10,
};

export default function WebNodesPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlLocationId = searchParams.get('location_id') ?? '';

    const { filters, patchFilters, hydrated } = usePersistedListFilters(
        WEB_NODES_LIST_FILTERS_KEY,
        WEB_NODES_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, page, pageSize } = filters;
    const locationIdFilter = urlLocationId;

    const [loading, setLoading] = useState(true);
    const [webNodes, setWebNodes] = useState<WebNode[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [searchQueryDebounced, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-web-nodes');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== searchQueryDebounced) {
                patchFilters({ page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, searchQueryDebounced, patchFilters]);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const { data } = await axios.get('/api/admin/locations', {
                    params: { limit: 100, type: 'web' },
                });
                setLocations((data.data.locations || []) as Location[]);
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };
        fetchLocations();
    }, []);

    const fetchWebNodes = useCallback(async () => {
        if (!hydrated) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/web-nodes', {
                params: {
                    page,
                    limit: pageSize,
                    search: searchQueryDebounced || undefined,
                    location_id: locationIdFilter || undefined,
                },
            });

            setWebNodes((data.data.web_nodes || []) as WebNode[]);
            const apiPagination = data.data.pagination;
            setPagination({
                total: apiPagination.total_records,
                totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                hasNext: apiPagination.has_next,
                hasPrev: apiPagination.has_prev,
            });
        } catch (error) {
            console.error('Error fetching web nodes:', error);
            toast.error(t('admin.webNodes.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchQueryDebounced, locationIdFilter, t, hydrated]);

    useEffect(() => {
        fetchWebNodes();
    }, [fetchWebNodes, refreshKey]);

    const confirmDelete = async (id: number) => {
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/web-nodes/${id}`);
            toast.success(t('admin.webNodes.messages.delete_success'));
            setRefreshKey((prev) => prev + 1);
            setConfirmDeleteId(null);
        } catch (error) {
            console.error('Error deleting web node:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.webNodes.messages.delete_failed'));
            }
        } finally {
            setDeleting(false);
        }
    };

    const getLocationName = (locationId: number) => {
        return locations.find((l) => l.id === locationId)?.name || t('common.unknown');
    };

    const currentLocation = locationIdFilter ? locations.find((l) => l.id === parseInt(locationIdFilter)) : null;

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-web-nodes', 'top-of-page')} />

            <PageHeader
                title={t('admin.webNodes.title')}
                description={
                    currentLocation
                        ? t('admin.webNodes.viewAndManage', { location: currentLocation.name })
                        : t('admin.webNodes.description')
                }
                icon={LayoutTemplate}
                actions={
                    <Button onClick={() => router.push('/admin/web-nodes/create')}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.webNodes.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-web-nodes', 'after-header')} />

            <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.webNodes.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                        className='h-11 w-full pl-10'
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-web-nodes', 'before-list')} />

            {pagination.totalPages > 1 && !loading && (
                <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={page === 1}
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
                        disabled={page === pagination.totalPages}
                        onClick={() => patchFilters({ page: page + 1 })}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {loading ? (
                <TableSkeleton count={5} />
            ) : webNodes.length === 0 ? (
                <EmptyState
                    icon={Server}
                    title={t('admin.webNodes.no_results')}
                    description={t('admin.webNodes.search_placeholder')}
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {webNodes.map((node) => {
                        const badges: ResourceBadge[] = [
                            {
                                label: getLocationName(node.location_id),
                                className: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
                            },
                            ...(node.maintenance_mode
                                ? [
                                      {
                                          label: t('admin.webNodes.form.maintenance_enabled'),
                                          className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                                      },
                                  ]
                                : []),
                        ];

                        return (
                            <ResourceCard
                                key={node.id}
                                title={node.name}
                                subtitle={`${node.scheme}://${node.fqdn}:${node.daemonListen}`}
                                icon={LayoutTemplate}
                                badges={badges}
                                description={
                                    <div className='text-muted-foreground mt-1 line-clamp-1 text-sm'>
                                        {node.description || t('common.nA')}
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => router.push(`/admin/web-nodes/${node.id}/edit`)}
                                            title={t('admin.webNodes.actions.edit')}
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
                                                    {t('admin.webNodes.actions.confirm_delete')}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    disabled={deleting}
                                                >
                                                    {t('admin.webNodes.actions.cancel_delete')}
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                onClick={() => setConfirmDeleteId(node.id)}
                                                title={t('admin.webNodes.actions.delete')}
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
                <div className='mt-8 flex items-center justify-center gap-2'>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={page === 1}
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
                        disabled={page === pagination.totalPages}
                        onClick={() => patchFilters({ page: page + 1 })}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
                <PageCard title={t('admin.webNodes.help.what.title')} icon={LayoutTemplate}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.webNodes.help.what.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.webNodes.help.utility.title')} icon={Server}>
                    <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm leading-relaxed'>
                        <li>{t('admin.webNodes.help.utility.connect')}</li>
                        <li>{t('admin.webNodes.help.utility.limits')}</li>
                        <li>{t('admin.webNodes.help.utility.mapLocations')}</li>
                    </ul>
                </PageCard>
                <PageCard title={t('admin.webNodes.help.locations.title')} icon={MapPin}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.webNodes.help.locations.description')}
                    </p>
                </PageCard>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-web-nodes', 'bottom-of-page')} />
        </div>
    );
}
