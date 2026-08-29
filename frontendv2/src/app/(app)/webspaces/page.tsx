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

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AppWindow, LayoutGrid, List, RefreshCw, TriangleAlert } from 'lucide-react';
import { Listbox } from '@headlessui/react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useWebSpacesState } from '@/hooks/useWebSpacesState';
import { WebSpaceCard, type DashboardWebSpace } from '@/components/webspace/WebSpaceCard';
import { cn } from '@/lib/utils';

interface SortOption {
    id: 'name' | 'status' | 'node';
    name: string;
}

export default function UserWebSpacesPage() {
    const { t } = useTranslation();
    const { selectedLayout, selectedSort, showOnlyRunning, setSelectedLayout, setSelectedSort, setShowOnlyRunning } =
        useWebSpacesState();

    const [spaces, setSpaces] = useState<DashboardWebSpace[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const sortOptions: SortOption[] = [
        { id: 'name', name: t('webSpaces.sort.name') },
        { id: 'status', name: t('webSpaces.sort.status') },
        { id: 'node', name: t('webSpaces.sort.node') },
    ];

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
            list.sort((a, b) => (b.state || b.status || '').localeCompare(a.state || a.status || ''));
        } else if (selectedSort === 'node') {
            list.sort((a, b) => (a.web_node_name || '').localeCompare(b.web_node_name || ''));
        }

        return list;
    }, [spaces, searchQuery, selectedSort, showOnlyRunning]);

    const selectedSortOption = sortOptions.find((o) => o.id === selectedSort) || sortOptions[0];

    return (
        <div className='space-y-6 pb-12'>
            <div>
                <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>{t('webSpaces.title')}</h1>
                <p className='text-muted-foreground mt-1 text-sm'>{t('webSpaces.description')}</p>
            </div>

            <div className='border-border/50 bg-card/50 space-y-2 rounded-2xl border p-3 backdrop-blur-xl'>
                <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('webSpaces.searchPlaceholder')}
                    className='bg-background border-border focus:ring-primary w-full rounded-xl border px-4 py-2 text-sm transition-all focus:ring-2 focus:outline-none'
                />

                <div className='flex flex-wrap items-center gap-2'>
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

                    <button
                        onClick={() => setShowOnlyRunning(!showOnlyRunning)}
                        className={cn(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            showOnlyRunning
                                ? 'border-green-500/40 bg-green-500/15 text-green-400'
                                : 'bg-background border-border hover:bg-muted text-muted-foreground',
                        )}
                    >
                        {t('webSpaces.runningOnly')}
                    </button>

                    <button
                        onClick={() => void fetchSpaces()}
                        disabled={loading}
                        className='bg-background border-border hover:bg-muted ml-auto rounded-xl border p-2 transition-colors disabled:opacity-50'
                        title={t('webSpaces.refresh')}
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {loading && (
                <div className='flex flex-col items-center justify-center gap-4 py-24'>
                    <RefreshCw className='text-primary h-10 w-10 animate-spin' />
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.loading')}</p>
                </div>
            )}

            {error && !loading && (
                <div className='flex flex-col items-center justify-center gap-4 py-24 text-center'>
                    <TriangleAlert className='text-destructive h-14 w-14' />
                    <h3 className='text-lg font-semibold'>{t('webSpaces.errorTitle')}</h3>
                    <p className='text-muted-foreground text-sm'>{error}</p>
                    <button
                        onClick={() => void fetchSpaces()}
                        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors'
                    >
                        {t('webSpaces.retry')}
                    </button>
                </div>
            )}

            {!loading && !error && (
                <>
                    {filteredSpaces.length === 0 ? (
                        <div className='border-border/50 bg-card/50 flex flex-col items-center justify-center gap-4 rounded-2xl border py-16 text-center'>
                            <div className='bg-muted/40 flex h-16 w-16 items-center justify-center rounded-2xl'>
                                <AppWindow className='text-muted-foreground h-8 w-8' />
                            </div>
                            <div>
                                <p className='font-semibold'>
                                    {searchQuery || showOnlyRunning
                                        ? t('webSpaces.noWebSpacesFound')
                                        : t('webSpaces.no_results')}
                                </p>
                                <p className='text-muted-foreground mt-1 text-sm'>
                                    {searchQuery || showOnlyRunning
                                        ? t('webSpaces.adjustFilters')
                                        : t('webSpaces.empty_help')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            <p className='text-muted-foreground text-sm'>
                                {t('webSpaces.pagination.showing', {
                                    count: String(filteredSpaces.length),
                                    total: String(spaces.length),
                                })}
                            </p>

                            {selectedLayout === 'grid' ? (
                                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                    {filteredSpaces.map((space) => (
                                        <WebSpaceCard key={space.uuid} webspace={space} layout='grid' />
                                    ))}
                                </div>
                            ) : (
                                <div className='space-y-2'>
                                    {filteredSpaces.map((space) => (
                                        <WebSpaceCard key={space.uuid} webspace={space} layout='list' />
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
