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
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import {
    AppWindow,
    Plus,
    Search,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Loader2,
    HardDrive,
    User,
    Network,
    HelpCircle,
    Layers,
    X,
    Globe,
    Play,
    Square,
    RotateCcw,
    Shield,
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
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface WebSpace {
    uuid: string;
    uuidShort?: string | null;
    name: string;
    description?: string | null;
    web_node_id: number;
    webplate_id: number;
    web_node_name?: string | null;
    webplate_name?: string | null;
    webplate_runtime?: string | null;
    owner_id?: number | null;
    owner_username?: string | null;
    owner_uuid?: string | null;
    owner_email?: string | null;
    disk: number;
    domains: string[];
    ssl: boolean;
    status: string;
    state?: string;
    backend_port?: number;
    document_root?: string;
}

interface Pagination {
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    from: number;
    to: number;
}

interface WebNode {
    id: number;
    name: string;
    fqdn?: string;
}

interface User {
    id: number;
    uuid: string;
    username: string;
    email: string;
}

const WEBSPACES_LIST_FILTERS_KEY = 'featherpanel_admin_webspaces_filters_v2';
const WEBSPACES_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    ownerFilter: '',
    webNodeId: '',
    page: 1,
    pageSize: 10,
    filterOwner: null as User | null,
    filterNode: null as WebNode | null,
};

