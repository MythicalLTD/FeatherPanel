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
import axios from 'axios';
import { Plus, Search, Pencil, Trash2, Ticket as TicketIcon, Tags, Info, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Sheet, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PageCard } from '@/components/featherui/PageCard';
import { cn } from '@/lib/utils';

interface Category {
    id: number;
    name: string;
    icon: string | null;
    color: string;
    support_email: string;
    open_hours: string | null;
}

export default function TicketCategoriesPage() {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        icon: '',
        color: '#3B82F6',
        support_email: '',
        open_hours: '',
    });
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/tickets/categories');
            setCategories(response.data.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error(t('admin.tickets.categories.fetch_error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let iconUrl = formData.icon;

            if (iconFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('icon', iconFile);
                const uploadRes = await axios.post('/api/admin/tickets/categories/upload-icon', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (uploadRes.data.success) {
                    iconUrl = uploadRes.data.data.url;
                } else {
                    toast.error(t('admin.tickets.categories.upload_error'));
                    return;
                }
            }

            await axios.put('/api/admin/tickets/categories', { ...formData, icon: iconUrl });
            toast.success(t('admin.tickets.categories.create_success'));
            setCreateOpen(false);
            fetchCategories();
            resetForm();
        } catch (error) {
            console.error('Error creating category:', error);
            toast.error(t('admin.tickets.categories.create_error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory) return;
        setIsSubmitting(true);
        try {
            let iconUrl = formData.icon;

            if (iconFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('icon', iconFile);
                const uploadRes = await axios.post('/api/admin/tickets/categories/upload-icon', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (uploadRes.data.success) {
                    iconUrl = uploadRes.data.data.url;
                } else {
                    toast.error(t('admin.tickets.categories.upload_error'));
                    return;
                }
            }

            await axios.patch(`/api/admin/tickets/categories/${selectedCategory.id}`, { ...formData, icon: iconUrl });
            toast.success(t('admin.tickets.categories.update_success'));
            setEditOpen(false);
            fetchCategories();
            resetForm();
        } catch (error) {
            console.error('Error updating category:', error);
            toast.error(t('admin.tickets.categories.update_error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.tickets.categories.delete_confirm'))) return;
        try {
            await axios.delete(`/api/admin/tickets/categories/${id}`);
            toast.success(t('admin.tickets.categories.delete_success'));
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error(t('admin.tickets.categories.delete_error'));
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            icon: '',
            color: '#3B82F6',
            support_email: '',
            open_hours: '',
        });
        setSelectedCategory(null);
        setIconFile(null);
        setIconPreview(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setIconPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const openEdit = (category: Category) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            icon: category.icon || '',
            color: category.color,
            support_email: category.support_email,
            open_hours: category.open_hours || '',
        });
        setIconPreview(category.icon);
        setEditOpen(true);
    };

    const filteredCategories = categories.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.support_email.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.tickets.categories.title')}
                description={t('admin.tickets.categories.description')}
                icon={Tags}
                actions={
                    <Button
                        onClick={() => {
                            resetForm();
                            setCreateOpen(true);
                        }}
                    >
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.tickets.categories.create')}
                    </Button>
                }
            />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.tickets.categories.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={5} />
            ) : filteredCategories.length === 0 ? (
                <EmptyState
                    icon={Tags}
                    title={t('admin.tickets.categories.no_results') || t('admin.tickets.no_results')}
                    description={
                        t('admin.tickets.categories.search_placeholder') || t('admin.tickets.search_placeholder')
                    }
                    action={
                        <Button
                            onClick={() => {
                                resetForm();
                                setCreateOpen(true);
                            }}
                        >
                            {t('admin.tickets.categories.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {filteredCategories.map((category) => (
                        <ResourceCard
                            key={category.id}
                            icon={({ className }: { className?: string }) => (
                                <div
                                    className={cn(
                                        'flex items-center justify-center rounded-xl bg-primary/10 overflow-hidden relative',
                                        className,
                                    )}
                                >
                                    {category.icon ? (
                                        <Image src={category.icon} alt={category.name} fill className='object-cover' />
                                    ) : (
                                        <div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary'>
                                            <TicketIcon className='h-4 w-4' />
                                        </div>
                                    )}
                                </div>
                            )}
                            title={category.name}
                            subtitle={category.support_email}
                            style={{ borderLeft: `4px solid ${category.color}` }}
                            description={
                                <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                                    <span>
                                        {t('admin.tickets.categories.form.open_hours')}: {category.open_hours || 'N/A'}
                                    </span>
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button size='sm' variant='ghost' onClick={() => openEdit(category)}>
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => handleDelete(category.id)}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            {/* Create Sheet */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.tickets.categories.create')}</SheetTitle>
                        <SheetDescription>{t('admin.tickets.categories.description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.name')}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.icon')}</Label>
                            <Input type='file' accept='image/*' onChange={handleFileSelect} />
                            {iconPreview && (
                                <div className='mt-2'>
                                    <Label className='text-xs text-muted-foreground'>{t('common.preview')}</Label>
                                    <div className='relative h-16 w-16 rounded-lg overflow-hidden border border-border/10'>
                                        <Image
                                            src={iconPreview}
                                            alt={t('common.preview')}
                                            fill
                                            className='object-cover'
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.color')}</Label>
                            <div className='flex gap-2'>
                                <Input
                                    type='color'
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className='w-12 p-1 h-11'
                                />
                                <Input
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className='flex-1'
                                />
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.support_email')}</Label>
                            <Input
                                type='email'
                                value={formData.support_email}
                                onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.open_hours')}</Label>
                            <Input
                                value={formData.open_hours}
                                onChange={(e) => setFormData({ ...formData, open_hours: e.target.value })}
                                placeholder='Mon-Fri 9AM-5PM'
                            />
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('common.create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            {/* Edit Sheet */}
            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.tickets.categories.edit')}</SheetTitle>
                        <SheetDescription>{t('admin.tickets.categories.description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleUpdate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.name')}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.icon')}</Label>
                            <Input type='file' accept='image/*' onChange={handleFileSelect} />
                            {iconPreview && (
                                <div className='mt-2'>
                                    <Label className='text-xs text-muted-foreground'>{t('common.preview')}</Label>
                                    <div className='relative h-16 w-16 rounded-lg overflow-hidden border border-border/10'>
                                        <Image
                                            src={iconPreview}
                                            alt={t('common.preview')}
                                            fill
                                            className='object-cover'
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.color')}</Label>
                            <div className='flex gap-2'>
                                <Input
                                    type='color'
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className='w-12 p-1 h-11'
                                />
                                <Input
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className='flex-1'
                                />
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.support_email')}</Label>
                            <Input
                                type='email'
                                value={formData.support_email}
                                onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.tickets.categories.form.open_hours')}</Label>
                            <Input
                                value={formData.open_hours}
                                onChange={(e) => setFormData({ ...formData, open_hours: e.target.value })}
                                placeholder='Mon-Fri 9AM-5PM'
                            />
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('common.save')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            {/* Help Cards */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6 pt-10'>
                <PageCard title={t('admin.tickets.categories.help.managing.title')} icon={Tags}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.categories.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.tickets.categories.help.emails.title')} icon={Info}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.categories.help.emails.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.tickets.categories.help.icons.title')} icon={HelpCircle} variant='warning'>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.categories.help.icons.description')}
                    </p>
                </PageCard>
            </div>
        </div>
    );
}
