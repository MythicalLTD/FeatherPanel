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

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import axios from 'axios';
import {
    FileText,
    Save,
    ChevronLeft,
    Paperclip,
    Tags,
    Trash2,
    Copy,
    Plus,
    X,
    Image as ImageIcon,
    Eye,
    Pencil,
    Layout,
    Info,
    Shield,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { copyToClipboard, formatFileSize } from '@/lib/utils';

interface Category {
    id: number;
    name: string;
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
}

interface Attachment {
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    user_downloadable: boolean;
}

interface Tag {
    id: number;
    tag_name: string;
}

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { t } = useTranslation();
    const router = useRouter();

    const [article, setArticle] = useState<Article | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [saveLoading, setSaveLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [form, setForm] = useState<Article>({
        id: 0,
        category_id: 0,
        title: '',
        slug: '',
        content: '',
        status: 'draft',
        pinned: 'false',
    });

    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const iconInputRef = useRef<HTMLInputElement>(null);

    const [uploadLoading, setUploadLoading] = useState(false);
    const [userDownloadable, setUserDownloadable] = useState(true);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
    const [newTags, setNewTags] = useState('');

    // Article reordering state
    const [categoryArticles, setCategoryArticles] = useState<Article[]>([]);
    const [reorderLoading, setReorderLoading] = useState(false);
    const [hasOrderChanges, setHasOrderChanges] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-knowledgebase-article-edit');

    const fetchData = useCallback(async () => {
        try {
            const [artRes, catRes, attRes, tagRes] = await Promise.all([
                axios.get(`/api/admin/knowledgebase/articles/${id}`),
                axios.get('/api/admin/knowledgebase/categories'),
                axios.get(`/api/admin/knowledgebase/articles/${id}/attachments`),
                axios.get(`/api/admin/knowledgebase/articles/${id}/tags`),
            ]);

            if (artRes.data?.success) {
                const art = artRes.data.data.article;
                setArticle(art);
                setForm(art);
                setIconPreview(art.icon);
            }
            if (catRes.data?.success) setCategories(catRes.data.data.categories);
            if (attRes.data?.success) setAttachments(attRes.data.data.attachments);
            if (tagRes.data?.success) setTags(tagRes.data.data.tags);
        } catch {
            toast.error(t('admin.knowledgebase.articles.messages.fetch_failed'));
        }
    }, [id, t]);

    // Fetch articles in the same category for reordering
    const fetchCategoryArticles = useCallback(async (categoryId: number) => {
        if (!categoryId) return;
        try {
            const res = await axios.get('/api/admin/knowledgebase/articles', {
                params: { category_id: categoryId, limit: 100 },
            });
            if (res.data?.success) {
                const sorted = res.data.data.articles.sort((a: Article, b: Article) => {
                    if (a.pinned === 'true' && b.pinned !== 'true') return -1;
                    if (a.pinned !== 'true' && b.pinned === 'true') return 1;
                    return (a.sort_order || 0) - (b.sort_order || 0);
                });
                setCategoryArticles(sorted);
            }
        } catch {
            // Silently fail - reordering is optional
        }
    }, []);

    // Reordering functions
    const moveArticle = (articleId: number, direction: 'up' | 'down') => {
        const index = categoryArticles.findIndex((a) => a.id === articleId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= categoryArticles.length) return;

        const newArticles = [...categoryArticles];
        const [movedArticle] = newArticles.splice(index, 1);
        newArticles.splice(newIndex, 0, movedArticle);

        // Update sort_order for all articles
        const updatedArticles = newArticles.map((article, idx) => ({
            ...article,
            sort_order: idx * 10,
        }));

        setCategoryArticles(updatedArticles);
        setHasOrderChanges(true);
    };

    const saveArticleOrder = async () => {
        setReorderLoading(true);
        try {
            const articlesToSave = categoryArticles.map((article) => ({
                id: article.id,
                sort_order: article.sort_order || 0,
            }));

            const response = await axios.post('/api/admin/knowledgebase/articles/reorder', {
                articles: articlesToSave,
            });

            if (response.data?.success) {
                toast.success(t('admin.knowledgebase.order.messages.saved'));
                setHasOrderChanges(false);
            } else {
                toast.error(t('admin.knowledgebase.order.messages.save_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.order.messages.save_failed'));
        } finally {
            setReorderLoading(false);
        }
    };

    useEffect(() => {
        fetchWidgets();
        fetchData();
    }, [fetchData, fetchWidgets]);

    // Fetch category articles when category changes
    useEffect(() => {
        if (form.category_id) {
            fetchCategoryArticles(form.category_id);
        }
    }, [form.category_id, fetchCategoryArticles]);

    const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            const reader = new FileReader();
            reader.onload = (event) => setIconPreview(event.target?.result as string);
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveLoading(true);

        let iconUrl = form.icon || '';
        if (iconFile) {
            const uploadedUrl = await uploadIcon(iconFile);
            if (!uploadedUrl) {
                setSaveLoading(false);
                return;
            }
            iconUrl = uploadedUrl;
        }

        try {
            const { data } = await axios.patch(`/api/admin/knowledgebase/articles/${id}`, {
                ...form,
                icon: iconUrl || undefined,
                slug: form.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
            });

            if (data?.success) {
                toast.success(t('admin.knowledgebase.messages.updated'));
                fetchData();
            } else {
                toast.error(data?.message || t('admin.knowledgebase.articles.messages.update_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.articles.messages.update_failed'));
        } finally {
            setSaveLoading(false);
        }
    };

    const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_downloadable', userDownloadable ? '1' : '0');

        try {
            const { data } = await axios.post(`/api/admin/knowledgebase/articles/${id}/upload-attachment`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (data?.success) {
                toast.success(t('admin.knowledgebase.edit.attachments.messages.uploaded'));
                const attRes = await axios.get(`/api/admin/knowledgebase/articles/${id}/attachments`);
                if (attRes.data?.success) setAttachments(attRes.data.data.attachments);
            } else {
                toast.error(t('admin.knowledgebase.edit.attachments.messages.upload_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.edit.attachments.messages.upload_failed'));
        } finally {
            setUploadLoading(false);
        }
    };

    const handleDeleteAttachment = async (attId: number) => {
        if (!confirm(t('common.confirm_action'))) return;
        try {
            const { data } = await axios.delete(`/api/admin/knowledgebase/articles/${id}/attachments/${attId}`);
            if (data?.success) {
                setAttachments(attachments.filter((a) => a.id !== attId));
                toast.success(t('admin.knowledgebase.edit.attachments.messages.deleted'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.edit.attachments.messages.delete_failed'));
        }
    };

    const handleAddTags = async () => {
        const tagNames = newTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        if (tagNames.length === 0) return;

        let successCount = 0;
        let errorCount = 0;

        try {
            for (const tagName of tagNames) {
                try {
                    const { data } = await axios.post(`/api/admin/knowledgebase/articles/${id}/tags`, {
                        tag_name: tagName,
                    });
                    if (data?.success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (e) {
                    if (axios.isAxiosError(e) && e.response?.status === 409) {
                        continue;
                    }
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success(t('admin.knowledgebase.edit.tags.messages.added', { count: String(successCount) }));
                setTagsDialogOpen(false);
                setNewTags('');
                const tagRes = await axios.get(`/api/admin/knowledgebase/articles/${id}/tags`);
                if (tagRes.data?.success) setTags(tagRes.data.data.tags);
            } else if (errorCount > 0) {
                toast.error(t('admin.knowledgebase.edit.tags.messages.add_failed'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.edit.tags.messages.add_failed'));
        }
    };

    const handleDeleteTag = async (tagId: number) => {
        try {
            const { data } = await axios.delete(`/api/admin/knowledgebase/articles/${id}/tags/${tagId}`);
            if (data?.success) {
                setTags(tags.filter((t) => t.id !== tagId));
                toast.success(t('admin.knowledgebase.edit.tags.messages.deleted'));
            }
        } catch {
            toast.error(t('admin.knowledgebase.edit.tags.messages.delete_failed'));
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-article-edit', 'top-of-page')} />
            <PageHeader
                title={t('admin.knowledgebase.edit.title')}
                description={t('admin.knowledgebase.edit.subtitle', { title: article?.title || '...' })}
                icon={FileText}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' onClick={() => router.back()}>
                            <ChevronLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        <Button onClick={handleSave} loading={saveLoading}>
                            <Save className='mr-2 h-4 w-4' />
                            {t('admin.knowledgebase.edit.form.save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-article-edit', 'after-header')} />

            <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
                <div className='space-y-6 lg:col-span-2'>
                    <WidgetRenderer widgets={getWidgets('admin-knowledgebase-article-edit', 'before-content')} />
                    <Tabs defaultValue='content' className='w-full'>
                        <div className='bg-card/40 mb-6 flex items-center justify-between rounded-2xl p-2 shadow-sm backdrop-blur-md'>
                            <TabsList className='h-10 bg-transparent'>
                                <TabsTrigger
                                    value='content'
                                    className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl'
                                >
                                    <FileText className='mr-2 h-4 w-4' />
                                    {t('admin.knowledgebase.edit.tabs.content')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value='attachments'
                                    className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl'
                                >
                                    <Paperclip className='mr-2 h-4 w-4' />
                                    {t('admin.knowledgebase.edit.tabs.attachments')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value='tags'
                                    className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl'
                                >
                                    <Tags className='mr-2 h-4 w-4' />
                                    {t('admin.knowledgebase.edit.tabs.tags')}
                                </TabsTrigger>
                            </TabsList>

                            <div className='h-10 px-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='h-full rounded-xl'
                                    onClick={() => setPreviewMode(!previewMode)}
                                >
                                    {previewMode ? (
                                        <>
                                            <Pencil className='mr-2 h-4 w-4' />{' '}
                                            {t('admin.knowledgebase.articles.form.edit')}
                                        </>
                                    ) : (
                                        <>
                                            <Eye className='mr-2 h-4 w-4' />{' '}
                                            {t('admin.knowledgebase.articles.form.preview')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <TabsContent value='content' className='m-0 border-none p-0 outline-none'>
                            <div className='bg-card/40 space-y-4 rounded-2xl p-6 shadow-sm backdrop-blur-md'>
                                <div className='space-y-2'>
                                    <Label htmlFor='title'>{t('admin.knowledgebase.articles.form.title')}</Label>
                                    <Input
                                        id='title'
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        className='h-12 text-lg font-medium'
                                        placeholder={t('admin.knowledgebase.articles.form.title')}
                                    />
                                </div>

                                {previewMode ? (
                                    <div className='prose dark:prose-invert bg-muted/30 border-border/50 min-h-[400px] max-w-none rounded-2xl border p-6'>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ children }) => (
                                                    <p className='text-muted-foreground/90 mb-4 leading-relaxed'>
                                                        {children}
                                                    </p>
                                                ),
                                                code: ({ children }) => (
                                                    <code className='bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-sm'>
                                                        {children}
                                                    </code>
                                                ),
                                                pre: ({ children }) => (
                                                    <pre className='bg-muted/50 border-border/50 my-6 overflow-x-auto rounded-xl border p-4'>
                                                        {children}
                                                    </pre>
                                                ),
                                                blockquote: ({ children }) => (
                                                    <blockquote className='border-primary/30 text-muted-foreground my-6 border-l-4 pl-4 italic'>
                                                        {children}
                                                    </blockquote>
                                                ),
                                                img: ({ ...props }) => (
                                                    <img
                                                        {...props}
                                                        alt={props.alt || ''}
                                                        className='border-border/50 mx-auto my-8 block max-w-full rounded-xl border shadow-md'
                                                    />
                                                ),
                                                a: ({ href, children, ...props }) => {
                                                    if (
                                                        href &&
                                                        /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(href)
                                                    ) {
                                                        return (
                                                            <img
                                                                src={href}
                                                                alt={typeof children === 'string' ? children : ''}
                                                                className='border-border/50 mx-auto my-8 block max-w-full rounded-xl border shadow-md'
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <a
                                                            {...props}
                                                            href={href}
                                                            className='text-primary font-medium hover:underline'
                                                        >
                                                            {children}
                                                        </a>
                                                    );
                                                },
                                                table: ({ children }) => (
                                                    <div className='my-6 overflow-x-auto'>
                                                        <table className='w-full border-collapse text-sm'>
                                                            {children}
                                                        </table>
                                                    </div>
                                                ),
                                                thead: ({ children }) => (
                                                    <thead className='bg-muted/50'>{children}</thead>
                                                ),
                                                tbody: ({ children }) => (
                                                    <tbody className='divide-border/50 divide-y'>{children}</tbody>
                                                ),
                                                tr: ({ children }) => (
                                                    <tr className='border-border/50 hover:bg-muted/30 border-b transition-colors'>
                                                        {children}
                                                    </tr>
                                                ),
                                                th: ({ children }) => (
                                                    <th className='text-foreground border-border/50 border px-4 py-3 text-left font-semibold'>
                                                        {children}
                                                    </th>
                                                ),
                                                td: ({ children }) => (
                                                    <td className='text-muted-foreground border-border/50 border px-4 py-3'>
                                                        {children}
                                                    </td>
                                                ),
                                                strong: ({ children }) => (
                                                    <strong className='text-foreground font-semibold'>
                                                        {children}
                                                    </strong>
                                                ),
                                            }}
                                        >
                                            {form.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <textarea
                                        value={form.content}
                                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                                        className='bg-muted/30 border-border/50 focus:ring-primary/20 min-h-[400px] w-full resize-y rounded-2xl border p-6 font-mono text-sm leading-relaxed transition-all focus:ring-2 focus:outline-none'
                                        placeholder={t('admin.knowledgebase.articles.form.content')}
                                    />
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value='attachments' className='m-0 border-none p-0 outline-none'>
                            <div className='bg-card/40 space-y-6 rounded-2xl p-6 shadow-sm backdrop-blur-md'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <h3 className='text-lg font-bold'>
                                            {t('admin.knowledgebase.edit.attachments.title')}
                                        </h3>
                                        <p className='text-muted-foreground text-sm'>
                                            {t('admin.knowledgebase.edit.attachments.description')}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <div className='bg-muted/30 border-border/50 flex items-center gap-2 rounded-xl border px-3 py-2'>
                                            <Checkbox
                                                id='user_downloadable'
                                                checked={userDownloadable}
                                                onCheckedChange={(val) => setUserDownloadable(!!val)}
                                            />
                                            <Label
                                                htmlFor='user_downloadable'
                                                className='cursor-pointer text-xs font-medium whitespace-nowrap'
                                            >
                                                {t('admin.knowledgebase.edit.attachments.make_downloadable')}
                                            </Label>
                                        </div>
                                        <Button
                                            variant='outline'
                                            onClick={() => attachmentInputRef.current?.click()}
                                            loading={uploadLoading}
                                        >
                                            <Plus className='mr-2 h-4 w-4' />
                                            {t('admin.knowledgebase.edit.attachments.upload')}
                                        </Button>
                                    </div>
                                    <input
                                        ref={attachmentInputRef}
                                        type='file'
                                        className='hidden'
                                        onChange={handleUploadAttachment}
                                    />
                                </div>

                                {attachments.length === 0 ? (
                                    <div className='border-border/50 text-muted-foreground flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12'>
                                        <Paperclip className='mb-4 h-12 w-12 opacity-20' />
                                        <p>{t('admin.knowledgebase.edit.attachments.no_attachments')}</p>
                                    </div>
                                ) : (
                                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                        {attachments.map((att) => (
                                            <div
                                                key={att.id}
                                                className='bg-muted/30 border-border/30 hover:border-primary/30 group rounded-2xl border p-4 transition-all'
                                            >
                                                <div className='flex items-start justify-between gap-4'>
                                                    <div className='flex items-center gap-3 overflow-hidden'>
                                                        <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                                                            <Paperclip className='text-primary h-5 w-5' />
                                                        </div>
                                                        <div className='overflow-hidden'>
                                                            <p className='truncate text-sm font-semibold'>
                                                                {att.file_name}
                                                            </p>
                                                            <p className='text-muted-foreground text-xs'>
                                                                {formatFileSize(att.file_size)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className='flex shrink-0 items-center gap-1'>
                                                        <Button
                                                            variant='outline'
                                                            size='icon'
                                                            className='h-8 w-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100'
                                                            onClick={() => {
                                                                const isImage = att.file_type.startsWith('image/');
                                                                const md = isImage
                                                                    ? `![${att.file_name}](${att.file_path})`
                                                                    : `[${att.file_name}](${att.file_path})`;
                                                                copyToClipboard(md, t);
                                                            }}
                                                        >
                                                            <Copy className='h-4 w-4 transition-all active:scale-90' />
                                                        </Button>
                                                        <Button
                                                            variant='destructive'
                                                            size='icon'
                                                            className='h-8 w-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100'
                                                            onClick={() => handleDeleteAttachment(att.id)}
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value='tags' className='m-0 border-none p-0 outline-none'>
                            <div className='bg-card/40 space-y-6 rounded-2xl p-6 shadow-sm backdrop-blur-md'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <h3 className='text-lg font-bold'>
                                            {t('admin.knowledgebase.edit.tags.title')}
                                        </h3>
                                        <p className='text-muted-foreground text-sm'>
                                            {t('admin.knowledgebase.help.attachments.description')}
                                        </p>
                                    </div>
                                    <Button variant='outline' onClick={() => setTagsDialogOpen(true)}>
                                        <Plus className='mr-2 h-4 w-4' />
                                        {t('admin.knowledgebase.edit.tags.add')}
                                    </Button>
                                </div>

                                {tags.length === 0 ? (
                                    <div className='border-border/50 text-muted-foreground flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12'>
                                        <Tags className='mb-4 h-12 w-12 opacity-20' />
                                        <p>{t('admin.knowledgebase.edit.tags.no_tags')}</p>
                                    </div>
                                ) : (
                                    <div className='flex flex-wrap gap-3'>
                                        {tags.map((tag) => (
                                            <div
                                                key={tag.id}
                                                className='bg-primary/10 border-primary/20 text-primary group flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all hover:pr-1'
                                            >
                                                <span className='text-sm font-medium'>{tag.tag_name}</span>
                                                <button
                                                    onClick={() => handleDeleteTag(tag.id)}
                                                    className='hover:bg-primary/20 flex h-5 w-5 items-center justify-center rounded-lg opacity-0 transition-colors group-hover:opacity-100'
                                                >
                                                    <X className='h-3 w-3' />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
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
                    </div>
                </div>

                <div className='space-y-6'>
                    <div className='bg-card/40 space-y-6 overflow-hidden rounded-2xl p-6 shadow-sm backdrop-blur-md'>
                        <h3 className='mb-2 text-lg font-bold'>{t('common.details')}</h3>

                        <div className='space-y-2'>
                            <Label>{t('admin.knowledgebase.edit.form.category')}</Label>
                            <Select
                                value={String(form.category_id)}
                                onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value) })}
                            >
                                <option value='0' disabled>
                                    {t('admin.knowledgebase.edit.form.select_category')}
                                </option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={String(cat.id)}>
                                        {cat.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <Label>{t('admin.knowledgebase.articles.form.status')}</Label>
                            <Select
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

                        <div className='bg-muted/30 flex items-center gap-3 rounded-xl p-4'>
                            <Checkbox
                                id='pinned'
                                checked={form.pinned === 'true'}
                                onCheckedChange={(val) => setForm({ ...form, pinned: val ? 'true' : 'false' })}
                            />
                            <Label htmlFor='pinned' className='cursor-pointer text-sm leading-none font-medium'>
                                {t('admin.knowledgebase.articles.form.pinned')}
                            </Label>
                        </div>

                        <div className='border-border/30 space-y-3 border-t pt-2'>
                            <Label>{t('admin.knowledgebase.articles.form.icon')}</Label>
                            <div className='flex items-center gap-4'>
                                <div className='bg-primary/5 border-border/50 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border'>
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
                                        <ImageIcon className='text-muted-foreground/30 h-8 w-8' />
                                    )}
                                </div>
                                <div className='flex-1 space-y-2'>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='w-full text-xs'
                                        onClick={() => iconInputRef.current?.click()}
                                    >
                                        {t('admin.knowledgebase.edit.attachments.upload')}
                                    </Button>
                                    <input
                                        ref={iconInputRef}
                                        type='file'
                                        className='hidden'
                                        accept='image/*'
                                        onChange={handleIconSelect}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <PageCard title={t('admin.knowledgebase.help.attachments.title')} icon={Shield} variant='danger'>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.knowledgebase.help.attachments.description')}
                        </p>
                    </PageCard>

                    {/* Article Reordering Section */}
                    {categoryArticles.length > 1 && (
                        <PageCard title={t('admin.knowledgebase.order.title')} icon={ArrowUp}>
                            <div className='space-y-4'>
                                <p className='text-muted-foreground text-sm'>
                                    {t('admin.knowledgebase.order.subtitle')}
                                </p>
                                {hasOrderChanges && (
                                    <div className='flex items-center justify-between'>
                                        <div className='text-xs text-amber-500'>
                                            {t('admin.knowledgebase.order.unsaved_changes')}
                                        </div>
                                        <Button size='sm' onClick={saveArticleOrder} loading={reorderLoading}>
                                            <Save className='mr-2 h-4 w-4' />
                                            {t('common.save')}
                                        </Button>
                                    </div>
                                )}
                                <div className='divide-border/50 max-h-[300px] space-y-2 divide-y overflow-y-auto'>
                                    {categoryArticles.map((catArticle, index) => (
                                        <div
                                            key={catArticle.id}
                                            className={`flex items-center gap-3 py-3 ${
                                                catArticle.id === article?.id
                                                    ? 'bg-primary/5 -mx-4 rounded-lg px-4'
                                                    : ''
                                            }`}
                                        >
                                            {/* Position */}
                                            <div className='bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-medium'>
                                                {index + 1}
                                            </div>

                                            {/* Move Buttons */}
                                            <div className='flex flex-col gap-0.5'>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    className='h-5 w-5'
                                                    onClick={() => moveArticle(catArticle.id, 'up')}
                                                    disabled={index === 0}
                                                >
                                                    <ArrowUp className='h-3 w-3' />
                                                </Button>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    className='h-5 w-5'
                                                    onClick={() => moveArticle(catArticle.id, 'down')}
                                                    disabled={index === categoryArticles.length - 1}
                                                >
                                                    <ArrowDown className='h-3 w-3' />
                                                </Button>
                                            </div>

                                            {/* Article Info */}
                                            <div className='min-w-0 flex-1'>
                                                <div className='truncate text-sm font-medium'>
                                                    {catArticle.title}
                                                    {catArticle.id === article?.id && (
                                                        <span className='text-primary ml-1 text-xs'>
                                                            ({t('common.current')})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className='text-muted-foreground mt-0.5 flex items-center gap-2 text-xs'>
                                                    {catArticle.pinned === 'true' && (
                                                        <span className='text-primary'>
                                                            {t('admin.knowledgebase.articles.form.pinned')}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs ${
                                                            catArticle.status === 'published'
                                                                ? 'bg-green-500/10 text-green-600'
                                                                : catArticle.status === 'draft'
                                                                  ? 'bg-yellow-500/10 text-yellow-600'
                                                                  : 'bg-gray-500/10 text-gray-600'
                                                        }`}
                                                    >
                                                        {t(`admin.knowledgebase.articles.status.${catArticle.status}`)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PageCard>
                    )}
                </div>
            </div>

            <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
                <DialogContent className='rounded-3xl sm:max-w-[425px]'>
                    <DialogHeader>
                        <DialogTitle>{t('admin.knowledgebase.edit.tags.add_dialog_title')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.knowledgebase.edit.tags.add_dialog_description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className='py-4'>
                        <Input
                            placeholder={t('admin.knowledgebase.edit.tags.placeholder')}
                            value={newTags}
                            onChange={(e) => setNewTags(e.target.value)}
                            className='focus-visible:ring-primary/20 h-12 rounded-xl'
                        />
                        <p className='text-muted-foreground mt-2 text-center text-[10px] font-medium tracking-wider uppercase'>
                            {t('admin.knowledgebase.edit.tags.messages.added_help')}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setTagsDialogOpen(false)} className='rounded-xl'>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleAddTags} className='rounded-xl'>
                            {t('admin.knowledgebase.edit.tags.add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-article-edit', 'bottom-of-page')} />
        </div>
    );
}