export default function WebSpacesPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const { filters, patchFilters, resetFilters, hydrated } = usePersistedListFilters(
        WEBSPACES_LIST_FILTERS_KEY,
        WEBSPACES_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, ownerFilter, webNodeId, page, pageSize, filterOwner, filterNode } = filters;

    const [loading, setLoading] = useState(true);
    const [spaces, setSpaces] = useState<WebSpace[]>([]);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [confirmDeleteUuid, setConfirmDeleteUuid] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [powering, setPowering] = useState<string | null>(null);

    const [pagination, setPagination] = useState<Pagination>({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        from: 0,
        to: 0,
    });
    const [isOwnerFilterModalOpen, setIsOwnerFilterModalOpen] = useState(false);
    const [isNodeFilterModalOpen, setIsNodeFilterModalOpen] = useState(false);
    const [ownerFilterSearch, setOwnerFilterSearch] = useState('');
    const [ownerFilterResults, setOwnerFilterResults] = useState<User[]>([]);
    const [ownerFilterLoading, setOwnerFilterLoading] = useState(false);
    const [nodesList, setNodesList] = useState<WebNode[]>([]);
    const [loadingNodes, setLoadingNodes] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState<WebSpace | null>(null);
    const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-webspaces');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            if (searchQuery !== debouncedSearch) {
                patchFilters({ page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearch, patchFilters]);

    const fetchSpaces = useCallback(async () => {
        if (!hydrated) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/webspaces', {
                params: {
                    page,
                    limit: pageSize,
                    search: debouncedSearch || undefined,
                    web_node_id: webNodeId || undefined,
                    owner_id: ownerFilter || undefined,
                },
            });

            setSpaces((data.data?.webspaces ?? []) as WebSpace[]);
            const pag = data.data?.pagination ?? {};
            setPagination({
                total: pag.total_records || 0,
                totalPages: pag.total_pages || Math.ceil((pag.total_records || 0) / (pag.per_page || 10)),
                hasNext: pag.has_next || false,
                hasPrev: pag.has_prev || false,
                from: pag.from || 0,
                to: pag.to || 0,
            });
        } catch (error) {
            console.error('Error fetching WebSpaces:', error);
            toast.error(t('admin.webSpaces.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearch, webNodeId, ownerFilter, t, hydrated]);

    useEffect(() => {
        fetchWidgets();
        fetchSpaces();
    }, [fetchSpaces, fetchWidgets]);

    const hasInstalling = spaces.some((s) => s.status === 'installing' || s.status === 'reinstalling');

    useEffect(() => {
        if (!hasInstalling) return;
        const id = setInterval(() => {
            void fetchSpaces();
        }, 5000);
        return () => clearInterval(id);
    }, [hasInstalling, fetchSpaces]);

    const handleDeleteClick = (e: React.MouseEvent, uuid: string) => {
        e.stopPropagation();
        setConfirmDeleteUuid(uuid);
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteUuid) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/webspaces/${confirmDeleteUuid}`);
            toast.success(t('admin.webSpaces.messages.deleted'));
            setConfirmDeleteUuid(null);
            fetchSpaces();
        } catch (error) {
            let msg = t('admin.webSpaces.messages.delete_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const handlePower = async (space: WebSpace, action: 'start' | 'stop' | 'restart') => {
        setPowering(`${space.uuid}:${action}`);
        try {
            const { data } = await axios.post(`/api/admin/webspaces/${space.uuid}/power`, { action });
            const updated = data?.data?.webspace as WebSpace | undefined;
            if (updated) {
                setSpaces((prev) => prev.map((s) => (s.uuid === space.uuid ? { ...s, ...updated } : s)));
            } else {
                fetchSpaces();
            }
            toast.success(t('admin.webSpaces.messages.power_ok', { action }));
        } catch (error) {
            let msg = t('admin.webSpaces.messages.power_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setPowering(null);
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
            const { data } = await axios.get('/api/admin/web-nodes', {
                params: { page: 1, limit: 50 },
            });
            setNodesList((data.data?.web_nodes || []) as WebNode[]);
        } catch (error) {
            console.error('Error fetching web nodes:', error);
        } finally {
            setLoadingNodes(false);
        }
    };

    const handleView = (space: WebSpace) => {
        setSelectedSpace(space);
        setIsViewDrawerOpen(true);
    };

    const consolePath = (space: WebSpace) => {
        if (space.status === 'installing' || space.status === 'reinstalling') {
            return `/admin/webspaces/${space.uuid}/install`;
        }
        if (space.uuidShort) {
            return `/webspace/${space.uuidShort}`;
        }
        return `/admin/webspaces/${space.uuid}`;
    };

    const statusLabel = (status: string) => {
        const key = `admin.webSpaces.status.${status}`;
        const translated = t(key);
        return translated === key ? status : translated;
    };

    const stateLabel = (state: string) => {
        const key = `admin.webSpaces.state.${state}`;
        const translated = t(key);
        return translated === key ? state : translated;
    };

    const stateStyles: Record<string, string> = {
        running: 'bg-green-500/10 text-green-600 border-green-500/20',
        stopped: 'bg-red-500/10 text-red-600 border-red-500/20',
        starting: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        stopping: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        unknown: 'bg-muted text-muted-foreground border-border/50',
    };

    const stateDotStyles: Record<string, string> = {
        running: 'bg-green-500',
        stopped: 'bg-red-500',
        starting: 'bg-blue-500',
        stopping: 'bg-orange-500',
        unknown: 'bg-muted-foreground',
    };

    const statusStyles: Record<string, string> = {
        installed: 'bg-green-500/10 text-green-600 border-green-500/20',
        installing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        reinstalling: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        failed: 'bg-red-500/10 text-red-600 border-red-500/20',
        installation_failed: 'bg-red-500/10 text-red-600 border-red-500/20',
        daemon_sync_failed: 'bg-red-500/10 text-red-600 border-red-500/20',
    };

    const statusDotStyles: Record<string, string> = {
        installed: 'bg-green-500',
        installing: 'bg-blue-500 animate-pulse',
        reinstalling: 'bg-blue-500 animate-pulse',
        failed: 'bg-red-500',
        installation_failed: 'bg-red-500',
        daemon_sync_failed: 'bg-red-500',
    };

    const filtersActive = !!(searchQuery || filterOwner || filterNode || ownerFilter || webNodeId);

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-webspaces', 'top-of-page')} />

            <PageHeader
                title={t('admin.webSpaces.title')}
                description={t('admin.webSpaces.description')}
                icon={AppWindow}
                actions={
                    <Button size='sm' onClick={() => router.push('/admin/webspaces/create')}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.webSpaces.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-webspaces', 'after-header')} />

            <div className='bg-card/50 border-border flex flex-col items-stretch gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur-md'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.webSpaces.search_placeholder')}
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
                                ? t('admin.webSpaces.filters.user_selected', { username: filterOwner.username })
                                : t('admin.webSpaces.filters.user')}
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
                                ? t('admin.webSpaces.filters.node_selected', { name: filterNode.name })
                                : t('admin.webSpaces.filters.node')}
                        </Button>
                        {filtersActive && (
                            <Button
                                variant='ghost'
                                size='sm'
                                className='h-9 text-xs'
                                onClick={() => {
                                    resetFilters();
                                }}
                            >
                                <X className='mr-2 h-3.5 w-3.5' />
                                {t('admin.webSpaces.filters.clear')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-webspaces', 'before-list')} />

            {loading ? (
                <TableSkeleton count={5} />
            ) : spaces.length === 0 ? (
                <EmptyState
                    icon={AppWindow}
                    title={t('admin.webSpaces.no_results')}
                    description={t('admin.webSpaces.empty_desc')}
                    action={
                        <Button size='sm' onClick={() => router.push('/admin/webspaces/create')}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.webSpaces.create')}
                        </Button>
                    }
                />
            ) : (
                <>
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
                                {pagination.total > 0 && ` (${pagination.total} ${t('common.total')})`}
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
                        {spaces.map((space) => {
                            const state = space.state || 'stopped';
                            const busy = powering?.startsWith(space.uuid);
                            const shortId = space.uuidShort || space.uuid.slice(0, 8);
                            const domainCount = Array.isArray(space.domains) ? space.domains.length : 0;
                            const badges: ResourceBadge[] = [
                                {
                                    label: space.web_node_name || t('admin.webSpaces.unknown_node'),
                                    className: 'bg-primary/10 text-primary border-primary/20',
                                },
                                {
                                    label: space.owner_username || t('admin.webSpaces.unassigned'),
                                    className: 'bg-muted text-muted-foreground border-border/50',
                                },
                            ];
                            const pillKey = space.status && space.status !== 'installed' ? space.status : state;
                            const isStatusPill = space.status && space.status !== 'installed';
                            return (
                                <ResourceCard
                                    key={space.uuid}
                                    title={space.name}
                                    subtitle={shortId}
                                    icon={AppWindow}
                                    badges={badges}
                                    description={
                                        <div className='mt-2 flex flex-wrap items-center gap-4'>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium',
                                                    isStatusPill
                                                        ? (statusStyles[pillKey] ?? stateStyles.unknown)
                                                        : (stateStyles[pillKey] ?? stateStyles.unknown),
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'h-2 w-2 shrink-0 rounded-full',
                                                        isStatusPill
                                                            ? (statusDotStyles[pillKey] ?? 'bg-muted-foreground')
                                                            : (stateDotStyles[pillKey] ?? 'bg-muted-foreground'),
                                                    )}
                                                />
                                                {isStatusPill ? statusLabel(pillKey) : stateLabel(pillKey)}
                                            </span>
                                            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                                                <Globe className='h-3.5 w-3.5' />
                                                <span>
                                                    {domainCount > 0
                                                        ? t('admin.webSpaces.domains_count', {
                                                              count: String(domainCount),
                                                          })
                                                        : t('admin.webSpaces.no_domains')}
                                                </span>
                                            </div>
                                            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                                                <HardDrive className='h-3.5 w-3.5' />
                                                <span>
                                                    {t('admin.webSpaces.disk_mib', { disk: String(space.disk) })}
                                                </span>
                                            </div>
                                            {space.ssl && (
                                                <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                                                    <Shield className='h-3.5 w-3.5' />
                                                    <span>SSL</span>
                                                </div>
                                            )}
                                        </div>
                                    }
                                    onClick={() => router.push(consolePath(space))}
                                    actions={
                                        <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
                                            {state !== 'running' ? (
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    loading={powering === `${space.uuid}:start`}
                                                    disabled={!!busy}
                                                    onClick={() => void handlePower(space, 'start')}
                                                    title={t('admin.webSpaces.power.start')}
                                                >
                                                    <Play className='h-4 w-4' />
                                                </Button>
                                            ) : (
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    loading={powering === `${space.uuid}:stop`}
                                                    disabled={!!busy}
                                                    onClick={() => void handlePower(space, 'stop')}
                                                    title={t('admin.webSpaces.power.stop')}
                                                >
                                                    <Square className='h-4 w-4' />
                                                </Button>
                                            )}
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                loading={powering === `${space.uuid}:restart`}
                                                disabled={!!busy}
                                                onClick={() => void handlePower(space, 'restart')}
                                                title={t('admin.webSpaces.power.restart')}
                                            >
                                                <RotateCcw className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => handleView(space)}
                                                title={t('admin.servers.actions.view')}
                                            >
                                                <Eye className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => router.push(`/admin/webspaces/${space.uuid}/edit`)}
                                                title={t('common.edit')}
                                            >
                                                <Pencil className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                onClick={(e) => handleDeleteClick(e, space.uuid)}
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

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <PageCard title={t('admin.webSpaces.help.managing.title')} icon={AppWindow}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.webSpaces.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.webSpaces.help.resources.title')} icon={Layers}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.webSpaces.help.resources.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.webSpaces.help.tips.title')} icon={HelpCircle} className='md:col-span-2'>
                    <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm leading-relaxed'>
                        <li>{t('admin.webSpaces.help.tips.item1')}</li>
                        <li>{t('admin.webSpaces.help.tips.item2')}</li>
                        <li>{t('admin.webSpaces.help.tips.item3')}</li>
                    </ul>
                </PageCard>
            </div>

            <AlertDialog open={confirmDeleteUuid !== null} onOpenChange={() => setConfirmDeleteUuid(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.webSpaces.delete_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('admin.webSpaces.delete_confirm_desc')}</AlertDialogDescription>
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
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    {t('common.deleting')}
                                </>
                            ) : (
                                t('common.delete')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={isOwnerFilterModalOpen}
                onClose={() => setIsOwnerFilterModalOpen(false)}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsOwnerFilterModalOpen(false);
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle>{t('admin.webSpaces.filters.select_user')}</DialogTitle>
                </DialogHeader>
                <div className='space-y-4'>
                    <Input
                        placeholder={t('common.search')}
                        value={ownerFilterSearch}
                        onChange={(e) => {
                            setOwnerFilterSearch(e.target.value);
                            fetchOwnerFilterUsers(e.target.value);
                        }}
                        className='mb-4'
                    />
                    <div className='max-h-100 space-y-2 overflow-y-auto'>
                        {ownerFilterLoading ? (
                            <div className='py-4 text-center'>
                                <Loader2 className='mx-auto h-6 w-6 animate-spin' />
                            </div>
                        ) : ownerFilterResults.length === 0 ? (
                            <p className='text-muted-foreground py-4 text-center'>{t('common.no_results')}</p>
                        ) : (
                            ownerFilterResults.map((user) => (
                                <button
                                    key={user.id}
                                    type='button'
                                    onClick={() => {
                                        patchFilters({
                                            filterOwner: user,
                                            ownerFilter: String(user.id),
                                            page: 1,
                                        });
                                        setIsOwnerFilterModalOpen(false);
                                    }}
                                    className='border-border/50 hover:border-primary hover:bg-primary/5 w-full rounded-xl border p-3 text-left'
                                >
                                    <div className='flex flex-col'>
                                        <span className='font-semibold'>{user.username}</span>
                                        <span className='text-muted-foreground text-xs'>{user.email}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </Dialog>

            <Dialog
                open={isNodeFilterModalOpen}
                onClose={() => setIsNodeFilterModalOpen(false)}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsNodeFilterModalOpen(false);
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle>{t('admin.webSpaces.filters.select_node')}</DialogTitle>
                </DialogHeader>
                <div className='space-y-4'>
                    <div className='max-h-100 space-y-2 overflow-y-auto'>
                        {loadingNodes ? (
                            <div className='py-4 text-center'>
                                <Loader2 className='mx-auto h-6 w-6 animate-spin' />
                            </div>
                        ) : nodesList.length === 0 ? (
                            <p className='text-muted-foreground py-4 text-center'>{t('common.no_results')}</p>
                        ) : (
                            nodesList.map((node) => (
                                <button
                                    key={node.id}
                                    type='button'
                                    onClick={() => {
                                        patchFilters({
                                            filterNode: node,
                                            webNodeId: String(node.id),
                                            page: 1,
                                        });
                                        setIsNodeFilterModalOpen(false);
                                    }}
                                    className='border-border/50 hover:border-primary hover:bg-primary/5 w-full rounded-xl border p-3 text-left'
                                >
                                    <div className='flex flex-col'>
                                        <span className='font-semibold'>{node.name}</span>
                                        {node.fqdn && (
                                            <span className='text-muted-foreground text-xs'>{node.fqdn}</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </Dialog>

            <Sheet open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
                <SheetContent side='right' className='custom-scrollbar overflow-y-auto sm:max-w-2xl'>
                    {selectedSpace && (
                        <>
                            <SheetHeader>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <SheetTitle className='flex items-center gap-2'>
                                            <AppWindow className='text-primary h-5 w-5' />
                                            {selectedSpace.name}
                                        </SheetTitle>
                                        <SheetDescription>
                                            {selectedSpace.uuidShort || selectedSpace.uuid.slice(0, 8)}
                                        </SheetDescription>
                                    </div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => router.push(consolePath(selectedSpace))}
                                        className='rounded-xl border-dashed'
                                    >
                                        <Eye className='mr-2 h-4 w-4' />
                                        {t('admin.servers.actions.view')}
                                    </Button>
                                </div>
                            </SheetHeader>

                            <div className='mt-8 space-y-6'>
                                <div className='bg-muted/30 border-border/50 rounded-2xl border p-5'>
                                    <h4 className='text-primary mb-4 text-xs font-black tracking-widest uppercase'>
                                        {t('admin.webSpaces.detail.details')}
                                    </h4>
                                    <div className='space-y-4'>
                                        <DetailItem label={t('admin.webSpaces.form.name')} value={selectedSpace.name} />
                                        <DetailItem
                                            label={t('admin.webSpaces.detail.state')}
                                            value={stateLabel(selectedSpace.state || 'stopped')}
                                        />
                                        <DetailItem
                                            label={t('common.status')}
                                            value={statusLabel(selectedSpace.status)}
                                        />
                                        <DetailItem
                                            label={t('admin.webSpaces.form.web_node')}
                                            value={selectedSpace.web_node_name || t('admin.webSpaces.unknown_node')}
                                        />
                                        <DetailItem
                                            label={t('admin.webSpaces.form.webplate')}
                                            value={
                                                selectedSpace.webplate_name ||
                                                t('admin.webSpaces.detail.plate_fallback')
                                            }
                                        />
                                        <DetailItem
                                            label={t('admin.servers.form.owner')}
                                            value={selectedSpace.owner_username || t('admin.webSpaces.unassigned')}
                                        />
                                        {selectedSpace.owner_email && (
                                            <DetailItem
                                                label={t('admin.webSpaces.detail.owner_email')}
                                                value={selectedSpace.owner_email}
                                                isMono
                                            />
                                        )}
                                        <DetailItem
                                            label={t('admin.webSpaces.form.disk')}
                                            value={t('admin.webSpaces.disk_mib', {
                                                disk: String(selectedSpace.disk),
                                            })}
                                        />
                                        <DetailItem
                                            label={t('admin.webSpaces.detail.domains')}
                                            value={
                                                Array.isArray(selectedSpace.domains) && selectedSpace.domains.length > 0
                                                    ? selectedSpace.domains.join(', ')
                                                    : t('admin.webSpaces.detail.none')
                                            }
                                        />
                                        <DetailItem
                                            label={t('admin.webSpaces.form.ssl')}
                                            value={selectedSpace.ssl ? t('common.enabled') : t('common.disabled')}
                                        />
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
            <span className='text-muted-foreground shrink-0 text-sm font-medium'>{label}</span>
            <span className={cn('text-foreground text-right text-sm break-all', isMono && 'font-mono')}>{value}</span>
        </div>
    );
}
