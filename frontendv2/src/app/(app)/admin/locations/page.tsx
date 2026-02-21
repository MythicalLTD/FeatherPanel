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
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import {
    Globe,
    Plus,
    Search,
    Pencil,
    Trash2,
    Server,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Flag,
    Rocket,
} from 'lucide-react';
import NextImage from 'next/image';

interface Location {
    id: number;
    name: string;
    description?: string;
    flag_code?: string | null;
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

export default function LocationsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState<Location[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [editOpen, setEditOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    const [editingLocation, setEditingLocation] = useState<Location | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', flag_code: '' });
    const [createForm, setCreateForm] = useState({ name: '', description: '', flag_code: '' });
    const [refreshKey, setRefreshKey] = useState(0);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [countryCodes, setCountryCodes] = useState<Record<string, string>>({});

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-locations');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

    useEffect(() => {
        const fetchCountryCodes = async () => {
            try {
                const { data } = await axios.get('/api/system/country-codes');
                if (data && data.success && data.data?.country_codes) {
                    const sorted = Object.entries(data.data.country_codes as Record<string, string>).sort((a, b) =>
                        a[1].localeCompare(b[1]),
                    );
                    setCountryCodes(Object.fromEntries(sorted) as Record<string, string>);
                }
            } catch (error) {
                console.error('Error fetching country codes:', error);
                toast.error(t('admin.locations.messages.country_codes_failed'));
            }
        };
        fetchCountryCodes();
    }, [t]);

    useEffect(() => {
        const fetchLocations = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/locations', {
                    params: {
                        page: pagination.page,
                        limit: pagination.pageSize,
                        search: debouncedSearchQuery || undefined,
                    },
                });

                setLocations(data.data.locations || []);
                const apiPagination = data.data.pagination;
                setPagination({
                    page: apiPagination.current_page,
                    pageSize: apiPagination.per_page,
                    total: apiPagination.total_records,
                    totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                });
            } catch (error) {
                console.error('Error fetching locations:', error);
                toast.error(t('admin.locations.messages.fetch_failed'));
            } finally {
                setLoading(false);
            }
        };

