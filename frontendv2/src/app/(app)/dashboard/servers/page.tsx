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

import { PageHeader } from '@/components/featherui/PageHeader';
import { useState, useEffect, Fragment, useCallback, useRef } from 'react';

import { Server, ServerFolder } from '@/types/server';

import { cn } from '@/lib/utils';
import { serversApi } from '@/lib/servers-api';
import { useServersWebSocket } from '@/hooks/useServersWebSocket';
import { useFavoriteServerUuids } from '@/hooks/useFavoriteServerUuids';
import { useServersState } from '@/hooks/useServersState';
import { useFolders } from '@/hooks/useFolders';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    TabGroup,
    TabPanel,
    TabPanels,
    Switch,
    Listbox,
    ListboxButton,
    ListboxOptions,
    ListboxOption,
    RadioGroup,
    RadioGroupOption,
    Transition,
} from '@headlessui/react';
import {
    Filter,
    Check,
    ChevronsUpDown,
    RefreshCw,
    Trash2,
    Pencil,
    FolderPlus,
    TriangleAlert,
    Server as ServerIcon,
    Folder,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    List,
} from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { ServerCard } from '@/components/servers/ServerCard';
import { EmptyState } from '@/components/servers/EmptyState';
import { FolderDialog } from '@/components/servers/FolderDialog';
import { BulkSelectionRow, BulkServerActions } from '@/components/servers/BulkServerActions';

