/* eslint-disable @next/next/no-img-element */
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

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    Search,
    Image as ImageIcon,
    Copy,
    Eye,
    Pencil,
    Trash2,
    Upload,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Link as LinkIcon,
} from 'lucide-react';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Input } from '@/components/featherui/Input';
import { Button } from '@/components/featherui/Button';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageCard } from '@/components/featherui/PageCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Image {
    id: number;
    name: string;
    url: string;
    created_at: string;
    updated_at: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    from: number;
    to: number;
}

const IMAGES_LIST_FILTERS_KEY = 'featherpanel_admin_images_filters_v1';
const IMAGES_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    page: 1,
    pageSize: 10,
};

export default function ImagesPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [images, setImages] = useState<Image[]>([]);
    const { filters, patchFilters, hydrated } = usePersistedListFilters(
        IMAGES_LIST_FILTERS_KEY,
        IMAGES_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, page, pageSize } = filters;
    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        hasNext: false,
        hasPrev: false,
        from: 0,
        to: 0,
    });
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);

    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [formData, setFormData] = useState({ name: '', url: '' });
    const [uploadData, setUploadData] = useState({ name: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string>('');

    const [processing, setProcessing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-images');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                patchFilters({ page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery, patchFilters]);

    const totalPages = Math.ceil(pagination.total / pageSize) || 1;

    const fetchImages = useCallback(async () => {
        if (!hydrated) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/images', {
                params: {
                    page,
                    limit: pageSize,
                    search: debouncedSearchQuery || undefined,
                },
            });
            if (data.success) {
                setImages(data.data.images || []);
                const apiPag = data.data.pagination;
                setPagination({
                    total: apiPag.total_records,
                    hasNext: apiPag.has_next,
                    hasPrev: apiPag.has_prev,
                    from: apiPag.from,
                    to: apiPag.to,
                });
            } else {
                toast.error(data.message || t('admin.images.messages.fetch_failed'));
            }
        } catch (error) {
            console.error('Error fetching images:', error);
            toast.error(t('admin.images.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearchQuery, t, hydrated]);

    useEffect(() => {
        fetchImages();
        fetchWidgets();
    }, [fetchImages, refreshKey, fetchWidgets]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setFilePreview(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const openCreate = () => {
        setUploadData({ name: '' });
        setSelectedFile(null);
        setFilePreview('');
        setCreateOpen(true);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !uploadData.name) {
            toast.error(t('admin.images.messages.fill_all'));
            return;
        }

        setProcessing(true);
        try {
            const fd = new FormData();
            fd.append('name', uploadData.name);
            fd.append('image', selectedFile);

            const { data } = await axios.post('/api/admin/images/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (data.success) {
                toast.success(t('admin.images.messages.upload_success'));
                setRefreshKey((prev) => prev + 1);
            } else {
                toast.error(data.message || t('admin.images.messages.upload_failed'));
            }
        } catch (error: unknown) {
            let message = t('admin.images.messages.upload_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                message = error.response.data.message;
            }
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const openEdit = (image: Image) => {
        setSelectedImage(image);
        setFormData({ name: image.name, url: image.url });
        setEditOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedImage) return;
        setProcessing(true);
        try {
            const { data } = await axios.patch(`/api/admin/images/${selectedImage.id}`, formData);
            if (data.success) {
                toast.success(t('admin.images.messages.update_success'));
                setRefreshKey((prev) => prev + 1);
            } else {
                toast.error(data.message || t('admin.images.messages.update_failed'));
            }
        } catch (error: unknown) {
            let message = t('admin.images.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                message = error.response.data.message;
            }
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.images.messages.delete_confirm'))) return;
        try {
            const { data } = await axios.delete(`/api/admin/images/${id}`);
            if (data.success) {
                toast.success(t('admin.images.messages.delete_success'));
                setRefreshKey((prev) => prev + 1);
            } else {
                toast.error(data.message || t('admin.images.messages.delete_failed'));
            }
        } catch {
            toast.error(t('admin.images.messages.delete_failed'));
        }
    };

    const openView = (image: Image) => {
        setSelectedImage(image);
        setFormData({ name: image.name, url: image.url });
        setViewOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className='animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500'>
            <WidgetRenderer widgets={getWidgets('admin-images', 'top-of-page')} />
            <PageHeader
                title={t('admin.images.title')}
                description={t('admin.images.subtitle')}
                icon={ImageIcon}
                actions={
                    <Button onClick={openCreate}>
                        <Upload className='mr-2 h-4 w-4' />
                        {t('admin.images.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-images', 'after-header')} />

            <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        className='h-11 w-full pl-10'
                        placeholder={t('admin.images.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-images', 'before-list')} />

            {pagination.total > pageSize && (
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
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={page === totalPages}
                        onClick={() => patchFilters({ page: page + 1 })}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            <div className='grid grid-cols-1 gap-4 md:grid-cols-1'>
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className='bg-card/40 h-24 animate-pulse rounded-2xl' />
                    ))
                ) : images.length > 0 ? (
                    images.map((image) => (
                        <ResourceCard
                            key={image.id}
                            icon={ImageIcon}
                            image={image.url}
                            title={image.name}
                            subtitle={
                                <div className='flex items-center gap-1.5'>
                                    <Calendar className='h-3 w-3' />
                                    {formatDate(image.created_at)}
                                </div>
                            }
                            description={
                                <div className='mt-1 flex items-center gap-1.5'>
                                    <LinkIcon className='h-3 w-3 shrink-0' />
                                    <span className='truncate opacity-70'>{image.url}</span>
                                </div>
                            }
                            actions={
                                <div className='flex gap-2'>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-9 w-9 p-0'
                                        onClick={() => openView(image)}
                                    >
                                        <Eye className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-9 w-9 p-0'
                                        onClick={() => openEdit(image)}
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-9 w-9 p-0'
                                        onClick={() => copyToClipboard(image.url)}
                                    >
                                        <Copy className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-9 p-0'
                                        onClick={() => handleDelete(image.id)}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        />
                    ))
                ) : (
                    <EmptyState
                        icon={ImageIcon}
                        title={t('admin.images.no_results')}
                        description={t('admin.images.search_placeholder')}
                        action={
                            <Button onClick={openCreate}>
                                <Upload className='mr-2 h-4 w-4' />
                                {t('admin.images.create')}
                            </Button>
                        }
                    />
                )}
            </div>

            {pagination.total > pageSize && (
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
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={page === totalPages}
                        onClick={() => patchFilters({ page: page + 1 })}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <PageCard icon={Upload} title={t('admin.images.help.upload.title')}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.images.help.upload.description')}
                    </p>
                </PageCard>
                <PageCard icon={ImageIcon} title={t('admin.images.help.audit.title')}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.images.help.audit.description')}
                    </p>
                </PageCard>
            </div>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.images.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.images.form.create_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleUpload} className='space-y-6'>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.images.form.name')}</Label>
                                <Input
                                    required
                                    value={uploadData.name}
                                    onChange={(e) => setUploadData({ name: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.images.form.file')}</Label>
                                <Input type='file' accept='image/*' required onChange={handleFileSelect} />
                                <p className='text-muted-foreground text-xs'>{t('admin.images.form.file_help')}</p>
                            </div>
                            {filePreview && (
                                <div className='space-y-2'>
                                    <Label>{t('admin.images.form.preview')}</Label>
                                    <div className='bg-card/50 h-48 w-full overflow-hidden rounded-xl border'>
                                        <img src={filePreview} alt='Preview' className='h-full w-full object-contain' />
                                    </div>
                                </div>
                            )}
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={processing} className='w-full sm:w-auto'>
                                {t('admin.images.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.images.form.edit_title')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.images.form.edit_description', { name: selectedImage?.name || '' })}
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleUpdate} className='space-y-6'>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.images.form.name')}</Label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.images.form.url')}</Label>
                                <Input
                                    required
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                />
                            </div>
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={processing} className='w-full sm:w-auto'>
                                {t('admin.images.form.submit_update')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.images.form.view_title')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.images.form.view_description', { name: selectedImage?.name || '' })}
                        </SheetDescription>
                    </SheetHeader>
                    <div className='space-y-8'>
                        <div className='flex h-80 w-full items-center justify-center overflow-hidden rounded-2xl border bg-black/20 p-4'>
                            <img
                                src={selectedImage?.url}
                                alt={selectedImage?.name}
                                className='max-h-full max-w-full object-contain'
                            />
                        </div>

                        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <div className='space-y-1.5'>
                                <Label className='text-xs font-semibold tracking-wider uppercase opacity-50'>
                                    {t('admin.images.form.name')}
                                </Label>
                                <p className='font-medium'>{selectedImage?.name}</p>
                            </div>
                            <div className='space-y-1.5'>
                                <Label className='text-xs font-semibold tracking-wider uppercase opacity-50'>
                                    {t('admin.images.form.createdAt')}
                                </Label>
                                <p className='font-medium'>
                                    {selectedImage ? formatDate(selectedImage.created_at) : ''}
                                </p>
                            </div>
                            <div className='col-span-full space-y-1.5'>
                                <Label className='text-xs font-semibold tracking-wider uppercase opacity-50'>
                                    {t('admin.images.form.url')}
                                </Label>
                                <div className='flex items-center gap-2'>
                                    <div className='bg-card/40 flex-1 truncate rounded-xl border border-white/5 p-3 font-mono text-sm'>
                                        {selectedImage?.url}
                                    </div>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        className='h-11 w-11 shrink-0 p-0'
                                        onClick={() => selectedImage && copyToClipboard(selectedImage.url)}
                                    >
                                        <Copy className='h-4 w-4' />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <SheetFooter>
                            <Button variant='outline' onClick={() => setViewOpen(false)} className='w-full'>
                                {t('common.close')}
                            </Button>
                        </SheetFooter>
                    </div>
                </div>
            </Sheet>
            <WidgetRenderer widgets={getWidgets('admin-images', 'bottom-of-page')} />
        </div>
    );
}
