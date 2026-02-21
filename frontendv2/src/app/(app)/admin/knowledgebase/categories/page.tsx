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

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import axios from 'axios';
import {
    BookOpen,
    Plus,
    Pencil,
    Trash2,
    Search,
    Eye,
    FileText,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Info,
    Layout,
    Shield,
    Image as ImageIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Category {
    id: number;
    name: string;
    slug: string;
    icon: string;
    description?: string;
    position: number;
    created_at: string;
    updated_at: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    totalPages: number;
}

export default function KnowledgeBaseCategoriesPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-knowledgebase-categories');
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        hasNext: false,
        hasPrev: false,
        totalPages: 1,
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    const [formLoading, setFormLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        position: 0,
    });

    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setForm({
            name: '',
            description: '',
            position: 0,
        });
        setIconFile(null);
        setIconPreview(null);
        setSelectedCategory(null);
    };

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/knowledgebase/categories', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: searchQuery || undefined,
                },
            });

            if (data?.success) {
                setCategories(data.data.categories || []);
                const apiPagination = data.data.pagination;
                setPagination({
                    page: apiPagination.current_page,
                    pageSize: apiPagination.per_page,
                    total: apiPagination.total_records,
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                    totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                });
            } else {
                toast.error(t('admin.knowledgebase.categories.messages.fetch_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.categories.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, searchQuery, t]);

    useEffect(() => {
        fetchWidgets();
        fetchCategories();
    }, [fetchWidgets, fetchCategories]);

    const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setIconPreview(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadIcon = async (file: File) => {
        const formData = new FormData();
        formData.append('icon', file);
        try {
            const { data } = await axios.post('/api/admin/knowledgebase/upload-icon', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (data?.success) return data.data.url;
            throw new Error(data?.message || t('admin.knowledgebase.categories.messages.upload_failed'));
        } catch {
            toast.error(t('admin.knowledgebase.categories.messages.upload_failed'));
            return null;
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!iconFile) {
            toast.error(t('admin.knowledgebase.categories.messages.upload_failed'));
            return;
        }

        setFormLoading(true);
        const iconUrl = await uploadIcon(iconFile);
        if (!iconUrl) {
            setFormLoading(false);
            return;
        }

        try {
            const { data } = await axios.put('/api/admin/knowledgebase/categories', {
                ...form,
                icon: iconUrl,
                slug: form.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
            });

            if (data?.success) {
                toast.success(t('admin.knowledgebase.categories.messages.created'));
                setCreateOpen(false);
                setForm({ name: '', description: '', position: 0 });
                setIconFile(null);
                setIconPreview(null);
                fetchCategories();
            } else {
                toast.error(data?.message || t('admin.knowledgebase.categories.messages.create_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.categories.messages.create_failed'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory) return;

        setFormLoading(true);
        let iconUrl = selectedCategory.icon;
        if (iconFile) {
            const uploadedUrl = await uploadIcon(iconFile);
            if (!uploadedUrl) {
                setFormLoading(false);
                return;
            }
            iconUrl = uploadedUrl;
        }

        try {
            const { data } = await axios.patch(`/api/admin/knowledgebase/categories/${selectedCategory.id}`, {
                ...form,
                icon: iconUrl,
            });

            if (data?.success) {
                toast.success(t('admin.knowledgebase.categories.messages.updated'));
                setEditOpen(false);
                fetchCategories();
            } else {
                toast.error(data?.message || t('admin.knowledgebase.categories.messages.update_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.categories.messages.update_failed'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (category: Category) => {
        if (!confirm(t('admin.knowledgebase.categories.messages.delete_confirm', { name: category.name }))) return;

        try {
            const { data } = await axios.delete(`/api/admin/knowledgebase/categories/${category.id}`);
            if (data?.success) {
                toast.success(t('admin.knowledgebase.categories.messages.deleted'));
                fetchCategories();
            } else {
                toast.error(data?.message || t('admin.knowledgebase.categories.messages.delete_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.categories.messages.delete_failed'));
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-categories', 'top-of-page')} />
            <PageHeader
                title={t('admin.knowledgebase.categories.title')}
                description={t('admin.knowledgebase.categories.subtitle')}
                icon={BookOpen}
                actions={
                    <Button
                        onClick={() => {
                            resetForm();
                            setCreateOpen(true);
                        }}
                    >
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.knowledgebase.categories.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-categories', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.knowledgebase.categories.search_placeholder')}
                        className='pl-10 h-11'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-categories', 'before-list')} />

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
            ) : categories.length === 0 ? (
                <EmptyState
                    title={t('admin.knowledgebase.categories.no_results')}
                    description={t('admin.knowledgebase.categories.search_placeholder')}
                    icon={AlertCircle}
                    action={
                        <Button
                            variant='outline'
                            onClick={() => {
                                resetForm();
                                setCreateOpen(true);
                            }}
                        >
                            {t('admin.knowledgebase.categories.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {categories.map((category) => {
                        const IconComponent = ({ className }: { className?: string }) => (
                            <div
                                className={`flex items-center justify-center rounded-xl bg-primary/10 overflow-hidden ${className}`}
                            >
                                {category.icon ? (
                                    <Image
                                        src={category.icon}
                                        alt={category.name}
                                        width={48}
                                        height={48}
                                        className='h-full w-full object-cover'
                                        unoptimized
                                    />
                                ) : (
                                    <BookOpen className='h-1/2 w-1/2 text-primary' />
                                )}
                            </div>
                        );

                        const badges: ResourceBadge[] = [
                            {
                                label: `${t('admin.knowledgebase.categories.form.position')}: ${category.position}`,
                                className: 'bg-primary/10 text-primary border-primary/20',
                            },
                        ];

                        return (
                            <ResourceCard
                                key={category.id}
                                icon={IconComponent}
                                title={category.name}
                                subtitle={category.slug}
                                description={category.description}
                                badges={badges}
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            title={t('admin.knowledgebase.categories.view_articles')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/admin/knowledgebase/categories/${category.id}/articles`);
                                            }}
                                        >
                                            <FileText className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCategory(category);
                                                setForm({
                                                    name: category.name,
                                                    description: category.description || '',
                                                    position: category.position,
                                                });
                                                setIconPreview(category.icon);
                                                setEditOpen(true);
                                            }}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCategory(category);
                                                setViewOpen(true);
                                            }}
                                        >
                                            <Eye className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(category);
                                            }}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                                onClick={() => router.push(`/admin/knowledgebase/categories/${category.id}/articles`)}
                            />
                        );
                    })}
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
                    <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium'>
                            {pagination.page} / {pagination.totalPages}
                        </span>
                    </div>
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

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10'>
                <PageCard title={t('admin.knowledgebase.help.managing.title')} icon={Layout}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.knowledgebase.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.knowledgebase.help.content.title')} icon={Info}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.knowledgebase.help.content.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.knowledgebase.help.attachments.title')} icon={Shield} variant='danger'>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.knowledgebase.help.attachments.description')}
                    </p>
                </PageCard>
            </div>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='p-6 h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.knowledgebase.categories.form.create_title')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.knowledgebase.categories.form.create_description')}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleCreate} className='space-y-4 mt-6 flex-1'>
                        <div className='space-y-2'>
                            <Label htmlFor='create-name'>{t('admin.knowledgebase.categories.form.name')}</Label>
                            <Input
                                id='create-name'
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-icon'>{t('admin.knowledgebase.categories.form.icon')}</Label>
                            <div className='flex items-center gap-4'>
                                <div className='h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-border/50'>
                                    {iconPreview ? (
                                        <Image
                                            src={iconPreview}
                                            alt='Preview'
                                            width={64}
                                            height={64}
                                            className='h-full w-full object-cover'
                                            unoptimized
                                        />
                                    ) : (
                                        <ImageIcon className='h-6 w-6 text-muted-foreground' />
                                    )}
                                </div>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {t('admin.knowledgebase.edit.attachments.upload')}
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type='file'
                                    className='hidden'
                                    accept='image/*'
                                    onChange={handleIconSelect}
                                />
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-description'>
                                {t('admin.knowledgebase.categories.form.description')}
                            </Label>
                            <Input
                                id='create-description'
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-position'>{t('admin.knowledgebase.categories.form.position')}</Label>
                            <Input
                                id='create-position'
                                type='number'
                                value={form.position}
                                onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) })}
                            />
                        </div>

                        <SheetFooter className='pt-6'>
                            <Button type='button' variant='outline' onClick={() => setCreateOpen(false)}>
                                {t('common.close')}
                            </Button>
                            <Button type='submit' loading={formLoading}>
                                {t('admin.knowledgebase.categories.create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='p-6 h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.knowledgebase.categories.form.edit_title')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.knowledgebase.categories.form.edit_description', {
                                name: selectedCategory?.name ?? '',
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleEdit} className='space-y-4 mt-6 flex-1'>
                        <div className='space-y-2'>
                            <Label htmlFor='edit-name'>{t('admin.knowledgebase.categories.form.name')}</Label>
                            <Input
                                id='edit-name'
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='edit-icon'>{t('admin.knowledgebase.categories.form.icon')}</Label>
                            <div className='flex items-center gap-4'>
                                <div className='h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-border/50'>
                                    {iconPreview ? (
                                        <Image
                                            src={iconPreview}
                                            alt='Preview'
                                            width={64}
                                            height={64}
                                            className='h-full w-full object-cover'
                                            unoptimized
                                        />
                                    ) : (
                                        <ImageIcon className='h-6 w-6 text-muted-foreground' />
                                    )}
                                </div>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {t('admin.knowledgebase.edit.attachments.upload')}
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type='file'
                                    className='hidden'
                                    accept='image/*'
                                    onChange={handleIconSelect}
                                />
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='edit-description'>
                                {t('admin.knowledgebase.categories.form.description')}
                            </Label>
                            <Input
                                id='edit-description'
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='edit-position'>{t('admin.knowledgebase.categories.form.position')}</Label>
                            <Input
                                id='edit-position'
                                type='number'
                                value={form.position}
                                onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) })}
                            />
                        </div>

                        <SheetFooter className='pt-6'>
                            <Button type='button' variant='outline' onClick={() => setEditOpen(false)}>
                                {t('common.close')}
                            </Button>
                            <Button type='submit' loading={formLoading}>
                                {t('admin.knowledgebase.form.save')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='p-6 h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{selectedCategory?.name}</SheetTitle>
                        <SheetDescription>{selectedCategory?.slug}</SheetDescription>
                    </SheetHeader>

                    <div className='mt-8 space-y-6 flex-1'>
                        <div className='flex justify-center'>
                            <div className='h-32 w-32 rounded-3xl bg-primary/5 flex items-center justify-center overflow-hidden border border-border/50'>
                                {selectedCategory?.icon ? (
                                    <Image
                                        src={selectedCategory?.icon}
                                        alt={selectedCategory?.name}
                                        width={128}
                                        height={128}
                                        className='h-full w-full object-cover'
                                        unoptimized
                                    />
                                ) : (
                                    <BookOpen className='h-1/2 w-1/2 text-primary/40' />
                                )}
                            </div>
                        </div>

                        <div className='grid grid-cols-2 gap-4'>
                            <div className='p-4 rounded-2xl bg-muted/50'>
                                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
                                    {t('admin.knowledgebase.categories.form.position')}
                                </p>
                                <p className='text-lg font-bold'>{selectedCategory?.position}</p>
                            </div>
                            <div className='p-4 rounded-2xl bg-muted/50'>
                                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
                                    {t('admin.roles.labels.created')}
                                </p>
                                <p className='text-sm font-medium'>
                                    {selectedCategory?.created_at
                                        ? new Date(selectedCategory.created_at).toLocaleDateString()
                                        : '-'}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                                {t('admin.knowledgebase.categories.form.description')}
                            </p>
                            <p className='text-sm text-muted-foreground bg-muted/30 p-4 rounded-2xl leading-relaxed'>
                                {selectedCategory?.description || t('admin.knowledgebase.categories.no_results')}
                            </p>
                        </div>
                    </div>

                    <SheetFooter className='pt-6'>
                        <Button variant='outline' onClick={() => setViewOpen(false)} className='w-full'>
                            {t('common.close')}
                        </Button>
                    </SheetFooter>
                </div>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-categories', 'bottom-of-page')} />
        </div>
    );
}
