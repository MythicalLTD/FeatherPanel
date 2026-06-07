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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, FolderTree } from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Realm {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

const REALMS_LIST_FILTERS_KEY = 'featherpanel_admin_realms_filters_v1';
const REALMS_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    page: 1,
    pageSize: 10,
};

export default function RealmsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-realms');
    const [loading, setLoading] = useState(true);
    const [realms, setRealms] = useState<Realm[]>([]);
    const { filters, patchFilters, hydrated } = usePersistedListFilters(
        REALMS_LIST_FILTERS_KEY,
        REALMS_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, page, pageSize } = filters;
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const [editingRealm, setEditingRealm] = useState<Realm | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newRealm, setNewRealm] = useState({ name: '', description: '' });
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                patchFilters({ page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery, patchFilters]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const fetchRealms = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/realms', {
                    params: {
                        page,
                        limit: pageSize,
                        search: debouncedSearchQuery || undefined,
                    },
                });

                setRealms(data.data.realms || []);
                const apiPagination = data.data.pagination;
                setPagination({
                    total: apiPagination.total_records,
                    totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                });
            } catch (error) {
                console.error('Error fetching realms:', error);
                toast.error(t('admin.realms.messages.fetch_failed'));
            } finally {
                setLoading(false);
            }
        };

        fetchRealms();
        fetchWidgets();
    }, [page, pageSize, debouncedSearchQuery, refreshKey, t, fetchWidgets, hydrated]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/realms', newRealm);
            toast.success(t('admin.realms.messages.created'));
            setCreateOpen(false);
            setNewRealm({ name: '', description: '' });
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error creating realm:', error);
            let msg = t('admin.realms.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRealm) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/admin/realms/${editingRealm.id}`, {
                name: editingRealm.name,
                description: editingRealm.description,
            });
            toast.success(t('admin.realms.messages.updated'));
            setEditOpen(false);
            setEditingRealm(null);
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error updating realm:', error);
            let msg = t('admin.realms.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (realm: Realm) => {
        if (!confirm(t('admin.realms.messages.delete_confirm'))) return;
        try {
            await axios.delete(`/api/admin/realms/${realm.id}`);
            toast.success(t('admin.realms.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting realm:', error);
            toast.error(t('admin.realms.messages.delete_failed'));
        }
    };

    const handleViewSpells = (realm: Realm) => {
        router.push(`/admin/spells?realm_id=${realm.id}`);
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-realms', 'top-of-page')} />
            <PageHeader
                title={t('admin.realms.title')}
                description={t('admin.realms.subtitle')}
                icon={Sparkles}
                actions={
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.realms.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-realms', 'after-header')} />

            <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.realms.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                        className='h-11 w-full pl-10'
                    />
                </div>
            </div>

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
            ) : realms.length === 0 ? (
                <EmptyState
                    icon={Sparkles}
                    title={t('admin.realms.no_results')}
                    description={t('admin.realms.search_placeholder')}
                    action={<Button onClick={() => setCreateOpen(true)}>{t('admin.realms.create')}</Button>}
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    <WidgetRenderer widgets={getWidgets('admin-realms', 'before-list')} />
                    {realms.map((realm) => (
                        <ResourceCard
                            key={realm.id}
                            title={realm.name}
                            subtitle={new Date(realm.created_at).toLocaleDateString()}
                            icon={Sparkles}
                            description={
                                <div className='text-muted-foreground mt-1 text-sm'>
                                    {realm.description || 'No description'}
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => {
                                            setEditingRealm({ ...realm });
                                            setEditOpen(true);
                                        }}
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button size='sm' variant='ghost' onClick={() => handleViewSpells(realm)}>
                                        <Sparkles className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => handleDelete(realm)}
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

            <div className='grid grid-cols-1 gap-6 pt-6 md:grid-cols-2'>
                <PageCard title={t('admin.realms.help.what_are_realms.title')} icon={Sparkles}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.realms.help.what_are_realms.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.realms.help.organize_spells.title')} icon={FolderTree}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.realms.help.organize_spells.description')}
                    </p>
                </PageCard>
            </div>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.realms.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.realms.form.create_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.realms.form.name')}</Label>
                            <Input
                                value={newRealm.name}
                                onChange={(e) => setNewRealm({ ...newRealm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.realms.form.description')}</Label>
                            <Textarea
                                value={newRealm.description}
                                onChange={(e) => setNewRealm({ ...newRealm, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('admin.realms.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.realms.form.edit_title')}</SheetTitle>
                        <SheetDescription>{t('admin.realms.form.edit_description')}</SheetDescription>
                    </SheetHeader>
                    {editingRealm && (
                        <form onSubmit={handleUpdate} className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.realms.form.name')}</Label>
                                <Input
                                    value={editingRealm.name}
                                    onChange={(e) => setEditingRealm({ ...editingRealm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.realms.form.description')}</Label>
                                <Textarea
                                    value={editingRealm.description || ''}
                                    onChange={(e) => setEditingRealm({ ...editingRealm, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <SheetFooter>
                                <Button type='submit' loading={isSubmitting}>
                                    {t('admin.realms.form.submit_update')}
                                </Button>
                            </SheetFooter>
                        </form>
                    )}
                </div>
            </Sheet>
            <WidgetRenderer widgets={getWidgets('admin-realms', 'bottom-of-page')} />
        </div>
    );
}