export default function ServersPage() {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const canViewAllServers = hasPermission(Permissions.ADMIN_SERVERS_VIEW);

    const sortOptions = [
        { id: 'name', name: t('servers.sort.name') },
        { id: 'status', name: t('servers.sort.status') },
        { id: 'created', name: t('servers.sort.dateCreated') },
        { id: 'updated', name: t('servers.sort.lastUpdated') },
    ];

    const layoutOptions = [
        { id: 'grid', name: t('servers.layout.grid'), icon: LayoutGrid },
        { id: 'list', name: t('servers.layout.list'), icon: List },
    ];

    const {
        selectedLayout,
        selectedSort,
        showOnlyRunning,
        viewMode,
        setSelectedLayout,
        setSelectedSort,
        setShowOnlyRunning,
        setViewMode,
    } = useServersState();

    const { serverLiveData, isServerConnected, syncServers, disconnectAll } = useServersWebSocket();

    const { favoriteUuids, toggleFavorite } = useFavoriteServerUuids();

    const {
        folders,
        serverAssignments,
        createFolder,
        updateFolder,
        deleteFolder,
        assignServerToFolder,
        unassignServer,
    } = useFolders();

    const [servers, setServers] = useState<Server[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<ServerFolder | null>(null);
    const [folderFormData, setFolderFormData] = useState({ name: '', description: '' });
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
        from: 0,
        to: 0,
    });

    // Admin: "My Servers" vs "All Servers" (others' servers)
    const [serverScope, setServerScope] = useState<'mine' | 'all'>('mine');

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-servers');

    const [selectedServerIds, setSelectedServerIds] = useState<number[]>([]);
    const fetchGenerationRef = useRef(0);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const monitorServersForLiveStats = useCallback(
        (serversArray: Server[]) => {
            const serverUuids = serversArray
                .filter((server) => server.status === 'running' || server.status === 'starting')
                .map((server) => server.uuidShort);
            void syncServers(serverUuids);
        },
        [syncServers],
    );

    const fetchServers = useCallback(
        async (page = 1, fetchAllForFolders = false) => {
            const fetchId = ++fetchGenerationRef.current;

            try {
                setLoading(true);
                setError(null);

                const response = await serversApi.getServers(
                    false,
                    page,
                    fetchAllForFolders ? 1000 : pagination.per_page,
                    searchQuery,
                    showOnlyRunning,
                );

                if (fetchId !== fetchGenerationRef.current) {
                    return;
                }

                const serversArray = Array.isArray(response.servers) ? response.servers : [];
                setServers(serversArray);
                setPagination(response.pagination);
                monitorServersForLiveStats(serversArray);
            } catch (err) {
                if (fetchId !== fetchGenerationRef.current) {
                    return;
                }
                console.error('Failed to fetch servers:', err);
                setError(err instanceof Error ? err.message : t('servers.errorLoading'));
            } finally {
                if (fetchId === fetchGenerationRef.current) {
                    setLoading(false);
                }
            }
        },
        [pagination.per_page, searchQuery, showOnlyRunning, t, monitorServersForLiveStats],
    );

    const fetchAllOtherServers = useCallback(
        async (page = 1) => {
            const fetchId = ++fetchGenerationRef.current;

            try {
                setLoading(true);
                setError(null);

                const response = await serversApi.getAdminAllOtherServers(
                    page,
                    pagination.per_page,
                    searchQuery,
                    showOnlyRunning,
                );

                if (fetchId !== fetchGenerationRef.current) {
                    return;
                }

                const serversArray = Array.isArray(response.servers) ? response.servers : [];
                setServers(serversArray);
                setPagination(response.pagination);
                monitorServersForLiveStats(serversArray);
            } catch (err) {
                if (fetchId !== fetchGenerationRef.current) {
                    return;
                }
                console.error('Failed to fetch all other servers', err);
                setError(err instanceof Error ? err.message : t('servers.errorLoading'));
            } finally {
                if (fetchId === fetchGenerationRef.current) {
                    setLoading(false);
                }
            }
        },
        [pagination.per_page, searchQuery, showOnlyRunning, t, monitorServersForLiveStats],
    );

    const fetchServersRef = useRef(fetchServers);
    fetchServersRef.current = fetchServers;

    useEffect(() => {
        setSelectedServerIds([]);
        if (serverScope === 'all') {
            void fetchAllOtherServers(1);
        } else {
            fetchServersRef.current(1, viewMode === 'folders');
        }
    }, [viewMode, serverScope, searchQuery, showOnlyRunning, fetchAllOtherServers]);

    useEffect(() => {
        return () => {
            disconnectAll();
        };
    }, [disconnectAll]);

    const serversWithFolders = servers.map((server) => ({
        ...server,
        folder_id: serverAssignments[server.uuidShort] || server.folder_id,
    }));

    // Search and "running only" are applied server-side for paginated views.
    const filteredServers = Array.isArray(serversWithFolders) ? serversWithFolders : [];

    const serversByFolder = folders.map((folder) => ({
        ...folder,
        servers: filteredServers.filter((s) => s.folder_id === folder.id),
    }));

    const unassignedServers = filteredServers.filter((s) => !s.folder_id);

    const toggleServerSelection = (serverId: number) => {
        setSelectedServerIds((prev) =>
            prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId],
        );
    };

    const clearSelection = () => setSelectedServerIds([]);

    const selectAllVisible = () => {
        const visibleIds = filteredServers.map((server) => server.id);
        setSelectedServerIds(visibleIds);
    };

    const selectedServers = filteredServers.filter((server) => selectedServerIds.includes(server.id));

    const handleBulkFinished = (failedUuidShorts: string[]) => {
        // Failed servers stay selected so the user can retry them.
        setSelectedServerIds(
            filteredServers.filter((server) => failedUuidShorts.includes(server.uuidShort)).map((server) => server.id),
        );
    };

    const openCreateFolder = () => {
        setEditingFolder(null);
        setFolderFormData({ name: '', description: '' });
        setIsFolderDialogOpen(true);
    };

    const openEditFolder = (folder: ServerFolder, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingFolder(folder);
        setFolderFormData({ name: folder.name, description: folder.description || '' });
        setIsFolderDialogOpen(true);
    };

    const handleSaveFolder = () => {
        if (!folderFormData.name.trim()) return;

        if (editingFolder) {
            updateFolder(editingFolder.id, folderFormData.name, folderFormData.description);
        } else {
            createFolder(folderFormData.name, folderFormData.description);
        }
        setIsFolderDialogOpen(false);
        setFolderFormData({ name: '', description: '' });
    };

    const handleDeleteFolder = (folderId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t('servers.confirmDeleteFolder'))) return;
        deleteFolder(folderId);
    };

    const changePage = (newPage: number) => {
        if (serverScope === 'all') {
            if (newPage >= 1 && newPage <= pagination.total_pages) {
                void fetchAllOtherServers(newPage);
            }
            return;
        }
        if (viewMode === 'folders') return;
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchServers(newPage, false);
        }
    };

    const getServerLiveStats = (server: Server) => {
        const liveData = serverLiveData[server.uuidShort];
        if (!liveData?.stats) return null;

        return {
            memory: liveData.stats.memoryUsage,
            disk: liveData.stats.diskUsage,
            cpu: liveData.stats.cpuUsage,
            status: liveData.status || server.status,
        };
    };

    const selectedSortOption = sortOptions.find((o) => o.id === selectedSort) || sortOptions[0];
    const selectedLayoutOption = layoutOptions.find((o) => o.id === selectedLayout) || layoutOptions[0];

    return (
        <div className='space-y-6 pb-12'>
            <WidgetRenderer widgets={getWidgets('dashboard-servers', 'top-of-page')} />

            <PageHeader
                title={t('servers.title')}
                description={t('servers.description')}
                icon={ServerIcon}
                actions={<WidgetRenderer widgets={getWidgets('dashboard-servers', 'after-header')} />}
            />

            <div className='fp-surface flex flex-col gap-3 rounded-xl border p-3'>
                <div className='flex flex-wrap items-center gap-2 sm:flex-nowrap'>
                    <input
                        type='text'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('servers.searchPlaceholder')}
                        className='bg-background border-border focus:ring-primary h-11 min-w-0 flex-1 basis-full rounded-xl border px-4 py-2 text-sm transition-all focus:ring-2 focus:outline-none sm:h-auto sm:basis-0'
                    />

                    <Listbox value={selectedSortOption} onChange={(option) => setSelectedSort(option.id)}>
                        <div className='relative shrink-0'>
                            <ListboxButton className='bg-background border-border focus:ring-primary relative min-h-10 cursor-pointer rounded-xl border py-2 pr-8 pl-3 text-left text-sm whitespace-nowrap focus:ring-2 focus:outline-none'>
                                <span className='flex items-center gap-2'>
                                    <Filter className='text-muted-foreground h-4 w-4 shrink-0' />
                                    <span className='hidden truncate sm:block'>{selectedSortOption.name}</span>
                                </span>
                                <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                                    <ChevronsUpDown className='text-muted-foreground h-4 w-4' />
                                </span>
                            </ListboxButton>
                            <Transition
                                as={Fragment}
                                leave='transition ease-in duration-100'
                                leaveFrom='opacity-100'
                                leaveTo='opacity-0'
                            >
                                <ListboxOptions
                                    anchor='bottom end'
                                    className='bg-popover border-border z-50 max-h-60 min-w-[160px] overflow-auto rounded-xl border py-1 text-sm [--anchor-gap:4px] focus:outline-none'
                                >
                                    {sortOptions.map((option) => (
                                        <ListboxOption
                                            key={option.id}
                                            value={option}
                                            className={({ focus }) =>
                                                cn(
                                                    'relative cursor-pointer py-2 pr-4 pl-9 transition-colors select-none',
                                                    focus ? 'bg-primary/10 text-primary' : 'text-foreground',
                                                )
                                            }
                                        >
                                            {({ selected }) => (
                                                <>
                                                    <span
                                                        className={cn(
                                                            'block truncate',
                                                            selected ? 'font-semibold' : 'font-normal',
                                                        )}
                                                    >
                                                        {option.name}
                                                    </span>
                                                    {selected && (
                                                        <span className='text-primary absolute inset-y-0 left-0 flex items-center pl-3'>
                                                            <Check className='h-4 w-4' />
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </ListboxOption>
                                    ))}
                                </ListboxOptions>
                            </Transition>
                        </div>
                    </Listbox>

                    <RadioGroup
                        value={selectedLayoutOption}
                        onChange={(option) => setSelectedLayout(option.id as 'grid' | 'list')}
                        className='shrink-0'
                    >
                        <div className='bg-background border-border flex gap-1 rounded-xl border p-1'>
                            {layoutOptions.map((option) => (
                                <RadioGroupOption
                                    key={option.id}
                                    value={option}
                                    className={({ checked }) =>
                                        cn(
                                            'flex min-h-8 min-w-9 cursor-pointer items-center justify-center rounded-lg px-2.5 py-1 transition-all',
                                            checked
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                        )
                                    }
                                >
                                    {() => (
                                        <div className='flex items-center gap-1.5'>
                                            <option.icon className='h-4 w-4' />
                                            <span className='sr-only font-medium sm:not-sr-only sm:text-xs'>
                                                {option.name}
                                            </span>
                                        </div>
                                    )}
                                </RadioGroupOption>
                            ))}
                        </div>
                    </RadioGroup>

                    <div
                        className='flex min-h-10 shrink-0 cursor-pointer items-center gap-2 px-1'
                        onClick={() => setShowOnlyRunning(!showOnlyRunning)}
                    >
                        <Switch
                            checked={showOnlyRunning}
                            onChange={setShowOnlyRunning}
                            className='group focus:ring-primary bg-muted relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none data-checked:bg-green-500'
                        >
                            <span className='inline-block h-3 w-3 translate-x-1 transform rounded-full bg-white transition-transform group-data-checked:translate-x-4' />
                        </Switch>
                        <span className='hidden text-sm font-medium whitespace-nowrap sm:block'>
                            {t('servers.runningOnly')}
                        </span>
                    </div>

                    <button
                        onClick={() =>
                            serverScope === 'all' ? void fetchAllOtherServers(pagination.current_page) : fetchServers()
                        }
                        disabled={loading}
                        className='bg-background border-border hover:bg-muted ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 sm:ml-0 sm:h-auto sm:w-auto sm:p-2'
                        title={t('servers.refresh')}
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>

                <WidgetRenderer widgets={getWidgets('dashboard-servers', 'before-server-list')} />
                {servers.length > 0 && (
                    <BulkSelectionRow
                        className='mt-1'
                        selectedCount={selectedServers.length}
                        visibleCount={filteredServers.length}
                        onSelectAll={selectAllVisible}
                        onClear={clearSelection}
                    />
                )}
                <WidgetRenderer widgets={getWidgets('dashboard-servers', 'after-server-list')} />
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-servers', 'bottom-of-page')} />

            {loading && (
                <div role='status' aria-busy='true' aria-live='polite'>
                    <span className='sr-only'>{t('servers.loading')}</span>
                    <div
                        className={cn(
                            selectedLayout === 'grid'
                                ? 'grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3'
                                : 'flex flex-col gap-4',
                        )}
                    >
                        {Array.from({ length: selectedLayout === 'grid' ? 6 : 4 }).map((_, i) => (
                            <div
                                key={i}
                                className='bg-card/40 border-border/50 overflow-hidden rounded-2xl border'
                                style={{ opacity: 1 - i * 0.1 }}
                            >
                                {selectedLayout === 'grid' && (
                                    <div className='bg-muted/30 h-28 animate-pulse sm:h-36' />
                                )}
                                <div className='space-y-3 p-4 sm:p-5'>
                                    <div className='flex items-center justify-between gap-3'>
                                        <div className='bg-muted/50 h-5 w-2/5 animate-pulse rounded-md' />
                                        <div className='bg-muted/40 h-5 w-16 animate-pulse rounded-full' />
                                    </div>
                                    <div className='bg-muted/30 h-3.5 w-3/5 animate-pulse rounded-md' />
                                    <div className='flex gap-4 pt-1'>
                                        <div className='bg-muted/25 h-3 w-20 animate-pulse rounded-md' />
                                        <div className='bg-muted/25 h-3 w-16 animate-pulse rounded-md' />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && !loading && (
                <div className='flex items-center justify-center py-24'>
                    <div className='max-w-md text-center'>
                        <TriangleAlert className='text-destructive mx-auto mb-4 h-16 w-16' />
                        <h3 className='mb-2 text-xl font-semibold'>{t('servers.errorTitle')}</h3>
                        <p className='text-muted-foreground mb-6'>{error}</p>
                        <button
                            onClick={() => fetchServers()}
                            className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-3 font-semibold transition-colors'
                        >
                            {t('servers.retry')}
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className='flex items-start justify-between gap-2 sm:items-center'>
                        <div className='flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
                            {canViewAllServers && (
                                <div
                                    role='tablist'
                                    className='fp-surface grid w-full grid-cols-2 gap-1 rounded-xl border p-1 sm:flex sm:w-auto'
                                >
                                    <button
                                        type='button'
                                        role='tab'
                                        aria-selected={serverScope === 'mine'}
                                        onClick={() => setServerScope('mine')}
                                        className={cn(
                                            'focus-visible:ring-ring/60 min-h-11 truncate rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-9 sm:px-4',
                                            serverScope === 'mine'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                        )}
                                    >
                                        {t('servers.myServers')}
                                    </button>
                                    <button
                                        type='button'
                                        role='tab'
                                        aria-selected={serverScope === 'all'}
                                        onClick={() => setServerScope('all')}
                                        className={cn(
                                            'focus-visible:ring-ring/60 min-h-11 truncate rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-9 sm:px-4',
                                            serverScope === 'all'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                        )}
                                    >
                                        {t('servers.allServersAdmin')}
                                        {serverScope === 'all' ? ` (${pagination.total_records})` : ''}
                                    </button>
                                </div>
                            )}

                            {serverScope === 'mine' && (
                                <div
                                    role='tablist'
                                    className='fp-surface grid w-full grid-cols-2 gap-1 rounded-xl border p-1 sm:flex sm:w-auto'
                                >
                                    <button
                                        type='button'
                                        role='tab'
                                        aria-selected={viewMode === 'all'}
                                        onClick={() => setViewMode('all')}
                                        className={cn(
                                            'focus-visible:ring-ring/60 min-h-11 truncate rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-9 sm:px-4',
                                            viewMode === 'all'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                        )}
                                    >
                                        {t('servers.allServers')} ({pagination.total_records})
                                    </button>
                                    <button
                                        type='button'
                                        role='tab'
                                        aria-selected={viewMode === 'folders'}
                                        onClick={() => setViewMode('folders')}
                                        className={cn(
                                            'focus-visible:ring-ring/60 min-h-11 truncate rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-9 sm:px-4',
                                            viewMode === 'folders'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                        )}
                                    >
                                        {t('servers.byFolder')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {serverScope === 'mine' && viewMode === 'folders' && (
                            <button
                                type='button'
                                onClick={openCreateFolder}
                                aria-label={t('servers.createFolder')}
                                className='focus-visible:ring-ring/60 bg-primary text-primary-foreground hover:bg-primary/90 flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 sm:min-h-0'
                            >
                                <FolderPlus className='h-4 w-4' />
                                <span className='hidden sm:inline'>{t('servers.createFolder')}</span>
                            </button>
                        )}
                    </div>

                    {serverScope === 'all' ? (
                        <div className='space-y-6'>
                            {pagination.total_pages > 1 && (
                                <div className='fp-surface-solid mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                                    <button
                                        onClick={() => changePage(pagination.current_page - 1)}
                                        disabled={!pagination.has_prev || loading}
                                        className='border-border hover:bg-muted focus-visible:ring-ring/60 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9'
                                    >
                                        <ChevronLeft className='h-5 w-5' />
                                        {t('common.previous')}
                                    </button>
                                    <span className='text-sm font-medium'>
                                        {t('servers.pagination.page', {
                                            current: String(pagination.current_page),
                                            total: String(pagination.total_pages),
                                        })}
                                    </span>
                                    <button
                                        onClick={() => changePage(pagination.current_page + 1)}
                                        disabled={!pagination.has_next || loading}
                                        className='border-border hover:bg-muted focus-visible:ring-ring/60 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9'
                                    >
                                        {t('common.next')}
                                        <ChevronRight className='h-5 w-5' />
                                    </button>
                                </div>
                            )}
                            {pagination.total_records === 0 ? (
                                <EmptyState searchQuery={searchQuery} t={t} />
                            ) : (
                                <>
                                    <div
                                        className={cn(
                                            selectedLayout === 'grid'
                                                ? 'grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3'
                                                : 'flex flex-col gap-4',
                                        )}
                                    >
                                        {filteredServers.map((server) => (
                                            <ServerCard
                                                key={server.id}
                                                server={server}
                                                layout={selectedLayout}
                                                serverUrl={`/server/${server.uuidShort}`}
                                                liveStats={getServerLiveStats(server)}
                                                isConnected={isServerConnected(server.uuidShort)}
                                                t={t}
                                                folders={[]}
                                                onAssignFolder={() => {}}
                                                onUnassignFolder={() => {}}
                                                showFavoriteToggle
                                                isFavorite={favoriteUuids.includes(server.uuid)}
                                                onToggleFavorite={() => toggleFavorite(server.uuid)}
                                                selectable
                                                selected={selectedServerIds.includes(server.id)}
                                                onToggleSelect={() => toggleServerSelection(server.id)}
                                            />
                                        ))}
                                    </div>
                                    {pagination.total_pages > 1 && (
                                        <div className='border-border mt-6 flex flex-col items-center justify-between gap-3 border-t px-1 py-6 sm:flex-row sm:px-4'>
                                            <p className='text-muted-foreground text-sm'>
                                                {t('servers.pagination.showing', {
                                                    from: String(pagination.from),
                                                    to: String(pagination.to),
                                                    total: String(pagination.total_records),
                                                })}
                                            </p>
                                            <div className='flex items-center gap-2'>
                                                <button
                                                    onClick={() => changePage(pagination.current_page - 1)}
                                                    disabled={!pagination.has_prev || loading}
                                                    aria-label={t('common.previous')}
                                                    className='border-border hover:bg-muted focus-visible:ring-ring/60 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border p-2 transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:min-w-9'
                                                >
                                                    <ChevronLeft className='h-5 w-5' />
                                                </button>
                                                <span className='px-4 py-2 text-sm font-medium'>
                                                    {t('servers.pagination.page', {
                                                        current: String(pagination.current_page),
                                                        total: String(pagination.total_pages),
                                                    })}
                                                </span>
                                                <button
                                                    onClick={() => changePage(pagination.current_page + 1)}
                                                    disabled={!pagination.has_next || loading}
                                                    aria-label={t('common.next')}
                                                    className='border-border hover:bg-muted focus-visible:ring-ring/60 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border p-2 transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:min-w-9'
                                                >
                                                    <ChevronRight className='h-5 w-5' />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <TabGroup
                            selectedIndex={viewMode === 'all' ? 0 : 1}
                            onChange={(index) => setViewMode(index === 0 ? 'all' : 'folders')}
                        >
                            <TabPanels className='mt-2'>
                                <TabPanel>
                                    {pagination.total_pages > 1 && (
                                        <div className='fp-surface-solid mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                                            <button
                                                onClick={() => changePage(pagination.current_page - 1)}
                                                disabled={!pagination.has_prev || loading}
                                                className='border-border hover:bg-muted focus-visible:ring-ring/60 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9'
                                            >
                                                <ChevronLeft className='h-4 w-4' />
                                                {t('common.previous')}
                                            </button>
                                            <span className='text-sm font-medium'>
                                                {t('servers.pagination.page', {
                                                    current: String(pagination.current_page),
                                                    total: String(pagination.total_pages),
                                                })}
                                            </span>
                                            <button
                                                onClick={() => changePage(pagination.current_page + 1)}
                                                disabled={!pagination.has_next || loading}
                                                className='border-border hover:bg-muted focus-visible:ring-ring/60 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9'
                                            >
                                                {t('common.next')}
                                                <ChevronRight className='h-4 w-4' />
                                            </button>
                                        </div>
                                    )}
                                    {pagination.total_records === 0 ? (
                                        <EmptyState searchQuery={searchQuery} t={t} />
                                    ) : (
                                        <div
                                            className={cn(
                                                selectedLayout === 'grid'
                                                    ? 'grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3'
                                                    : 'flex flex-col gap-4',
                                            )}
                                        >
                                            {filteredServers.map((server) => (
                                                <ServerCard
                                                    key={server.id}
                                                    server={server}
                                                    layout={selectedLayout}
                                                    serverUrl={`/server/${server.uuidShort}`}
                                                    liveStats={getServerLiveStats(server)}
                                                    isConnected={isServerConnected(server.uuidShort)}
                                                    t={t}
                                                    folders={folders}
                                                    onAssignFolder={(folderId) =>
                                                        assignServerToFolder(server.uuidShort, folderId)
                                                    }
                                                    onUnassignFolder={() => unassignServer(server.uuidShort)}
                                                    showFavoriteToggle
                                                    isFavorite={favoriteUuids.includes(server.uuid)}
                                                    onToggleFavorite={() => toggleFavorite(server.uuid)}
                                                    selectable
                                                    selected={selectedServerIds.includes(server.id)}
                                                    onToggleSelect={() => toggleServerSelection(server.id)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {pagination.total_pages > 1 && (
                                        <div className='border-border mt-6 flex flex-col items-center justify-between gap-3 border-t px-1 py-6 sm:flex-row sm:px-4'>
                                            <p className='text-muted-foreground text-sm'>
                                                {t('servers.pagination.showing', {
                                                    from: String(pagination.from),
                                                    to: String(pagination.to),
                                                    total: String(pagination.total_records),
                                                })}
                                            </p>
                                            <div className='flex items-center gap-2'>
                                                <button
                                                    onClick={() => changePage(pagination.current_page - 1)}
                                                    disabled={!pagination.has_prev || loading}
                                                    aria-label={t('common.previous')}
                                                    className='border-border hover:bg-muted focus-visible:ring-ring/60 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border p-2 transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:min-w-9'
                                                >
                                                    <ChevronLeft className='h-5 w-5' />
                                                </button>
                                                <span className='px-4 py-2 text-sm font-medium'>
                                                    {t('servers.pagination.page', {
                                                        current: String(pagination.current_page),
                                                        total: String(pagination.total_pages),
                                                    })}
                                                </span>
                                                <button
                                                    onClick={() => changePage(pagination.current_page + 1)}
                                                    disabled={!pagination.has_next || loading}
                                                    aria-label={t('common.next')}
                                                    className='border-border hover:bg-muted focus-visible:ring-ring/60 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border p-2 transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:min-w-9'
                                                >
                                                    <ChevronRight className='h-5 w-5' />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </TabPanel>

                                <TabPanel>
                                    <div className='space-y-4'>
                                        {pagination.total_records > 10 && (
                                            <div className='rounded-xl border border-blue-500/20 bg-blue-500/10 p-4'>
                                                <p className='text-sm text-blue-600 dark:text-blue-400'>
                                                    {t('servers.folderViewAllLoaded', {
                                                        total: String(pagination.total_records),
                                                        defaultValue: `All ${pagination.total_records} servers are loaded for folder organization.`,
                                                    })}
                                                </p>
                                            </div>
                                        )}

                                        {serversByFolder.map((folder) => (
                                            <div key={folder.id} className='space-y-4'>
                                                <div className='flex items-center justify-between'>
                                                    <div className='flex items-center gap-3'>
                                                        <Folder className='text-primary h-6 w-6' />
                                                        <div>
                                                            <h3 className='text-xl font-semibold'>{folder.name}</h3>
                                                            {folder.description && (
                                                                <p className='text-muted-foreground text-sm'>
                                                                    {folder.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className='bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium'>
                                                            {folder.servers.length}
                                                        </span>
                                                    </div>
                                                    <div className='flex items-center gap-2'>
                                                        <button
                                                            onClick={(e) => openEditFolder(folder, e)}
                                                            className='hover:bg-muted rounded-lg p-2 transition-colors'
                                                        >
                                                            <Pencil className='text-muted-foreground h-5 w-5' />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                                                            className='hover:bg-destructive/10 rounded-lg p-2 transition-colors'
                                                        >
                                                            <Trash2 className='text-destructive h-5 w-5' />
                                                        </button>
                                                    </div>
                                                </div>
                                                {folder.servers.length > 0 && (
                                                    <div
                                                        className={cn(
                                                            selectedLayout === 'grid'
                                                                ? 'grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3'
                                                                : 'flex flex-col gap-4',
                                                        )}
                                                    >
                                                        {folder.servers.map((server) => (
                                                            <ServerCard
                                                                key={server.id}
                                                                server={server}
                                                                layout={selectedLayout}
                                                                serverUrl={`/server/${server.uuidShort}`}
                                                                liveStats={getServerLiveStats(server)}
                                                                isConnected={isServerConnected(server.uuidShort)}
                                                                t={t}
                                                                folders={folders}
                                                                onAssignFolder={(folderId) =>
                                                                    assignServerToFolder(server.uuidShort, folderId)
                                                                }
                                                                onUnassignFolder={() =>
                                                                    unassignServer(server.uuidShort)
                                                                }
                                                                showFavoriteToggle
                                                                isFavorite={favoriteUuids.includes(server.uuid)}
                                                                onToggleFavorite={() => toggleFavorite(server.uuid)}
                                                                selectable
                                                                selected={selectedServerIds.includes(server.id)}
                                                                onToggleSelect={() => toggleServerSelection(server.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {folders.length === 0 && unassignedServers.length === 0 && (
                                            <EmptyState searchQuery={searchQuery} t={t} />
                                        )}

                                        {unassignedServers.length > 0 && (
                                            <div className='space-y-4'>
                                                <div className='flex items-center gap-3'>
                                                    <ServerIcon className='text-muted-foreground h-6 w-6' />
                                                    <h3 className='text-xl font-semibold'>{t('servers.unassigned')}</h3>
                                                    <span className='bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm font-medium'>
                                                        {unassignedServers.length}
                                                    </span>
                                                </div>
                                                <div
                                                    className={cn(
                                                        selectedLayout === 'grid'
                                                            ? 'grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3'
                                                            : 'flex flex-col gap-4',
                                                    )}
                                                >
                                                    {unassignedServers.map((server) => (
                                                        <ServerCard
                                                            key={server.id}
                                                            server={server}
                                                            layout={selectedLayout}
                                                            serverUrl={`/server/${server.uuidShort}`}
                                                            liveStats={getServerLiveStats(server)}
                                                            isConnected={isServerConnected(server.uuidShort)}
                                                            t={t}
                                                            folders={folders}
                                                            onAssignFolder={(folderId) =>
                                                                assignServerToFolder(server.uuidShort, folderId)
                                                            }
                                                            onUnassignFolder={() => unassignServer(server.uuidShort)}
                                                            showFavoriteToggle
                                                            isFavorite={favoriteUuids.includes(server.uuid)}
                                                            onToggleFavorite={() => toggleFavorite(server.uuid)}
                                                            selectable
                                                            selected={selectedServerIds.includes(server.id)}
                                                            onToggleSelect={() => toggleServerSelection(server.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabPanel>
                            </TabPanels>
                        </TabGroup>
                    )}
                </>
            )}

            <FolderDialog
                isOpen={isFolderDialogOpen}
                onClose={() => setIsFolderDialogOpen(false)}
                onSave={handleSaveFolder}
                editingFolder={editingFolder}
                formData={folderFormData}
                setFormData={setFolderFormData}
                t={t}
            />

            <BulkServerActions
                selected={selectedServers.map((server) => ({ uuidShort: server.uuidShort, name: server.name }))}
                onClear={clearSelection}
                onFinished={handleBulkFinished}
            />
        </div>
    );
}
