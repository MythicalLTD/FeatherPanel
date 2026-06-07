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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Label } from '@/components/ui/label';
import { FeatherIDE } from '@/components/featherui/FeatherIDE';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import {
    Plus,
    Search,
    Eye,
    Pencil,
    Trash2,
    Mail,
    FileText,
    Send,
    Scale,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Calendar,
} from 'lucide-react';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface MailTemplate {
    id: number;
    name: string;
    subject: string;
    body: string;
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

const MAIL_TEMPLATES_LIST_FILTERS_KEY = 'featherpanel_admin_mail_templates_filters_v1';
const MAIL_TEMPLATES_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    page: 1,
    pageSize: 10,
};

export default function MailTemplatesPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<MailTemplate[]>([]);
    const { filters, patchFilters, hydrated } = usePersistedListFilters(
        MAIL_TEMPLATES_LIST_FILTERS_KEY,
        MAIL_TEMPLATES_LIST_FILTERS_DEFAULTS,
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
    const [previewOpen, setPreviewOpen] = useState(false);
    const [massEmailOpen, setMassEmailOpen] = useState(false);
    const [testEmailOpen, setTestEmailOpen] = useState(false);

    const [selectedTemplate, setSelectedTemplate] = useState<MailTemplate | null>(null);
    const [formData, setFormData] = useState({ name: '', subject: '', body: '' });
    const [massEmailData, setMassEmailData] = useState({ subject: '', body: '' });
    const [testEmailData, setTestEmailData] = useState({ email: '', subject: '', body: '' });

    const [processing, setProcessing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-mail-templates');

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

    const fetchTemplates = useCallback(async () => {
        if (!hydrated) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/mail-templates', {
                params: {
                    page,
                    limit: pageSize,
                    search: debouncedSearchQuery || undefined,
                },
            });
            if (data.success) {
                setTemplates(data.data.templates || []);
                const apiPag = data.data.pagination;
                setPagination({
                    total: apiPag.total_records,
                    hasNext: apiPag.has_next,
                    hasPrev: apiPag.has_prev,
                    from: apiPag.from,
                    to: apiPag.to,
                });
            } else {
                toast.error(data.message || t('admin.mail_templates.messages.fetch_failed'));
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error(t('admin.mail_templates.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearchQuery, t, hydrated]);

    useEffect(() => {
        fetchTemplates();
        fetchWidgets();
    }, [fetchTemplates, refreshKey, fetchWidgets]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const { data } = await axios.post('/api/admin/mail-templates', formData);
            if (data.success) {
                setRefreshKey((prev) => prev + 1);
            } else {
                toast.error(data.message || t('admin.mail_templates.messages.create_failed'));
            }
        } catch (error: unknown) {
            let message = t('admin.mail_templates.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                message = error.response.data.message;
            }
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate) return;
        setProcessing(true);
        try {
            const { data } = await axios.patch(`/api/admin/mail-templates/${selectedTemplate.id}`, formData);
            if (data.success) {
                setRefreshKey((prev) => prev + 1);
            } else {
                toast.error(data.message || t('admin.mail_templates.messages.update_failed'));
            }
        } catch (error: unknown) {
            let message = t('admin.mail_templates.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                message = error.response.data.message;
            }
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.mail_templates.messages.delete_confirm'))) return;
        try {
            const { data } = await axios.delete(`/api/admin/mail-templates/${id}`);
            if (data.success) {
                toast.success(t('admin.mail_templates.messages.deleted'));
                setRefreshKey((prev) => prev + 1);
            } else {
                toast.error(data.message || t('admin.mail_templates.messages.delete_failed'));
            }
        } catch {
            toast.error(t('admin.mail_templates.messages.delete_failed'));
        }
    };

    const handleSendMassEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const { data } = await axios.post('/api/admin/mail-templates/mass-email', massEmailData);
            if (data.success) {
                toast.success(t('admin.mail_templates.messages.mass_email_queued', { count: data.data.queued_count }));
                setMassEmailOpen(false);
                setMassEmailData({ subject: '', body: '' });
            } else {
                toast.error(data.message || t('admin.mail_templates.messages.mass_email_failed'));
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : t('admin.mail_templates.messages.mass_email_failed');
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const { data } = await axios.post('/api/admin/mail-templates/test-email', testEmailData);
            if (data.success) {
                toast.success(t('admin.mail_templates.messages.test_email_sent'));
                setTestEmailOpen(false);
                setTestEmailData({ email: '', subject: '', body: '' });
            } else {
                toast.error(data.message || t('admin.mail_templates.messages.test_email_failed'));
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : t('admin.mail_templates.messages.test_email_failed');
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const openCreate = () => {
        setSelectedTemplate(null);
        setFormData({ name: '', subject: '', body: '' });
        setCreateOpen(true);
    };

    const openEdit = (template: MailTemplate) => {
        setSelectedTemplate(template);
        setFormData({ name: template.name, subject: template.subject, body: template.body });
        setEditOpen(true);
    };

    const openPreview = (template: MailTemplate) => {
        setSelectedTemplate(template);
        setPreviewOpen(true);
    };

    return (
        <div className='animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500'>
            <WidgetRenderer widgets={getWidgets('admin-mail-templates', 'top-of-page')} />
            <PageHeader
                title={t('admin.mail_templates.title')}
                description={t('admin.mail_templates.subtitle')}
                icon={Mail}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={() => setTestEmailOpen(true)}>
                            <Mail className='mr-2 h-4 w-4' />
                            {t('admin.mail_templates.send_test_email')}
                        </Button>
                        <Button variant='outline' onClick={() => setMassEmailOpen(true)}>
                            <Send className='mr-2 h-4 w-4' />
                            {t('admin.mail_templates.send_mass_email')}
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.mail_templates.create')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-mail-templates', 'after-header')} />

            <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        className='h-11 w-full pl-10'
                        placeholder={t('admin.mail_templates.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-mail-templates', 'before-list')} />

            {pagination.total > pageSize && !loading && (
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

            {loading ? (
                <TableSkeleton count={5} />
            ) : templates.length > 0 ? (
                <>
                    <div className='grid grid-cols-1 gap-4'>
                        {templates.map((template) => (
                            <ResourceCard
                                key={template.id}
                                title={template.name}
                                subtitle={
                                    <div className='flex items-center gap-2 text-xs'>
                                        <Calendar className='h-3 w-3' />
                                        {new Date(template.updated_at).toLocaleDateString()}
                                    </div>
                                }
                                icon={Mail}
                                badges={[
                                    {
                                        label: template.subject,
                                        className: 'bg-primary/10 text-primary border-primary/20',
                                    },
                                ]}
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title={t('common.preview')}
                                            onClick={() => openPreview(template)}
                                        >
                                            <Eye className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title={t('common.edit')}
                                            onClick={() => openEdit(template)}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title={t('common.delete')}
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(template.id)}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                                description={
                                    <div className='text-muted-foreground mt-2 flex flex-col gap-1 text-sm'>
                                        <div className='flex items-center gap-2 truncate'>
                                            <FileText className='h-3 w-3 shrink-0 opacity-50' />
                                            <span className='truncate italic opacity-70'>
                                                {template.body.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                            </span>
                                        </div>
                                    </div>
                                }
                            />
                        ))}
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
                </>
            ) : (
                <EmptyState
                    title={t('admin.mail_templates.no_results')}
                    description={t('admin.mail_templates.subtitle')}
                    icon={Mail}
                    action={
                        <Button onClick={openCreate}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.mail_templates.create')}
                        </Button>
                    }
                />
            )}

            <div className='border-border/50 grid grid-cols-1 gap-6 border-t pt-6 md:grid-cols-2 lg:grid-cols-3'>
                <PageCard title={t('admin.mail_templates.help.what_is.title')} icon={FileText}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.mail_templates.help.what_is.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.mail_templates.help.mass_email.title')} icon={Send}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.mail_templates.help.mass_email.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.mail_templates.help.legal.title')} icon={Scale}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.mail_templates.help.legal.description')}
                    </p>
                </PageCard>
            </div>

            <Sheet open={createOpen} onOpenChange={setCreateOpen} className='max-w-7xl'>
                <div className='flex h-full flex-col space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.mail_templates.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.mail_templates.form.create_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='flex flex-1 flex-col gap-6 overflow-hidden'>
                        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 lg:overflow-hidden'>
                            <div className='space-y-6 lg:overflow-y-auto lg:pr-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='create-name'>{t('admin.mail_templates.form.name')}</Label>
                                    <Input
                                        id='create-name'
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='create-subject'>{t('admin.mail_templates.form.subject')}</Label>
                                    <Input
                                        id='create-subject'
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='create-body'>{t('admin.mail_templates.form.body')}</Label>
                                    <FeatherIDE
                                        height='600px'
                                        defaultLanguage='html'
                                        value={formData.body}
                                        onChange={(value) => setFormData({ ...formData, body: value || '' })}
                                        title={t('admin.mail_templates.form.editor')}
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.mail_templates.form.html_help')}
                                    </p>
                                </div>
                            </div>
                            <div className='flex flex-col space-y-2 lg:overflow-hidden'>
                                <Label>
                                    {t('admin.mail_templates.form.preview_title', {
                                        name: formData.name || 'Template',
                                    })}
                                </Label>
                                <div className='border-border/50 relative flex-1 overflow-hidden rounded-2xl border bg-white shadow-xl'>
                                    <iframe
                                        srcDoc={formData.body}
                                        className='h-full w-full border-none'
                                        title={t('admin.mail_templates.form.live_preview')}
                                    />
                                </div>
                            </div>
                        </div>
                        <SheetFooter className='mt-0 pt-4'>
                            <Button type='submit' loading={processing}>
                                {t('admin.mail_templates.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={editOpen} onOpenChange={setEditOpen} className='max-w-7xl'>
                <div className='flex h-full flex-col space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.mail_templates.form.edit_title')}</SheetTitle>
                        <SheetDescription>{t('admin.mail_templates.form.edit_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleUpdate} className='flex flex-1 flex-col gap-6 overflow-hidden'>
                        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 lg:overflow-hidden'>
                            <div className='space-y-6 lg:overflow-y-auto lg:pr-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='edit-name'>{t('admin.mail_templates.form.name')}</Label>
                                    <Input
                                        id='edit-name'
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='edit-subject'>{t('admin.mail_templates.form.subject')}</Label>
                                    <Input
                                        id='edit-subject'
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='edit-body'>{t('admin.mail_templates.form.body')}</Label>
                                    <FeatherIDE
                                        height='600px'
                                        defaultLanguage='html'
                                        value={formData.body}
                                        onChange={(value) => setFormData({ ...formData, body: value || '' })}
                                        title={t('admin.mail_templates.form.editor')}
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.mail_templates.form.html_help')}
                                    </p>
                                </div>
                            </div>
                            <div className='flex flex-col space-y-2 lg:overflow-hidden'>
                                <Label>
                                    {t('admin.mail_templates.form.preview_title', {
                                        name: formData.name || 'Template',
                                    })}
                                </Label>
                                <div className='border-border/50 relative flex-1 overflow-hidden rounded-2xl border bg-white shadow-xl'>
                                    <iframe
                                        srcDoc={formData.body}
                                        className='h-full w-full border-none'
                                        title={t('admin.mail_templates.form.live_preview')}
                                    />
                                </div>
                            </div>
                        </div>
                        <SheetFooter className='mt-0 pt-4'>
                            <Button type='submit' loading={processing}>
                                {t('admin.mail_templates.form.submit_update')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>
                            {String(
                                t('admin.mail_templates.form.preview_title', { name: selectedTemplate?.name || '' }),
                            )}
                        </SheetTitle>
                        <SheetDescription>
                            {String(
                                t('admin.mail_templates.form.preview_description', {
                                    name: selectedTemplate?.name || '',
                                }),
                            )}
                        </SheetDescription>
                    </SheetHeader>
                    <div className='space-y-6 pt-6'>
                        <div className='space-y-4'>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                    {t('admin.mail_templates.form.subject')}
                                </Label>
                                <p className='text-base font-semibold'>{selectedTemplate?.subject}</p>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                    {t('admin.mail_templates.form.body')}
                                </Label>
                                <div className='border-border/50 min-h-[400px] overflow-hidden rounded-xl border bg-white dark:bg-zinc-950'>
                                    <div
                                        className='prose prose-sm dark:prose-invert max-w-none p-6'
                                        dangerouslySetInnerHTML={{ __html: selectedTemplate?.body || '' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <SheetFooter>
                            <Button onClick={() => setPreviewOpen(false)}>{t('common.close')}</Button>
                        </SheetFooter>
                    </div>
                </div>
            </Sheet>

            <Sheet open={massEmailOpen} onOpenChange={setMassEmailOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.mail_templates.form.mass_email_title')}</SheetTitle>
                        <SheetDescription>{t('admin.mail_templates.form.mass_email_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSendMassEmail} className='space-y-4 pt-6'>
                        <div className='space-y-4'>
                            <Alert variant='destructive' className='bg-destructive/5 border-destructive/20'>
                                <AlertTriangle className='h-4 w-4' />
                                <AlertTitle>{t('admin.mail_templates.messages.mass_email_warning_title')}</AlertTitle>
                                <AlertDescription>
                                    {t('admin.mail_templates.messages.mass_email_warning')}
                                </AlertDescription>
                            </Alert>
                            <div className='space-y-2'>
                                <Label htmlFor='mass-subject'>{t('admin.mail_templates.form.subject')}</Label>
                                <Input
                                    id='mass-subject'
                                    value={massEmailData.subject}
                                    onChange={(e) => setMassEmailData({ ...massEmailData, subject: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='mass-body'>{t('admin.mail_templates.form.body')}</Label>
                                <FeatherIDE
                                    height='400px'
                                    defaultLanguage='html'
                                    value={massEmailData.body}
                                    onChange={(value) => setMassEmailData({ ...massEmailData, body: value || '' })}
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.mail_templates.form.html_help')}
                                </p>
                            </div>
                        </div>
                        <SheetFooter>
                            <Button type='submit' variant='destructive' loading={processing}>
                                {t('admin.mail_templates.form.send')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={testEmailOpen} onOpenChange={setTestEmailOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.mail_templates.form.test_email_title')}</SheetTitle>
                        <SheetDescription>{t('admin.mail_templates.form.test_email_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSendTestEmail} className='space-y-4 pt-6'>
                        <div className='space-y-4'>
                            <Alert className='bg-primary/5 border-primary/20'>
                                <Mail className='h-4 w-4' />
                                <AlertTitle>{t('admin.mail_templates.messages.test_email_info_title')}</AlertTitle>
                                <AlertDescription>
                                    {t('admin.mail_templates.messages.test_email_info')}
                                </AlertDescription>
                            </Alert>
                            <div className='space-y-2'>
                                <Label htmlFor='test-email'>{t('admin.mail_templates.form.test_email_address')}</Label>
                                <Input
                                    id='test-email'
                                    type='email'
                                    placeholder='admin@example.com'
                                    value={testEmailData.email}
                                    onChange={(e) => setTestEmailData({ ...testEmailData, email: e.target.value })}
                                    required
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.mail_templates.form.test_email_help')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='test-subject'>{t('admin.mail_templates.form.subject')}</Label>
                                <Input
                                    id='test-subject'
                                    value={testEmailData.subject}
                                    onChange={(e) => setTestEmailData({ ...testEmailData, subject: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='test-body'>{t('admin.mail_templates.form.body')}</Label>
                                <FeatherIDE
                                    height='300px'
                                    defaultLanguage='html'
                                    value={testEmailData.body}
                                    onChange={(value) => setTestEmailData({ ...testEmailData, body: value || '' })}
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.mail_templates.form.html_help')}
                                </p>
                            </div>
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={processing}>
                                <Mail className='mr-2 h-4 w-4' />
                                {t('admin.mail_templates.form.send_test')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>
            <WidgetRenderer widgets={getWidgets('admin-mail-templates', 'bottom-of-page')} />
        </div>
    );
}
