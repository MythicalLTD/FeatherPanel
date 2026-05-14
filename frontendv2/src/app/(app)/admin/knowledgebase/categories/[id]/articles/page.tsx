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

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import axios from 'axios';
import {
    FileText,
    Plus,
    Pencil,
    Trash2,
    Search,
    Eye,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Info,
    Layout,
    Shield,
    Image as ImageIcon,
    ArrowUp,
    ArrowDown,
    GripVertical,
    Save,
    X,
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
import { Select } from '@/components/ui/select-native';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Category {
    id: number;
    name: string;
    slug: string;
    icon: string;
    description?: string;
}

interface Article {
    id: number;
    category_id: number;
    title: string;
    slug: string;
    icon?: string | null;
    content: string;
    status: 'draft' | 'published' | 'archived';
    pinned: 'true' | 'false';
    sort_order?: number;
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

export default function CategoryArticlesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { t } = useTranslation();
    const router = useRouter();

    const [category, setCategory] = useState<Category | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-knowledgebase-category-articles');
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        hasNext: false,
        hasPrev: false,
        totalPages: 1,
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    const [formLoading, setFormLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        content: '',
        status: 'draft' as 'draft' | 'published' | 'archived',
        pinned: false,
    });

    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reordering state
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [reorderLoading, setReorderLoading] = useState(false);
    const [hasOrderChanges, setHasOrderChanges] = useState(false);

    const resetForm = () => {
        setForm({
            title: '',
            content: '',
            status: 'draft',
            pinned: false,
        });
        setIconFile(null);
        setIconPreview(null);
        setSelectedArticle(null);
    };

    const fetchCategory = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/admin/knowledgebase/categories/${id}`);
            if (data?.success) {
                setCategory(data.data.category);
            }
        } catch {
            toast.error(t('admin.knowledgebase.categories.messages.fetch_failed'));
            router.push('/admin/knowledgebase/categories');
        }
    }, [id, router, t]);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/knowledgebase/articles', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: searchQuery || undefined,
                    category_id: id,
                },
            });

            if (data?.success) {
                setArticles(data.data.articles || []);
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
                toast.error(t('admin.knowledgebase.articles.messages.fetch_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.articles.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [id, pagination.page, pagination.pageSize, searchQuery, t]);

    /** Admin KB list API caps `limit` at 100; fetch every page before reorder. */
    const fetchAllArticlesForReorder = useCallback(async (): Promise<boolean> => {
        const pageSize = 100;
        try {
            let page = 1;
            const allArticles: Article[] = [];
            let totalRecords = 0;
            while (true) {
                const { data } = await axios.get('/api/admin/knowledgebase/articles', {
                    params: {
                        page,
                        limit: pageSize,
                        category_id: id,
                    },
                });
                if (!data?.success) {
                    toast.error(t('admin.knowledgebase.articles.messages.fetch_failed'));
                    return false;
                }
                const pag = data.data.pagination;
                totalRecords = pag.total_records;
                const batch = data.data.articles || [];
                allArticles.push(...batch);
                if (allArticles.length >= totalRecords || !pag.has_next) {
                    break;
                }
                page += 1;
            }
            if (allArticles.length !== totalRecords) {
                toast.error(t('admin.knowledgebase.articles.messages.fetch_failed'));
                return false;
            }
            const sorted = [...allArticles].sort((a: Article, b: Article) => {
                if (a.pinned === 'true' && b.pinned !== 'true') return -1;
                if (a.pinned !== 'true' && b.pinned === 'true') return 1;
                return (a.sort_order || 0) - (b.sort_order || 0);
            });
            setArticles(sorted);
            return true;
        } catch {
            toast.error(t('admin.knowledgebase.articles.messages.fetch_failed'));
            return false;
        }
    }, [id, t]);

    // Reordering functions
    const moveArticle = (articleId: number, direction: 'up' | 'down') => {
        const index = articles.findIndex((a) => a.id === articleId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= articles.length) return;

        const newArticles = [...articles];
        const [movedArticle] = newArticles.splice(index, 1);
        newArticles.splice(newIndex, 0, movedArticle);

        // Update sort_order for all articles
        const updatedArticles = newArticles.map((article, idx) => ({
            ...article,
            sort_order: idx * 10,
        }));

        setArticles(updatedArticles);
        setHasOrderChanges(true);
    };

    const saveArticleOrder = async () => {
        setReorderLoading(true);
        try {
            const articlesToSave = articles.map((article) => ({
                id: article.id,
                sort_order: article.sort_order || 0,
            }));

            const response = await axios.post('/api/admin/knowledgebase/articles/reorder', {
                articles: articlesToSave,
            });

            if (response.data?.success) {
                toast.success(t('admin.knowledgebase.order.messages.saved'));
                setHasOrderChanges(false);
                setIsReorderMode(false);
                // Force a complete refresh
                setPagination((p) => ({ ...p, page: 1 }));
                await fetchArticles();
            } else {
                toast.error(t('admin.knowledgebase.order.messages.save_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.order.messages.save_failed'));
        } finally {
            setReorderLoading(false);
        }
    };

    const toggleReorderMode = async () => {
        if (!isReorderMode) {
            const ok = await fetchAllArticlesForReorder();
            if (!ok) return;
        } else {
            // Exiting reorder mode - reset and refresh paginated view
            setPagination((p) => ({ ...p, page: 1 }));
            await fetchArticles();
            setHasOrderChanges(false);
        }
        setIsReorderMode(!isReorderMode);
    };

    useEffect(() => {
        fetchWidgets();
        fetchCategory();
        fetchArticles();
    }, [fetchCategory, fetchArticles, fetchWidgets]);

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
        setFormLoading(true);

        let iconUrl = '';
        if (iconFile) {
            const uploadedUrl = await uploadIcon(iconFile);
            if (!uploadedUrl) {
                setFormLoading(false);
                return;
            }
            iconUrl = uploadedUrl;
        }

        try {
            const { data } = await axios.put('/api/admin/knowledgebase/articles', {
                ...form,
                category_id: parseInt(id),
                icon: iconUrl || undefined,
                slug: form.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
                author_id: 1,
            });

            if (data?.success) {
                toast.success(t('admin.knowledgebase.articles.messages.created'));
                setCreateOpen(false);
                fetchArticles();
            } else {
                toast.error(data?.message || t('admin.knowledgebase.articles.messages.create_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.articles.messages.create_failed'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (article: Article) => {
        if (!confirm(t('admin.knowledgebase.articles.messages.delete_confirm', { title: article.title }))) return;

        try {
            const { data } = await axios.delete(`/api/admin/knowledgebase/articles/${article.id}`);
            if (data?.success) {
                toast.success(t('admin.knowledgebase.articles.messages.deleted'));
                fetchArticles();
            } else {
                toast.error(data?.message || t('admin.knowledgebase.articles.messages.delete_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.articles.messages.delete_failed'));
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-category-articles', 'top-of-page')} />
            <PageHeader
                title={t('admin.knowledgebase.articles.subtitle', { name: category?.name || '...' })}
                description={category?.description}
                icon={FileText}
                actions={
                    <div className='flex items-center gap-2'>
                        {!isReorderMode ? (
                            <>
                                <Button variant='outline' onClick={toggleReorderMode} className='gap-2'>
                                    <ArrowUp className='h-4 w-4' />
                                    <ArrowDown className='h-4 w-4' />
                                    <span className='hidden sm:inline'>{t('admin.knowledgebase.order.title')}</span>
                                </Button>
                                <Button
                                    variant='outline'
                                    onClick={() => router.push('/admin/knowledgebase/categories')}
                                >
                                    <ChevronLeft className='mr-2 h-4 w-4' />
                                    {t('admin.knowledgebase.articles.back_to_categories')}
                                </Button>
                                <Button
                                    onClick={() => {
                                        resetForm();
                                        setCreateOpen(true);
                                    }}
                                >
                                    <Plus className='mr-2 h-4 w-4' />
                                    {t('admin.knowledgebase.articles.create')}
                                </Button>
                            </>
                        ) : (
                            <>
                                {hasOrderChanges && (
                                    <Button
                                        onClick={saveArticleOrder}
                                        loading={reorderLoading}
                                        variant='default'
                                        className='gap-2'
                                    >
                                        <Save className='h-4 w-4' />
                                        {t('common.save')}
                                    </Button>
                                )}
                                <Button variant='outline' onClick={toggleReorderMode}>
                                    <X className='mr-2 h-4 w-4' />
                                    {t('common.cancel')}
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-category-articles', 'after-header')} />

            {!isReorderMode && (
                <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                    <div className='group relative w-full flex-1'>
                        <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('admin.knowledgebase.articles.search_placeholder')}
                            className='h-11 pl-10'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-category-articles', 'before-list')} />

            {pagination.totalPages > 1 && !loading && !isReorderMode && (
                <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
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
            ) : articles.length === 0 ? (
                <EmptyState
                    title={t('admin.knowledgebase.articles.no_results')}
                    description={t('admin.knowledgebase.articles.search_placeholder')}
                    icon={AlertCircle}
                    action={
                        <Button variant='outline' onClick={() => setSearchQuery('')}>
                            {t('admin.users.clear_filters')}
                        </Button>
                    }
                />
            ) : isReorderMode ? (
                // Reorder Mode UI - Improved styling
                <div className='space-y-6'>
                    {hasOrderChanges && (
                        <div className='flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600'>
                            <AlertCircle className='h-4 w-4' />
                            {t('admin.knowledgebase.order.unsaved_changes')}
                        </div>
                    )}

                    <PageCard
                        title={t('admin.knowledgebase.order.subtitle')}
                        icon={GripVertical}
                        className='overflow-hidden'
                    >
                        <div className='divide-border/50 divide-y'>
                            {articles.map((article, index) => (
                                <div
                                    key={article.id}
                                    className='group hover:bg-muted/30 flex items-center gap-4 p-4 transition-colors'
                                >
                                    {/* Position Number */}
                                    <div className='bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold'>
                                        {index + 1}
                                    </div>

                                    {/* Move Buttons */}
                                    <div className='flex flex-col gap-0.5'>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='h-6 w-6'
                                            onClick={() => moveArticle(article.id, 'up')}
                                            disabled={index === 0}
                                        >
                                            <ArrowUp className='h-3 w-3' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='h-6 w-6'
                                            onClick={() => moveArticle(article.id, 'down')}
                                            disabled={index === articles.length - 1}
                                        >
                                            <ArrowDown className='h-3 w-3' />
                                        </Button>
                                    </div>

                                    {/* Article Icon */}
                                    <div className='bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl'>
                                        {article.icon ? (
                                            <Image
                                                src={article.icon}
                                                alt={article.title}
                                                width={48}
                                                height={48}
                                                className='h-full w-full object-cover'
                                                unoptimized
                                            />
                                        ) : (
                                            <FileText className='text-primary h-6 w-6' />
                                        )}
                                    </div>

                                    {/* Article Info */}
                                    <div className='min-w-0 flex-1'>
                                        <div className='truncate font-medium'>{article.title}</div>
                                        <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                                            {article.pinned === 'true' && (
                                                <span className='text-primary inline-flex items-center gap-1'>
                                                    <Save className='h-3 w-3' />
                                                    {t('admin.knowledgebase.articles.form.pinned')}
                                                </span>
                                            )}
                                            <span
                                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                                    article.status === 'published'
                                                        ? 'bg-green-500/10 text-green-600'
                                                        : article.status === 'draft'
                                                          ? 'bg-yellow-500/10 text-yellow-600'
                                                          : 'bg-gray-500/10 text-gray-600'
                                                }`}
                                            >
                                                {t(`admin.knowledgebase.articles.status.${article.status}`)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PageCard>
                </div>
            ) : (
                // Normal Mode UI
                <div className='grid grid-cols-1 gap-6'>
                    {articles.map((article) => {
                        const IconComponent = ({ className }: { className?: string }) => (
                            <div
                                className={`bg-primary/10 flex items-center justify-center overflow-hidden rounded-xl ${className}`}
                            >
                                {article.icon ? (
                                    <Image
                                        src={article.icon}
                                        alt={article.title}
                                        width={48}
                                        height={48}
                                        className='h-full w-full object-cover'
                                        unoptimized
                                    />
                                ) : (
                                    <FileText className='text-primary h-1/2 w-1/2' />
                                )}
                            </div>
                        );

                        const badges: ResourceBadge[] = [
                            {
                                label: t(`admin.knowledgebase.articles.status.${article.status}`),
                                className:
                                    article.status === 'published'
                                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                        : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
                            },
                        ];

                        if (article.pinned === 'true') {
                            badges.push({
                                label: t('admin.knowledgebase.articles.badges.pinned'),
                                className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
                            });
                        }

                        return (
                            <ResourceCard
                                key={article.id}
                                icon={IconComponent}
                                title={article.title}
                                subtitle={article.slug}
                                badges={badges}
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/admin/knowledgebase/articles/${article.id}/edit`);
                                            }}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedArticle(article);
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
                                                handleDelete(article);
                                            }}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                                onClick={() => router.push(`/admin/knowledgebase/articles/${article.id}/edit`)}
                            />
                        );
                    })}
                </div>
            )}

            {pagination.totalPages > 1 && !isReorderMode && (
                <div className='mt-8 flex items-center justify-center gap-2'>
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

            {!isReorderMode && (
                <div className='grid grid-cols-1 gap-6 pt-10 md:grid-cols-2 lg:grid-cols-3'>
                    <PageCard title={t('admin.knowledgebase.help.managing.title')} icon={Layout}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.knowledgebase.help.managing.description')}
                        </p>
                    </PageCard>
                    <PageCard title={t('admin.knowledgebase.help.content.title')} icon={Info}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.knowledgebase.help.content.description')}
                        </p>
                    </PageCard>
                    <PageCard title={t('admin.knowledgebase.help.attachments.title')} icon={Shield} variant='danger'>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.knowledgebase.help.attachments.description')}
                        </p>
                    </PageCard>
                </div>
            )}

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='flex h-full flex-col p-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.knowledgebase.articles.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.knowledgebase.articles.form.create_description')}</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleCreate} className='mt-6 flex-1 space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='create-title'>{t('admin.knowledgebase.articles.form.title')}</Label>
                            <Input
                                id='create-title'
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-icon'>{t('admin.knowledgebase.articles.form.icon')}</Label>
                            <div className='flex items-center gap-4'>
                                <div className='bg-primary/10 border-border/50 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border'>
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
                                        <ImageIcon className='text-muted-foreground h-6 w-6' />
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
                            <Label htmlFor='create-status'>{t('admin.knowledgebase.articles.form.status')}</Label>
                            <Select
                                id='create-status'
                                value={form.status}
                                onChange={(e) =>
                                    setForm({ ...form, status: e.target.value as 'draft' | 'published' | 'archived' })
                                }
                            >
                                <option value='draft'>{t('admin.knowledgebase.articles.status.draft')}</option>
                                <option value='published'>{t('admin.knowledgebase.articles.status.published')}</option>
                                <option value='archived'>{t('admin.knowledgebase.articles.status.archived')}</option>
                            </Select>
                        </div>

                        <div className='bg-muted/30 flex items-center gap-2 rounded-xl p-4'>
                            <Checkbox
                                id='create-pinned'
                                checked={form.pinned}
                                onCheckedChange={(val) => setForm({ ...form, pinned: !!val })}
                            />
                            <Label
                                htmlFor='create-pinned'
                                className='text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                            >
                                {t('admin.knowledgebase.articles.form.pinned')}
                            </Label>
                        </div>

                        <SheetFooter className='pt-6'>
                            <Button type='button' variant='outline' onClick={() => setCreateOpen(false)}>
                                {t('common.close')}
                            </Button>
                            <Button type='submit' loading={formLoading}>
                                {t('admin.knowledgebase.articles.create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='flex h-full flex-col p-6'>
                    <SheetHeader>
                        <SheetTitle>{selectedArticle?.title}</SheetTitle>
                        <SheetDescription>{selectedArticle?.slug}</SheetDescription>
                    </SheetHeader>

                    <div className='mt-8 flex-1 space-y-6'>
                        <div className='flex justify-center'>
                            <div className='bg-primary/5 border-border/50 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border'>
                                {selectedArticle?.icon ? (
                                    <Image
                                        src={selectedArticle?.icon}
                                        alt={selectedArticle?.title}
                                        width={128}
                                        height={128}
                                        className='h-full w-full object-cover'
                                        unoptimized
                                    />
                                ) : (
                                    <FileText className='text-primary/40 h-1/2 w-1/2' />
                                )}
                            </div>
                        </div>

                        <div className='grid grid-cols-2 gap-4'>
                            <div className='bg-muted/50 rounded-2xl p-4'>
                                <p className='text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase'>
                                    {t('admin.knowledgebase.articles.form.status')}
                                </p>
                                <p className='text-sm font-bold'>
                                    {selectedArticle?.status
                                        ? t(`admin.knowledgebase.articles.status.${selectedArticle.status}`)
                                        : '-'}
                                </p>
                            </div>
                            <div className='bg-muted/50 rounded-2xl p-4'>
                                <p className='text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase'>
                                    {t('admin.roles.labels.created')}
                                </p>
                                <p className='text-sm font-medium'>
                                    {selectedArticle?.created_at
                                        ? new Date(selectedArticle.created_at).toLocaleDateString()
                                        : '-'}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                                {t('admin.knowledgebase.articles.form.pinned')}
                            </p>
                            <p className='text-sm font-medium'>
                                {selectedArticle?.pinned === 'true' ? t('common.yes') : t('common.no')}
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

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-category-articles', 'bottom-of-page')} />
        </div>
    );
}
