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

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { toast } from 'sonner';
import {
    LayoutTemplate,
    Plus,
    Search,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Eye,
    BookOpen,
    Box,
    Wrench,
    GitBranch,
    X,
    Loader2,
} from 'lucide-react';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
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
import { WEBPLATE_RUNTIMES, type WebPlate } from './types';

const FILTERS_KEY = 'featherpanel_admin_webplates_filters_v1';
const FILTERS_DEFAULTS = {
    searchQuery: '',
    runtime: '',
    page: 1,
    pageSize: 10,
};

export default function WebPlatesPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-webplates');
    const { filters, patchFilters, resetFilters, hydrated } = usePersistedListFilters(FILTERS_KEY, FILTERS_DEFAULTS);
    const { searchQuery, runtime, page, pageSize } = filters;

    const [loading, setLoading] = useState(true);
    const [plates, setPlates] = useState<WebPlate[]>([]);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            if (searchQuery !== debouncedSearch) {
                patchFilters({ page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearch, patchFilters]);

    const fetchPlates = useCallback(async () => {
        if (!hydrated) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/webplates', {
                params: {
                    page,
                    limit: pageSize,
                    search: debouncedSearch || undefined,
                    runtime: runtime || undefined,
                },
            });
            setPlates((data.data.webplates || []) as WebPlate[]);
            const apiPagination = data.data.pagination;
            const totalRecords = apiPagination?.total_records ?? 0;
            const perPage = apiPagination?.per_page ?? pageSize;
            setPagination({
                total: totalRecords,
                totalPages: apiPagination?.total_pages ?? (Math.ceil(totalRecords / perPage) || 0),
                hasNext: !!apiPagination?.has_next,
                hasPrev: !!apiPagination?.has_prev,
            });
        } catch (error) {
            console.error(error);
            toast.error(t('admin.webPlates.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearch, runtime, t, hydrated]);

    useEffect(() => {
        fetchPlates();
        fetchWidgets();
    }, [fetchPlates, fetchWidgets, refreshKey]);

    const handleConfirmDelete = async () => {
        if (confirmDeleteId === null) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/webplates/${confirmDeleteId}`);
            toast.success(t('admin.webPlates.messages.deleted'));
            setConfirmDeleteId(null);
            setRefreshKey((k) => k + 1);
        } catch (error) {
            console.error(error);
            let msg = t('admin.webPlates.messages.delete_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const runtimeLabel = (value: string) => {
        const key = `admin.webPlates.runtimes.${value}`;
        const translated = t(key);
        return translated === key ? value : translated;
    };

    const filtersActive = !!(searchQuery || runtime);

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-webplates', 'top-of-page')} />

            <PageHeader
                title={t('admin.webPlates.title')}
                description={t('admin.webPlates.subtitle')}
                icon={LayoutTemplate}
            />

            <WidgetRenderer widgets={getWidgets('admin-webplates', 'after-header')} />

            <div className='bg-card/50 border-border flex flex-col items-stretch gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur-md'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                    <div className='group relative w-full flex-1'>
                        <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('admin.webPlates.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                            className='h-11 w-full pl-10'
                        />
                    </div>
                    <Button onClick={() => router.push('/admin/webplates/create')} className='shrink-0'>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.webPlates.create')}
                    </Button>
                </div>
                <div className='flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Button
                            variant={runtime === '' ? 'default' : 'outline'}
                            size='sm'
                            className='h-9 text-xs'
                            onClick={() => patchFilters({ runtime: '', page: 1 })}
                        >
                            {t('admin.webPlates.runtime_all')}
                        </Button>
                        {WEBPLATE_RUNTIMES.map((r) => (
                            <Button
                                key={r}
                                variant={runtime === r ? 'default' : 'outline'}
                                size='sm'
                                className='h-9 text-xs'
                                onClick={() => patchFilters({ runtime: r, page: 1 })}
                            >
                                {runtimeLabel(r)}
                            </Button>
                        ))}
                        {filtersActive && (
                            <Button variant='ghost' size='sm' className='h-9 text-xs' onClick={() => resetFilters()}>
                                <X className='mr-2 h-3.5 w-3.5' />
                                {t('admin.webPlates.filters.clear')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {pagination.totalPages > 1 && !loading && (
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

            {loading ? (
                <TableSkeleton count={5} />
            ) : plates.length === 0 ? (
                <EmptyState
                    icon={LayoutTemplate}
                    title={t('admin.webPlates.no_results')}
                    description={t('admin.webPlates.search_placeholder')}
                    action={
                        <Button onClick={() => router.push('/admin/webplates/create')}>
                            {t('admin.webPlates.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    <WidgetRenderer widgets={getWidgets('admin-webplates', 'before-list')} />
                    {plates.map((plate) => (
                        <ResourceCard
                            key={plate.id}
                            title={plate.name}
                            subtitle={plate.author || 'system'}
                            icon={LayoutTemplate}
                            badges={[
                                {
                                    label: runtimeLabel(plate.runtime),
                                    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                },
                                ...(plate.document_root
                                    ? [
                                          {
                                              label: plate.document_root,
                                              className: 'font-mono text-xs',
                                          },
                                      ]
                                    : []),
                            ]}
                            description={
                                <div className='text-muted-foreground mt-1 line-clamp-2 text-sm'>
                                    {plate.description || t('admin.webPlates.no_description')}
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        title={t('common.view')}
                                        onClick={() => router.push(`/admin/webplates/${plate.id}/edit`)}
                                    >
                                        <Eye className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        title={t('common.edit')}
                                        onClick={() => router.push(`/admin/webplates/${plate.id}/edit`)}
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        title={t('common.delete')}
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => setConfirmDeleteId(plate.id)}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

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

            <PageCard title={t('admin.webPlates.help.cross_compatible.title')} icon={LayoutTemplate} variant='default'>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                    {t('admin.webPlates.help.cross_compatible.description')}
                </p>
            </PageCard>

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <PageCard title={t('admin.webPlates.help.what_are_webplates.title')} icon={BookOpen}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.webPlates.help.what_are_webplates.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.webPlates.help.how_to_use.title')} icon={Box}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.webPlates.help.how_to_use.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.webPlates.help.under_the_hood.title')} icon={Wrench}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.webPlates.help.under_the_hood.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.webPlates.help.sources.title')} icon={GitBranch}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.webPlates.help.sources.description')}
                    </p>
                </PageCard>
            </div>

            <AlertDialog
                open={confirmDeleteId !== null}
                onOpenChange={(open) => {
                    if (!open) setConfirmDeleteId(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.webPlates.delete_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('admin.webPlates.delete_confirm_desc')}</AlertDialogDescription>
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

            <WidgetRenderer widgets={getWidgets('admin-webplates', 'bottom-of-page')} />
        </div>
    );
}
