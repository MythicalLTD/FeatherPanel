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

    useEffect(() => {
        fetchWidgets();
        fetchData();
    }, [fetchData, fetchWidgets]);

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
                            <ChevronLeft className='h-4 w-4 mr-2' />
                            {t('common.back')}
                        </Button>
                        <Button onClick={handleSave} loading={saveLoading}>
                            <Save className='h-4 w-4 mr-2' />
                            {t('admin.knowledgebase.edit.form.save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-knowledgebase-article-edit', 'after-header')} />

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                <div className='lg:col-span-2 space-y-6'>
                    <WidgetRenderer widgets={getWidgets('admin-knowledgebase-article-edit', 'before-content')} />
                    <Tabs defaultValue='content' className='w-full'>
                        <div className='flex items-center justify-between bg-card/40 backdrop-blur-md p-2 rounded-2xl shadow-sm mb-6'>
                            <TabsList className='bg-transparent h-10'>
                                <TabsTrigger
                                    value='content'
                                    className='rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary'
                                >
                                    <FileText className='h-4 w-4 mr-2' />
                                    {t('admin.knowledgebase.edit.tabs.content')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value='attachments'
                                    className='rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary'
                                >
                                    <Paperclip className='h-4 w-4 mr-2' />
                                    {t('admin.knowledgebase.edit.tabs.attachments')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value='tags'
                                    className='rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary'
                                >
                                    <Tags className='h-4 w-4 mr-2' />
                                    {t('admin.knowledgebase.edit.tabs.tags')}
                                </TabsTrigger>
                            </TabsList>

                            <div className='h-10 px-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='rounded-xl h-full'
                                    onClick={() => setPreviewMode(!previewMode)}
                                >
                                    {previewMode ? (
                                        <>
                                            <Pencil className='h-4 w-4 mr-2' />{' '}
                                            {t('admin.knowledgebase.articles.form.edit')}
                                        </>
                                    ) : (
                                        <>
                                            <Eye className='h-4 w-4 mr-2' />{' '}
                                            {t('admin.knowledgebase.articles.form.preview')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <TabsContent value='content' className='m-0 border-none p-0 outline-none'>
                            <div className='bg-card/40 backdrop-blur-md p-6 rounded-2xl shadow-sm space-y-4'>
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
                                    <div className='prose prose-invert max-w-none min-h-[400px] p-6 rounded-2xl bg-muted/30 border border-border/50'>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ children }) => (
                                                    <p className='leading-relaxed mb-4 text-muted-foreground/90'>{children}</p>
                                                ),
                                                code: ({ children }) => (
                                                    <code className='bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-sm'>
                                                        {children}
                                                    </code>
                                                ),
                                                pre: ({ children }) => (
                                                    <pre className='bg-muted/50 p-4 rounded-xl border border-border/50 overflow-x-auto my-6'>
                                                        {children}
                                                    </pre>
                                                ),
                                                blockquote: ({ children }) => (
                                                    <blockquote className='border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-6'>
                                                        {children}
                                                    </blockquote>
                                                ),
                                                img: ({ node, ...props }) => (
                                                    <img
                                                        {...props}
                                                        alt={props.alt || ''}
                                                        className='rounded-xl border border-border/50 shadow-md my-8 mx-auto block max-w-full'
                                                    />
                                                ),
                                                a: ({ node, href, children, ...props }) => {
                                                    if (href && /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(href)) {
                                                        return (
                                                            <img
                                                                src={href}
                                                                alt={typeof children === 'string' ? children : ''}
                                                                className='rounded-xl border border-border/50 shadow-md my-8 mx-auto block max-w-full'
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <a {...props} href={href} className='text-primary hover:underline font-medium'>
                                                            {children}
                                                        </a>
                                                    );
                                                },
                                                table: ({ children }) => (
                                                    <div className='overflow-x-auto my-6'>
                                                        <table className='w-full border-collapse text-sm'>{children}</table>
                                                    </div>
                                                ),
                                                thead: ({ children }) => (
                                                    <thead className='bg-muted/50'>{children}</thead>
                                                ),
                                                tbody: ({ children }) => (
                                                    <tbody className='divide-y divide-border/50'>{children}</tbody>
                                                ),
                                                tr: ({ children }) => (
                                                    <tr className='border-b border-border/50 hover:bg-muted/30 transition-colors'>{children}</tr>
                                                ),
                                                th: ({ children }) => (
                                                    <th className='px-4 py-3 text-left font-semibold text-foreground border border-border/50'>{children}</th>
                                                ),
                                                td: ({ children }) => (
                                                    <td className='px-4 py-3 text-muted-foreground border border-border/50'>{children}</td>
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
                                        className='w-full min-h-[400px] p-6 rounded-2xl bg-muted/30 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm leading-relaxed resize-y'
                                        placeholder={t('admin.knowledgebase.articles.form.content')}
                                    />
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value='attachments' className='m-0 border-none p-0 outline-none'>
                            <div className='bg-card/40 backdrop-blur-md p-6 rounded-2xl shadow-sm space-y-6'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <h3 className='text-lg font-bold'>
                                            {t('admin.knowledgebase.edit.attachments.title')}
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            {t('admin.knowledgebase.edit.attachments.description')}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <div className='flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-xl border border-border/50'>
                                            <Checkbox
                                                id='user_downloadable'
                                                checked={userDownloadable}
                                                onCheckedChange={(val) => setUserDownloadable(!!val)}
                                            />
                                            <Label
                                                htmlFor='user_downloadable'
                                                className='text-xs font-medium cursor-pointer whitespace-nowrap'
                                            >
                                                {t('admin.knowledgebase.edit.attachments.make_downloadable')}
                                            </Label>
                                        </div>
                                        <Button
                                            variant='outline'
                                            onClick={() => attachmentInputRef.current?.click()}
                                            loading={uploadLoading}
                                        >
                                            <Plus className='h-4 w-4 mr-2' />
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
                                    <div className='p-12 border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center text-muted-foreground'>
                                        <Paperclip className='h-12 w-12 mb-4 opacity-20' />
                                        <p>{t('admin.knowledgebase.edit.attachments.no_attachments')}</p>
                                    </div>
                                ) : (
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                        {attachments.map((att) => (
                                            <div
                                                key={att.id}
                                                className='p-4 rounded-2xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-all group'
                                            >
                                                <div className='flex items-start justify-between gap-4'>
                                                    <div className='flex items-center gap-3 overflow-hidden'>
                                                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0'>
                                                            <Paperclip className='h-5 w-5 text-primary' />
                                                        </div>
                                                        <div className='overflow-hidden'>
                                                            <p className='text-sm font-semibold truncate'>
                                                                {att.file_name}
                                                            </p>
                                                            <p className='text-xs text-muted-foreground'>
                                                                {formatFileSize(att.file_size)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className='flex items-center gap-1 shrink-0'>
                                                        <Button
                                                            variant='outline'
                                                            size='icon'
                                                            className='h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity'
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
                                                            className='h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity'
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
                            <div className='bg-card/40 backdrop-blur-md p-6 rounded-2xl shadow-sm space-y-6'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <h3 className='text-lg font-bold'>
                                            {t('admin.knowledgebase.edit.tags.title')}
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            {t('admin.knowledgebase.help.attachments.description')}
                                        </p>
                                    </div>
                                    <Button variant='outline' onClick={() => setTagsDialogOpen(true)}>
                                        <Plus className='h-4 w-4 mr-2' />
                                        {t('admin.knowledgebase.edit.tags.add')}
                                    </Button>
                                </div>

                                {tags.length === 0 ? (
                                    <div className='p-12 border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center text-muted-foreground'>
                                        <Tags className='h-12 w-12 mb-4 opacity-20' />
                                        <p>{t('admin.knowledgebase.edit.tags.no_tags')}</p>
                                    </div>
                                ) : (
                                    <div className='flex flex-wrap gap-3'>
                                        {tags.map((tag) => (
                                            <div
                                                key={tag.id}
                                                className='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary group transition-all hover:pr-1'
                                            >
                                                <span className='text-sm font-medium'>{tag.tag_name}</span>
                                                <button
                                                    onClick={() => handleDeleteTag(tag.id)}
                                                    className='h-5 w-5 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100'
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

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
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
                    </div>
                </div>

                <div className='space-y-6'>
                    <div className='bg-card/40 backdrop-blur-md p-6 rounded-2xl shadow-sm space-y-6 overflow-hidden'>
                        <h3 className='font-bold text-lg mb-2'>{t('common.details')}</h3>

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

                        <div className='flex items-center gap-3 bg-muted/30 p-4 rounded-xl'>
                            <Checkbox
                                id='pinned'
                                checked={form.pinned === 'true'}
                                onCheckedChange={(val) => setForm({ ...form, pinned: val ? 'true' : 'false' })}
                            />
                            <Label htmlFor='pinned' className='text-sm font-medium leading-none cursor-pointer'>
                                {t('admin.knowledgebase.articles.form.pinned')}
                            </Label>
                        </div>

                        <div className='space-y-3 pt-2 border-t border-border/30'>
                            <Label>{t('admin.knowledgebase.articles.form.icon')}</Label>
                            <div className='flex items-center gap-4'>
                                <div className='h-20 w-20 rounded-2xl bg-primary/5 flex items-center justify-center overflow-hidden border border-border/50 shrink-0'>
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
                                        <ImageIcon className='h-8 w-8 text-muted-foreground/30' />
                                    )}
                                </div>
                                <div className='space-y-2 flex-1'>
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
                        <p className='text-sm text-muted-foreground leading-relaxed'>
                            {t('admin.knowledgebase.help.attachments.description')}
                        </p>
                    </PageCard>
                </div>
            </div>

            <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
                <DialogContent className='sm:max-w-[425px] rounded-3xl'>
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
                            className='h-12 rounded-xl focus-visible:ring-primary/20'
                        />
                        <p className='mt-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-center'>
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
