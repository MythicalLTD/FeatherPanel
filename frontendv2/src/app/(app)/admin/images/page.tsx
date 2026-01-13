/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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

export default function ImagesPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [images, setImages] = useState<Image[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        hasNext: false,
        hasPrev: false,
        from: 0,
        to: 0,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Sheet states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);

    // Selected content
    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [formData, setFormData] = useState({ name: '', url: '' });
    const [uploadData, setUploadData] = useState({ name: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string>('');

    // Action states
    const [processing, setProcessing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-images');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

    const fetchImages = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/images', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: debouncedSearchQuery || undefined,
                },
            });
            if (data.success) {
                setImages(data.data.images || []);
                const apiPag = data.data.pagination;
                setPagination({
                    page: apiPag.current_page,
                    pageSize: apiPag.per_page,
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
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, t]);

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
        <div className='space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500'>
            <WidgetRenderer widgets={getWidgets('admin-images', 'top-of-page')} />
            <PageHeader
                title={t('admin.images.title')}
                description={t('admin.images.subtitle')}
                icon={ImageIcon}
                actions={
                    <Button onClick={openCreate}>
                        <Upload className='w-4 h-4 mr-2' />
                        {t('admin.images.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-images', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        className='pl-10 h-11 w-full'
                        placeholder={t('admin.images.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-images', 'before-list')} />

            <div className='grid grid-cols-1 md:grid-cols-1 gap-4'>
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className='h-24 rounded-2xl bg-card/40 animate-pulse' />
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
                                    <Calendar className='w-3 h-3' />
                                    {formatDate(image.created_at)}
                                </div>
                            }
                            description={
                                <div className='flex items-center gap-1.5 mt-1'>
                                    <LinkIcon className='w-3 h-3 shrink-0' />
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
                                        <Eye className='w-4 h-4' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-9 w-9 p-0'
                                        onClick={() => openEdit(image)}
                                    >
                                        <Pencil className='w-4 h-4' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-9 w-9 p-0'
                                        onClick={() => copyToClipboard(image.url)}
                                    >
                                        <Copy className='w-4 h-4' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive'
                                        onClick={() => handleDelete(image.id)}
                                    >
                                        <Trash2 className='w-4 h-4' />
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
                                <Upload className='w-4 h-4 mr-2' />
                                {t('admin.images.create')}
                            </Button>
                        }
                    />
                )}
            </div>

            {pagination.total > pagination.pageSize && (
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
                        {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)}
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

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <PageCard icon={Upload} title={t('admin.images.help.upload.title')}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.images.help.upload.description')}
                    </p>
                </PageCard>
                <PageCard icon={ImageIcon} title={t('admin.images.help.audit.title')}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.images.help.audit.description')}
                    </p>
                </PageCard>
            </div>

            {/* Create Sheet */}
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
                                <p className='text-xs text-muted-foreground'>{t('admin.images.form.file_help')}</p>
                            </div>
                            {filePreview && (
                                <div className='space-y-2'>
                                    <Label>{t('admin.images.form.preview')}</Label>
                                    <div className='w-full h-48 rounded-xl overflow-hidden border bg-card/50'>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={filePreview} alt='Preview' className='w-full h-full object-contain' />
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

            {/* Edit Sheet */}
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

            {/* View Sheet */}
            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.images.form.view_title')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.images.form.view_description', { name: selectedImage?.name || '' })}
                        </SheetDescription>
                    </SheetHeader>
                    <div className='space-y-8'>
                        <div className='w-full h-80 rounded-2xl overflow-hidden border bg-black/20 flex items-center justify-center p-4'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={selectedImage?.url}
                                alt={selectedImage?.name}
                                className='max-w-full max-h-full object-contain shadow-2xl'
                            />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div className='space-y-1.5'>
                                <Label className='text-xs opacity-50 uppercase tracking-wider font-semibold'>
                                    {t('admin.images.form.name')}
                                </Label>
                                <p className='font-medium'>{selectedImage?.name}</p>
                            </div>
                            <div className='space-y-1.5'>
                                <Label className='text-xs opacity-50 uppercase tracking-wider font-semibold'>
                                    {t('admin.images.form.createdAt')}
                                </Label>
                                <p className='font-medium'>
                                    {selectedImage ? formatDate(selectedImage.created_at) : ''}
                                </p>
                            </div>
                            <div className='col-span-full space-y-1.5'>
                                <Label className='text-xs opacity-50 uppercase tracking-wider font-semibold'>
                                    {t('admin.images.form.url')}
                                </Label>
                                <div className='flex items-center gap-2'>
                                    <div className='flex-1 p-3 bg-card/40 rounded-xl text-sm truncate font-mono border border-white/5'>
                                        {selectedImage?.url}
                                    </div>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        className='h-11 w-11 p-0 shrink-0'
                                        onClick={() => selectedImage && copyToClipboard(selectedImage.url)}
                                    >
                                        <Copy className='w-4 h-4' />
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
