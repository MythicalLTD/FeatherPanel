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
import { RefreshCw, LayoutGrid, List, TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useVmsState } from '@/hooks/useVmsState';
import { vmsApi, VmInstance, VmPagination } from '@/lib/vms-api';
import { VmCard } from '@/components/vms/VmCard';
import { cn } from '@/lib/utils';
import { Listbox } from '@headlessui/react';
import { RadioGroup } from '@headlessui/react';

interface SortOption {
    id: 'name' | 'status' | 'created' | 'updated';
    name: string;
}

interface LayoutOption {
    id: 'grid' | 'list';
    name: string;
    icon: React.ComponentType<{ className?: string }>;
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
        from: 0,
        to: 0,
    });

    const sortOptions: SortOption[] = [
        { id: 'name', name: t('servers.sort.name') },
        { id: 'status', name: t('servers.sort.status') },
        { id: 'created', name: t('vms.sort.dateCreated') },
        { id: 'updated', name: t('vms.sort.lastUpdated') },
    ];

    const layoutOptions: LayoutOption[] = [
        { id: 'grid', name: t('servers.layout.grid'), icon: LayoutGrid },
        { id: 'list', name: t('servers.layout.list'), icon: List },
    ];

    const fetchVms = useCallback(
        async (page = 1) => {
            try {
                setLoading(true);
                setError(null);

                const response = await vmsApi.getVms(page, pagination.per_page, searchQuery);

                if (response.data) {
                    let vmList = response.data.instances;

                    // Apply sorting
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
    const selectedLayoutOption = layoutOptions.find((o) => o.id === selectedLayout) || layoutOptions[0];

    // Filter by status
    const filteredVms = showOnlyRunning ? vms.filter((vm) => vm.status === 'running') : vms;

    return (
        <div className='space-y-10 pb-12'>
            <div className='flex items-start justify-between'>
                <div>
                    <h1 className='text-2xl sm:text-4xl font-bold tracking-tight'>{t('vms.title')}</h1>
                    <p className='mt-2 text-sm sm:text-lg text-muted-foreground'>{t('vms.description')}</p>
                </div>
            </div>

            {/* Controls */}
            <div className='flex flex-col gap-3 p-3 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50'>
                <div className='flex items-center gap-2'>
                    <input
                        type='text'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('vms.searchPlaceholder')}
                        className='flex-1 min-w-0 px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm'
                    />

                    <Listbox value={selectedSortOption} onChange={(option) => setSelectedSort(option.id)}>
                        <div className='relative'>
                            <Listbox.Button className='px-3 py-2 bg-background border border-border rounded-xl hover:bg-muted transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap'>
                                {selectedSortOption.name}
                                <span className='text-xs opacity-50'>▼</span>
                            </Listbox.Button>
                            <Listbox.Options className='absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1'>
                                {sortOptions.map((option) => (
                                    <Listbox.Option
                                        key={option.id}
                                        value={option}
                                        className='px-3 py-2 hover:bg-primary/10 cursor-pointer text-sm'
                                    >
                                        {option.name}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </div>
                    </Listbox>

                    <RadioGroup value={selectedLayoutOption} onChange={(option) => setSelectedLayout(option.id)}>
                        <div className='flex items-center gap-2 shrink-0'>
                            {layoutOptions.map((option) => (
                                <RadioGroup.Option key={option.id} value={option}>
                                    {({ checked }) => (
                                        <button
                                            className={cn(
                                                'p-2 rounded-lg border transition-all',
                                                checked
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background border-border hover:bg-muted',
                                            )}
                                            title={option.name}
                                        >
                                            <option.icon className='h-4 w-4' />
                                        </button>
                                    )}
                                </RadioGroup.Option>
                            ))}
                        </div>
                    </RadioGroup>

                    <button
                        onClick={() => setShowOnlyRunning(!showOnlyRunning)}
                        className={cn(
                            'px-3 py-2 rounded-lg font-medium text-sm transition-all shrink-0',
                            showOnlyRunning
                                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                : 'bg-background border border-border hover:bg-muted',
                        )}
                        title={t('vms.runningOnly')}
                    >
                        {t('vms.runningOnly')}
                    </button>

                    <button
                        onClick={() => fetchVms(pagination.current_page)}
                        disabled={loading}
                        className='shrink-0 p-2 bg-background border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50'
                        title={t('vms.refresh')}
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className='flex items-center justify-center py-24'>
                    <div className='flex flex-col items-center gap-4'>
                        <RefreshCw className='h-12 w-12 animate-spin text-primary' />
                        <p className='text-muted-foreground'>{t('vms.loading')}</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className='flex items-center justify-center py-24'>
                    <div className='text-center max-w-md'>
                        <TriangleAlert className='h-16 w-16 text-destructive mx-auto mb-4' />
                        <h3 className='text-xl font-semibold mb-2'>{t('vms.errorTitle')}</h3>
                        <p className='text-muted-foreground mb-6'>{error}</p>
                        <button
                            onClick={() => fetchVms(1)}
                            className='px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors'
                        >
                            {t('vms.retry')}
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            {!loading && !error && (
                <>
                    {filteredVms.length === 0 ? (
                        <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-12 text-center'>
                            <p className='text-muted-foreground font-medium'>
                                {searchQuery ? t('vms.noVmsFound') : t('vms.noVms')}
                            </p>
                            <p className='text-sm text-muted-foreground/70 mt-1'>
                                {searchQuery ? t('vms.adjustFilters') : t('vms.getStarted')}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className='flex items-center justify-between gap-2'>
                                <p className='text-sm text-muted-foreground'>
                                    {t('vms.pagination.showing', {
                                        from: String(pagination.from),
                                        to: String(pagination.to),
                                        total: String(pagination.total_records),
                                    })}
                                </p>
                                {pagination.total_pages > 1 && (
                                    <div className='flex items-center gap-2'>
                                        <button
                                            onClick={() => fetchVms(Math.max(1, pagination.current_page - 1))}
                                            disabled={!pagination.has_prev || loading}
                                            className='px-3 py-1 bg-background border border-border rounded-lg hover:bg-muted disabled:opacity-50 text-sm font-medium'
                                        >
                                            {t('vms.pagination.previous')}
                                        </button>
                                        <span className='text-sm text-muted-foreground'>
                                            {t('vms.pagination.page', {
                                                current: String(pagination.current_page),
                                                total: String(pagination.total_pages),
                                            })}
                                        </span>
                                        <button
                                            onClick={() =>
                                                fetchVms(Math.min(pagination.total_pages, pagination.current_page + 1))
                                            }
                                            disabled={!pagination.has_next || loading}
                                            className='px-3 py-1 bg-background border border-border rounded-lg hover:bg-muted disabled:opacity-50 text-sm font-medium'
                                        >
                                            {t('vms.pagination.next')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {selectedLayout === 'grid' ? (
                                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                                    {filteredVms.map((vm) => (
                                        <VmCard key={vm.id} vm={vm} layout='grid' />
                                    ))}
                                </div>
                            ) : (
                                <div className='space-y-3'>
                                    {filteredVms.map((vm) => (
                                        <VmCard key={vm.id} vm={vm} layout='list' />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