        fetchLocations();
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, refreshKey, t]);

    const handleEdit = async (location: Location) => {
        try {
            const { data } = await axios.get(`/api/admin/locations/${location.id}`);
            const loc = data.data.location;
            setEditingLocation(loc);
            setEditForm({
                name: loc.name || '',
                description: loc.description || '',
                flag_code: loc.flag_code || '__NONE__',
            });
            setEditOpen(true);
        } catch (error) {
            console.error('Error fetching location:', error);
            toast.error(t('admin.locations.messages.fetch_details_failed'));
        }
    };

    const handleDelete = (location: Location) => {
        setConfirmDeleteId(location.id);
    };

    const confirmDelete = async (location: Location) => {
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/locations/${location.id}`);
            toast.success(t('admin.locations.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
            setConfirmDeleteId(null);
        } catch (error) {
            console.error('Error deleting location:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.locations.messages.delete_failed'));
            }
        } finally {
            setDeleting(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const createData: { name: string; description?: string; flag_code?: string | null } = {
                name: createForm.name,
            };
            if (createForm.description) {
                createData.description = createForm.description;
            }
            createData.flag_code = createForm.flag_code === '__NONE__' ? null : createForm.flag_code || null;

            await axios.put('/api/admin/locations', createData);
            toast.success(t('admin.locations.messages.created'));
            setCreateOpen(false);
            setCreateForm({ name: '', description: '', flag_code: '' });
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error creating location:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.locations.messages.create_failed'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLocation) return;
        setIsSubmitting(true);
        try {
            const patchData: { name: string; description?: string; flag_code?: string | null } = {
                name: editForm.name,
            };
            if (editForm.description !== undefined) {
                patchData.description = editForm.description || undefined;
            }
            patchData.flag_code = editForm.flag_code === '__NONE__' ? null : editForm.flag_code || null;

            await axios.patch(`/api/admin/locations/${editingLocation.id}`, patchData);
            toast.success(t('admin.locations.messages.updated'));
            setEditOpen(false);
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error updating location:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.locations.messages.update_failed'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewNodes = (location: Location) => {
        router.push(`/admin/nodes?location_id=${location.id}`);
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-locations', 'top-of-page')} />

            <PageHeader
                title={t('admin.locations.title')}
                description={t('admin.locations.subtitle')}
                icon={Globe}
                actions={
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.locations.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-locations', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.locations.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-locations', 'before-list')} />

            {pagination.totalPages > 1 && !loading && (
                <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50 mb-4'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {loading ? (
                <TableSkeleton count={5} />
            ) : locations.length === 0 ? (
                <EmptyState
                    icon={Globe}
                    title={t('admin.locations.no_results')}
                    description={t('admin.locations.create_description')}
                    action={
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.locations.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {locations.map((location) => (
                        <ResourceCard
                            key={location.id}
                            title={location.name}
                            subtitle={new Date(location.created_at).toLocaleDateString()}
                            icon={Globe}
                            description={
                                <div className='flex items-center gap-2 text-sm text-muted-foreground mt-1'>
                                    {location.flag_code && (
                                        <NextImage
                                            src={`https://flagcdn.com/16x12/${location.flag_code}.png`}
                                            alt={location.flag_code}
                                            width={16}
                                            height={12}
                                            className='rounded-sm'
                                            unoptimized
                                        />
                                    )}
                                    <span>{location.description || t('common.nA')}</span>
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => handleEdit(location)}
                                        title={t('admin.locations.actions.edit')}
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => handleViewNodes(location)}
                                        title={t('admin.locations.actions.view_nodes')}
                                    >
                                        <Server className='h-4 w-4' />
                                    </Button>
                                    {confirmDeleteId === location.id ? (
                                        <>
                                            <Button
                                                size='sm'
                                                variant='destructive'
                                                onClick={() => confirmDelete(location)}
                                                loading={deleting}
                                                title={t('admin.locations.actions.confirm_delete')}
                                            >
                                                {t('common.confirm')}
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                onClick={() => setConfirmDeleteId(null)}
                                                disabled={deleting}
                                                title={t('admin.locations.actions.cancel_delete')}
                                            >
                                                {t('common.cancel')}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(location)}
                                            title={t('admin.locations.actions.delete')}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                    ))}
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

            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <PageCard title={t('admin.locations.help.what.title')} icon={MapPin}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.locations.help.what.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.locations.help.examples.title')} icon={Flag}>
                    <div className='text-sm text-muted-foreground leading-relaxed space-y-2'>
                        <ul className='list-disc list-inside space-y-1'>
                            <li>
                                <b>{t('admin.locations.help.examples.usa')}</b>:{' '}
                                {t('admin.locations.help.examples.usa_desc')}
                            </li>
                            <li>
                                <b>{t('admin.locations.help.examples.romania')}</b>:{' '}
                                {t('admin.locations.help.examples.romania_desc')}
                            </li>
                        </ul>
                        <p>{t('admin.locations.help.examples.naming')}</p>
                    </div>
                </PageCard>
                <PageCard title={t('admin.locations.help.getting_started.title')} icon={Rocket}>
                    <div className='text-sm text-muted-foreground leading-relaxed'>
                        <ol className='list-decimal list-inside space-y-1'>
                            <li>{t('admin.locations.help.getting_started.step1')}</li>
                            <li>{t('admin.locations.help.getting_started.step2')}</li>
                            <li>{t('admin.locations.help.getting_started.step3')}</li>
                        </ol>
                    </div>
                </PageCard>
            </div>

            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t('admin.locations.form.edit_title')}</SheetTitle>
                        <SheetDescription>
                            {editingLocation
                                ? t('admin.locations.form.edit_description', { name: editingLocation.name })
                                : ''}
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleUpdate} className='space-y-4 mt-6'>
                        <div className='space-y-2'>
                            <Label htmlFor='edit-name'>{t('admin.locations.form.name')} *</Label>
                            <Input
                                id='edit-name'
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='edit-description'>{t('admin.locations.form.description')}</Label>
                            <Input
                                id='edit-description'
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='edit-flag'>{t('admin.locations.form.flag')}</Label>
                            <Select
                                id='edit-flag'
                                value={editForm.flag_code}
                                onChange={(e) => setEditForm({ ...editForm, flag_code: e.target.value })}
                            >
                                <option value='__NONE__'>{t('admin.locations.form.flag_none')}</option>
                                {Object.entries(countryCodes).map(([code, name]) => (
                                    <option key={code} value={code}>
                                        {name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <SheetFooter>
                            <Button type='button' variant='outline' onClick={() => setEditOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type='submit' loading={isSubmitting}>
                                {t('common.saveChanges')}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t('admin.locations.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.locations.form.create_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='space-y-4 mt-6'>
                        <div className='space-y-2'>
                            <Label htmlFor='create-name'>{t('admin.locations.form.name')} *</Label>
                            <Input
                                id='create-name'
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='create-description'>{t('admin.locations.form.description')}</Label>
                            <Input
                                id='create-description'
                                value={createForm.description}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='create-flag'>{t('admin.locations.form.flag')}</Label>
                            <Select
                                id='create-flag'
                                value={createForm.flag_code}
                                onChange={(e) => setCreateForm({ ...createForm, flag_code: e.target.value })}
                            >
                                <option value='__NONE__'>{t('admin.locations.form.flag_none')}</option>
                                {Object.entries(countryCodes).map(([code, name]) => (
                                    <option key={code} value={code}>
                                        {name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <SheetFooter>
                            <Button type='button' variant='outline' onClick={() => setCreateOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type='submit' loading={isSubmitting}>
                                {t('common.create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-locations', 'bottom-of-page')} />
        </div>
    );
}
