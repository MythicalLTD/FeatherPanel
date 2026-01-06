// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

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
                author_id: 1, // Fallback, should be handled by session
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
                        <Button variant='outline' onClick={() => router.push('/admin/knowledgebase/categories')}>
                            <ChevronLeft className='h-4 w-4 mr-2' />
                            {t('admin.knowledgebase.articles.back_to_categories')}
                        </Button>
                        <Button
                            onClick={() => {
                                resetForm();
                                setCreateOpen(true);
                            }}
                        >
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.knowledgebase.articles.create')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-category-articles', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.knowledgebase.articles.search_placeholder')}
                        className='pl-10 h-11'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-category-articles', 'before-list')} />

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
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {articles.map((article) => {
                        const IconComponent = ({ className }: { className?: string }) => (
                            <div
                                className={`flex items-center justify-center rounded-xl bg-primary/10 overflow-hidden ${className}`}
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
                                    <FileText className='h-1/2 w-1/2 text-primary' />
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

            {/* Help Cards */}
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

            {/* Create Sheet */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='p-6 h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.knowledgebase.articles.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.knowledgebase.articles.form.create_description')}</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleCreate} className='space-y-4 mt-6 flex-1'>
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

                        <div className='flex items-center gap-2 bg-muted/30 p-4 rounded-xl'>
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

            {/* View Modal */}
            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='p-6 h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{selectedArticle?.title}</SheetTitle>
                        <SheetDescription>{selectedArticle?.slug}</SheetDescription>
                    </SheetHeader>

                    <div className='mt-8 space-y-6 flex-1'>
                        <div className='flex justify-center'>
                            <div className='h-32 w-32 rounded-3xl bg-primary/5 flex items-center justify-center overflow-hidden border border-border/50'>
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
                                    <FileText className='h-1/2 w-1/2 text-primary/40' />
                                )}
                            </div>
                        </div>

                        <div className='grid grid-cols-2 gap-4'>
                            <div className='p-4 rounded-2xl bg-muted/50'>
                                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
                                    {t('admin.knowledgebase.articles.form.status')}
                                </p>
                                <p className='text-sm font-bold'>
                                    {selectedArticle?.status
                                        ? t(`admin.knowledgebase.articles.status.${selectedArticle.status}`)
                                        : '-'}
                                </p>
                            </div>
                            <div className='p-4 rounded-2xl bg-muted/50'>
                                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
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
                            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
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
