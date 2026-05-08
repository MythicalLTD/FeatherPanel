/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import { RefreshCw, LayoutGrid, List, TriangleAlert, Server, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useVmsState } from '@/hooks/useVmsState';
import { vmsApi, VmInstance, VmPagination } from '@/lib/vms-api';
import { VmCard } from '@/components/vms/VmCard';
import { cn } from '@/lib/utils';
import { Listbox } from '@headlessui/react';

interface SortOption {
    id: 'name' | 'status' | 'created' | 'updated';
    name: string;
}

export default function VmsPage() {
    const { t } = useTranslation();
    const { selectedLayout, selectedSort, showOnlyRunning, setSelectedLayout, setSelectedSort, setShowOnlyRunning } =
        useVmsState();

    const [vms, setVms] = useState<VmInstance[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<VmPagination>({
        current_page: 1,
        per_page: 25,
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
    });

    const sortOptions: SortOption[] = [
        { id: 'name', name: t('servers.sort.name') },
        { id: 'status', name: t('servers.sort.status') },
        { id: 'created', name: t('vms.sort.dateCreated') },
        { id: 'updated', name: t('vms.sort.lastUpdated') },
    ];

    const fetchVms = useCallback(
        async (page = 1) => {
            try {
                setLoading(true);
                setError(null);

                const response = await vmsApi.getVms(page, pagination.per_page, searchQuery);

                if (response.data) {
                    let vmList = response.data.instances;

                    if (selectedSort === 'name') {
                        vmList = vmList.sort((a, b) => a.hostname.localeCompare(b.hostname));
                    } else if (selectedSort === 'status') {
                        vmList = vmList.sort((a, b) => (b.status || '').localeCompare(a.status || ''));
                    } else if (selectedSort === 'created') {
                        vmList = vmList.sort(
                            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
                        );
                    } else if (selectedSort === 'updated') {
                        vmList = vmList.sort(
                            (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime(),
                        );
                    }

                    setVms(vmList);
                    setPagination(response.data.pagination);
                }
            } catch (err) {
                console.error('Failed to fetch VMs:', err);
                setError(err instanceof Error ? err.message : t('vms.errorLoading'));
            } finally {
                setLoading(false);
            }
        },
        [searchQuery, selectedSort, pagination.per_page, t],
    );

    useEffect(() => {
        fetchVms(1);
    }, [searchQuery, selectedSort, fetchVms]);

    const selectedSortOption = sortOptions.find((o) => o.id === selectedSort) || sortOptions[0];

    // Filter by status client-side
    const filteredVms = showOnlyRunning ? vms.filter((vm) => vm.status === 'running') : vms;

    // Compute from/to locally since the backend doesn't return them
    const paginationFrom = pagination.total_records === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1;
    const paginationTo = Math.min(pagination.current_page * pagination.per_page, pagination.total_records);

    return (
        <div className='space-y-6 pb-12'>
            {/* Page header */}
            <div>
                <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>{t('vms.title')}</h1>
                <p className='text-muted-foreground mt-1 text-sm'>{t('vms.description')}</p>
            </div>

            {/* Controls — two rows on mobile, one row on desktop */}
            <div className='border-border/50 bg-card/50 space-y-2 rounded-2xl border p-3 backdrop-blur-xl'>
                {/* Row 1: search */}
                <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('vms.searchPlaceholder')}
                    className='bg-background border-border focus:ring-primary w-full rounded-xl border px-4 py-2 text-sm transition-all focus:ring-2 focus:outline-none'
                />

                {/* Row 2: sort / layout / running / refresh */}
                <div className='flex flex-wrap items-center gap-2'>
                    {/* Sort */}
                    <Listbox value={selectedSortOption} onChange={(option) => setSelectedSort(option.id)}>
                        <div className='relative'>
                            <Listbox.Button className='bg-background border-border hover:bg-muted flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors'>
                                {selectedSortOption.name}
                                <span className='text-xs opacity-50'>▼</span>
                            </Listbox.Button>
                            <Listbox.Options className='bg-card border-border absolute left-0 z-50 mt-1 w-44 rounded-lg border py-1 shadow-lg'>
                                {sortOptions.map((option) => (
                                    <Listbox.Option
                                        key={option.id}
                                        value={option}
                                        className='hover:bg-primary/10 cursor-pointer px-3 py-2 text-sm'
                                    >
                                        {option.name}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </div>
                    </Listbox>

                    {/* Layout toggle */}
                    <div className='border-border flex items-center overflow-hidden rounded-xl border'>
                        <button
                            onClick={() => setSelectedLayout('grid')}
                            className={cn(
                                'p-2 transition-all',
                                selectedLayout === 'grid'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background hover:bg-muted text-muted-foreground',
                            )}
                            title={t('servers.layout.grid')}
                        >
                            <LayoutGrid className='h-4 w-4' />
                        </button>
                        <button
                            onClick={() => setSelectedLayout('list')}
                            className={cn(
                                'p-2 transition-all',
                                selectedLayout === 'list'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background hover:bg-muted text-muted-foreground',
                            )}
                            title={t('servers.layout.list')}
                        >
                            <List className='h-4 w-4' />
                        </button>
                    </div>

                    {/* Running only toggle */}
                    <button
                        onClick={() => setShowOnlyRunning(!showOnlyRunning)}
                        className={cn(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            showOnlyRunning
                                ? 'border-green-500/40 bg-green-500/15 text-green-400'
                                : 'bg-background border-border hover:bg-muted text-muted-foreground',
                        )}
                    >
                        {t('vms.runningOnly')}
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchVms(pagination.current_page)}
                        disabled={loading}
                        className='bg-background border-border hover:bg-muted ml-auto rounded-xl border p-2 transition-colors disabled:opacity-50'
                        title={t('vms.refresh')}
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className='flex flex-col items-center justify-center gap-4 py-24'>
                    <RefreshCw className='text-primary h-10 w-10 animate-spin' />
                    <p className='text-muted-foreground text-sm'>{t('vms.loading')}</p>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className='flex flex-col items-center justify-center gap-4 py-24 text-center'>
                    <TriangleAlert className='text-destructive h-14 w-14' />
                    <h3 className='text-lg font-semibold'>{t('vms.errorTitle')}</h3>
                    <p className='text-muted-foreground text-sm'>{error}</p>
                    <button
                        onClick={() => fetchVms(1)}
                        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors'
                    >
                        {t('vms.retry')}
                    </button>
                </div>
            )}

            {/* Content */}
            {!loading && !error && (
                <>
                    {filteredVms.length === 0 ? (
                        <div className='border-border/50 bg-card/50 flex flex-col items-center justify-center gap-4 rounded-2xl border py-16 text-center'>
                            <div className='bg-muted/40 flex h-16 w-16 items-center justify-center rounded-2xl'>
                                <Server className='text-muted-foreground h-8 w-8' />
                            </div>
                            <div>
                                <p className='font-semibold'>{searchQuery ? t('vms.noVmsFound') : t('vms.noVms')}</p>
                                <p className='text-muted-foreground mt-1 text-sm'>
                                    {searchQuery ? t('vms.adjustFilters') : t('vms.getStarted')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            {/* Count + pagination header */}
                            <div className='flex items-center justify-between gap-2'>
                                <p className='text-muted-foreground text-sm'>
                                    {t('vms.pagination.showing', {
                                        from: String(paginationFrom),
                                        to: String(paginationTo),
                                        total: String(pagination.total_records),
                                    })}
                                </p>

                                {pagination.total_pages > 1 && (
                                    <div className='flex items-center gap-1'>
                                        <button
                                            onClick={() => fetchVms(Math.max(1, pagination.current_page - 1))}
                                            disabled={!pagination.has_prev || loading}
                                            className='bg-background border-border hover:bg-muted rounded-lg border p-1.5 disabled:opacity-40'
                                        >
                                            <ChevronLeft className='h-4 w-4' />
                                        </button>
                                        <span className='text-muted-foreground min-w-16 text-center text-sm'>
                                            {pagination.current_page} / {pagination.total_pages}
                                        </span>
                                        <button
                                            onClick={() =>
                                                fetchVms(Math.min(pagination.total_pages, pagination.current_page + 1))
                                            }
                                            disabled={!pagination.has_next || loading}
                                            className='bg-background border-border hover:bg-muted rounded-lg border p-1.5 disabled:opacity-40'
                                        >
                                            <ChevronRight className='h-4 w-4' />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Cards */}
                            {selectedLayout === 'grid' ? (
                                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                    {filteredVms.map((vm) => (
                                        <VmCard key={vm.id} vm={vm} layout='grid' />
                                    ))}
                                </div>
                            ) : (
                                <div className='space-y-2'>
                                    {filteredVms.map((vm) => (
                                        <VmCard key={vm.id} vm={vm} layout='list' />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
