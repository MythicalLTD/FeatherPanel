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

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
    LayoutGrid,
    List,
    Plus,
    RefreshCw,
    TriangleAlert,
    Filter,
    Check,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {
    Listbox,
    ListboxButton,
    ListboxOptions,
    ListboxOption,
    RadioGroup,
    RadioGroupOption,
    Switch,
    Transition,
} from '@headlessui/react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useWebSpacesState } from '@/hooks/useWebSpacesState';
import { useFavoriteWebSpaceUuids } from '@/hooks/useFavoriteWebSpaceUuids';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { WebSpaceCard, type DashboardWebSpace } from '@/components/webspace/WebSpaceCard';
import { WebSpaceEmptyState } from '@/components/webspace/WebSpaceEmptyState';
import { cn } from '@/lib/utils';
import { Button } from '@/components/featherui/Button';
import { getWebSpaceRouteId } from '@/lib/webspace-switch';
import { displayWebSpaceStatus } from '@/lib/webspace-utils';

const PER_PAGE = 12;

interface SortOption {
    id: 'name' | 'status' | 'node';
    name: string;
}

export default function WebSpacesDashboardPage() {
    const { t } = useTranslation();
    const { selectedLayout, selectedSort, showOnlyRunning, setSelectedLayout, setSelectedSort, setShowOnlyRunning } =
        useWebSpacesState();
    const { favoriteUuids, toggleFavorite } = useFavoriteWebSpaceUuids();
    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-webspaces');

    const [spaces, setSpaces] = useState<DashboardWebSpace[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    const sortOptions: SortOption[] = [
        { id: 'name', name: t('webSpaces.sort.name') },
        { id: 'status', name: t('webSpaces.sort.status') },
        { id: 'node', name: t('webSpaces.sort.node') },
    ];

    const layoutOptions = [
        { id: 'grid', name: t('servers.layout.grid'), icon: LayoutGrid },
        { id: 'list', name: t('servers.layout.list'), icon: List },
    ];

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchSpaces = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const { data } = await axios.get('/api/user/webspaces');
            setSpaces((data.data?.webspaces || []) as DashboardWebSpace[]);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : t('webSpaces.errorLoading'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchSpaces();
    }, [fetchSpaces]);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds([]);
    }, [searchQuery, selectedSort, showOnlyRunning]);

    const filteredSpaces = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = [...spaces];

        if (showOnlyRunning) {
            list = list.filter((s) => s.state === 'running' && s.status !== 'suspended' && s.suspended !== 1);
        }

        if (q) {
            list = list.filter((s) => {
                const domains = Array.isArray(s.domains) ? s.domains.join(' ') : '';
                const haystack = [s.name, s.web_node_name, s.webplate_name, domains, s.uuidShort, s.uuid]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(q);
            });
        }

        if (selectedSort === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (selectedSort === 'status') {
            list.sort((a, b) => displayWebSpaceStatus(b).localeCompare(displayWebSpaceStatus(a)));
        } else if (selectedSort === 'node') {
            list.sort((a, b) => (a.web_node_name || '').localeCompare(b.web_node_name || ''));
        }

        return list;
    }, [spaces, searchQuery, selectedSort, showOnlyRunning]);

    const totalPages = Math.max(1, Math.ceil(filteredSpaces.length / PER_PAGE));
    const paginatedSpaces = filteredSpaces.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    const from = filteredSpaces.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
    const to = Math.min(currentPage * PER_PAGE, filteredSpaces.length);

    const selectedSortOption = sortOptions.find((o) => o.id === selectedSort) || sortOptions[0];
    const selectedLayoutOption = layoutOptions.find((o) => o.id === selectedLayout) || layoutOptions[0];

    const toggleSelection = (uuid: string) => {
        setSelectedIds((prev) => (prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid]));
    };

    const selectAllVisible = () => {
        setSelectedIds(paginatedSpaces.map((s) => s.uuid));
    };

    const clearSelection = () => setSelectedIds([]);

    const handleBulkPowerAction = async (action: 'start' | 'stop' | 'restart') => {
        const selected = filteredSpaces.filter((s) => selectedIds.includes(s.uuid));
        if (selected.length === 0) return;

        setBulkActionLoading(true);
        try {
            const results = await Promise.all(
                selected.map((space) =>
                    axios
                        .post(`/api/user/webspaces/${getWebSpaceRouteId(space)}/power`, { action })
                        .then(() => true)
                        .catch(() => false),
                ),
            );
            if (results.every(Boolean)) {
                clearSelection();
            }
            void fetchSpaces();
        } finally {
            setBulkActionLoading(false);
        }
    };

    return (
        <div className='space-y-10 pb-12'>
            <WidgetRenderer widgets={getWidgets('dashboard-webspaces', 'top-of-page')} />

            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight sm:text-4xl'>{t('webSpaces.title')}</h1>
                    <p className='text-muted-foreground mt-2 text-sm sm:text-lg'>{t('webSpaces.description')}</p>
                </div>
                <Button asChild>
                    <Link href='/dashboard/webspaces/create'>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('webSpaces.create.cta')}
                    </Link>
                </Button>
            </div>

            <WidgetRenderer widgets={getWidgets('dashboard-webspaces', 'after-header')} />

            <div className='bg-card/50 border-border/50 flex flex-col gap-3 rounded-2xl border p-3 backdrop-blur-xl'>
                <div className='flex items-center gap-2'>
                    <input
                        type='text'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('webSpaces.searchPlaceholder')}
                        className='bg-background border-border focus:ring-primary min-w-0 flex-1 rounded-xl border px-4 py-2 text-sm transition-all focus:ring-2 focus:outline-none'
                    />

                    <Listbox value={selectedSortOption} onChange={(option) => setSelectedSort(option.id)}>
                        <div className='relative shrink-0'>
                            <ListboxButton className='bg-background border-border focus:ring-primary relative cursor-pointer rounded-xl border py-2 pr-8 pl-3 text-left text-sm whitespace-nowrap focus:ring-2 focus:outline-none'>
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
                                            'flex cursor-pointer items-center justify-center rounded-lg px-2.5 py-1 transition-all',
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
                        className='flex shrink-0 cursor-pointer items-center gap-2'
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
                            {t('webSpaces.runningOnly')}
                        </span>
                    </div>

                    <button
                        onClick={() => void fetchSpaces()}
                        disabled={loading}
                        className='bg-background border-border hover:bg-muted shrink-0 rounded-xl border p-2 transition-colors disabled:opacity-50'
                        title={t('webSpaces.refresh')}
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>

                {filteredSpaces.length > 0 && (
                    <div className='border-border/50 flex flex-wrap items-center justify-between gap-3 border-t pt-3'>
                        <div className='flex flex-wrap items-center gap-2 text-sm'>
                            <button type='button' onClick={selectAllVisible} className='text-primary hover:underline'>
                                {t('servers.bulk.selectAllPage')}
                            </button>
                            {selectedIds.length > 0 && (
                                <>
                                    <span className='text-muted-foreground'>
                                        {t('servers.bulk.selectedCount', { count: String(selectedIds.length) })}
                                    </span>
                                    <button
                                        type='button'
                                        onClick={clearSelection}
                                        className='text-muted-foreground hover:underline'
                                    >
                                        {t('servers.bulk.clearSelection')}
                                    </button>
                                </>
                            )}
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            <button
                                type='button'
                                onClick={() => handleBulkPowerAction('start')}
                                disabled={selectedIds.length === 0 || bulkActionLoading}
                                className='border-border bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                            >
                                {t('servers.start')}
                            </button>
                            <button
                                type='button'
                                onClick={() => handleBulkPowerAction('stop')}
                                disabled={selectedIds.length === 0 || bulkActionLoading}
                                className='border-border bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                            >
                                {t('servers.stop')}
                            </button>
                            <button
                                type='button'
                                onClick={() => handleBulkPowerAction('restart')}
                                disabled={selectedIds.length === 0 || bulkActionLoading}
                                className='border-border bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                            >
                                {t('servers.restart')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <WidgetRenderer widgets={getWidgets('dashboard-webspaces', 'after-toolbar')} />

            {loading && (
                <div className='flex items-center justify-center py-24'>
                    <div className='flex flex-col items-center gap-4'>
                        <RefreshCw className='text-primary h-12 w-12 animate-spin' />
                        <p className='text-muted-foreground'>{t('webSpaces.loading')}</p>
                    </div>
                </div>
            )}

            {error && !loading && (
                <div className='flex items-center justify-center py-24'>
                    <div className='max-w-md text-center'>
                        <TriangleAlert className='text-destructive mx-auto mb-4 h-16 w-16' />
                        <h3 className='mb-2 text-xl font-semibold'>{t('webSpaces.errorTitle')}</h3>
                        <p className='text-muted-foreground mb-6'>{error}</p>
                        <button
                            onClick={() => void fetchSpaces()}
                            className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-3 font-semibold transition-colors'
                        >
                            {t('webSpaces.retry')}
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className='bg-card/50 border-border/50 inline-flex gap-1 rounded-xl border p-1 backdrop-blur-xl'>
                        <span className='bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold'>
                            {t('webSpaces.allWebSpaces')} ({filteredSpaces.length})
                        </span>
                    </div>

                    {filteredSpaces.length === 0 ? (
                        <WebSpaceEmptyState searchQuery={searchQuery} t={t} />
                    ) : (
                        <>
                            {totalPages > 1 && (
                                <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        className='border-border hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                                    >
                                        <ChevronLeft className='h-5 w-5' />
                                        {t('common.previous')}
                                    </button>
                                    <span className='text-sm font-medium'>
                                        {t('servers.pagination.page', {
                                            current: String(currentPage),
                                            total: String(totalPages),
                                        })}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                        className='border-border hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                                    >
                                        {t('common.next')}
                                        <ChevronRight className='h-5 w-5' />
                                    </button>
                                </div>
                            )}

                            <div
                                className={cn(
                                    selectedLayout === 'grid'
                                        ? 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'
                                        : 'flex flex-col gap-4',
                                )}
                            >
                                {paginatedSpaces.map((space) => (
                                    <WebSpaceCard
                                        key={space.uuid}
                                        webspace={space}
                                        layout={selectedLayout}
                                        webspaceUrl={`/webspace/${getWebSpaceRouteId(space)}`}
                                        t={t}
                                        showFavoriteToggle
                                        isFavorite={favoriteUuids.includes(space.uuid)}
                                        onToggleFavorite={() => toggleFavorite(space.uuid)}
                                        selectable
                                        selected={selectedIds.includes(space.uuid)}
                                        onToggleSelect={() => toggleSelection(space.uuid)}
                                    />
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className='border-border mt-6 flex items-center justify-between border-t px-4 py-6'>
                                    <p className='text-muted-foreground text-sm'>
                                        {t('servers.pagination.showing', {
                                            from: String(from),
                                            to: String(to),
                                            total: String(filteredSpaces.length),
                                        })}
                                    </p>
                                    <div className='flex items-center gap-2'>
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage <= 1}
                                            className='border-border hover:bg-muted rounded-lg border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                                        >
                                            <ChevronLeft className='h-5 w-5' />
                                        </button>
                                        <span className='px-4 py-2 text-sm font-medium'>
                                            {t('servers.pagination.page', {
                                                current: String(currentPage),
                                                total: String(totalPages),
                                            })}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage >= totalPages}
                                            className='border-border hover:bg-muted rounded-lg border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                                        >
                                            <ChevronRight className='h-5 w-5' />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            <WidgetRenderer widgets={getWidgets('dashboard-webspaces', 'bottom-of-page')} />
        </div>
    );
}
