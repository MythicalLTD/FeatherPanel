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
import { Textarea } from '@/components/featherui/Textarea';
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
import axios from 'axios';
import { toast } from 'sonner';

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

export default function MailTemplatesPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<MailTemplate[]>([]);
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

    // Sheet states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [massEmailOpen, setMassEmailOpen] = useState(false);

    // Selected content
    const [selectedTemplate, setSelectedTemplate] = useState<MailTemplate | null>(null);
    const [formData, setFormData] = useState({ name: '', subject: '', body: '' });
    const [massEmailData, setMassEmailData] = useState({ subject: '', body: '' });

    // Action states
    const [processing, setProcessing] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/mail-templates', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: searchQuery || undefined,
                },
            });
            if (data.success) {
                setTemplates(data.data.templates || []);
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
                toast.error(data.message || t('admin.mail_templates.messages.fetch_failed'));
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error(t('admin.mail_templates.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, searchQuery, t]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const { data } = await axios.post('/api/admin/mail-templates', formData);
            if (data.success) {
                toast.success(t('admin.mail_templates.messages.created'));
                setCreateOpen(false);
                setFormData({ name: '', subject: '', body: '' });
                fetchTemplates();
            } else {
                toast.error(data.message || t('admin.mail_templates.messages.create_failed'));
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : t('admin.mail_templates.messages.create_failed');
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
                toast.success(t('admin.mail_templates.messages.updated'));
                setEditOpen(false);
                setSelectedTemplate(null);
                setFormData({ name: '', subject: '', body: '' });
                fetchTemplates();
            } else {
                toast.error(data.message || t('admin.mail_templates.messages.update_failed'));
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : t('admin.mail_templates.messages.update_failed');
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
                fetchTemplates();
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
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.mail_templates.title')}
                description={t('admin.mail_templates.subtitle')}
                icon={Mail}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={() => setMassEmailOpen(true)}>
                            <Send className='w-4 h-4 mr-2' />
                            {t('admin.mail_templates.send_mass_email')}
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className='w-4 h-4 mr-2' />
                            {t('admin.mail_templates.create')}
                        </Button>
                    </div>
                }
            />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        className='pl-10 h-11 w-full'
                        placeholder={t('admin.mail_templates.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

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
                                            title='Preview'
                                            onClick={() => openPreview(template)}
                                        >
                                            <Eye className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title='Edit'
                                            onClick={() => openEdit(template)}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title='Delete'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(template.id)}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                                description={
                                    <div className='flex flex-col gap-1 mt-2 text-sm text-muted-foreground'>
                                        <div className='flex items-center gap-2 truncate'>
                                            <FileText className='h-3 w-3 shrink-0 opacity-50' />
                                            <span className='truncate opacity-70 italic'>
                                                {template.body.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                            </span>
                                        </div>
                                    </div>
                                }
                            />
                        ))}
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
                </>
            ) : (
                <EmptyState
                    title={t('admin.mail_templates.no_results')}
                    description={t('admin.mail_templates.subtitle')}
                    icon={Mail}
                />
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-border/50'>
                <PageCard title={t('admin.mail_templates.help.what_is.title')} icon={FileText}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.mail_templates.help.what_is.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.mail_templates.help.mass_email.title')} icon={Send}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.mail_templates.help.mass_email.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.mail_templates.help.legal.title')} icon={Scale}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.mail_templates.help.legal.description')}
                    </p>
                </PageCard>
            </div>

            {/* Create Sheet */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.mail_templates.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.mail_templates.form.create_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='space-y-4 pt-6'>
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
                            <Textarea
                                id='create-body'
                                className='min-h-[400px] font-mono text-xs'
                                value={formData.body}
                                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                required
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.mail_templates.form.html_help')}</p>
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={processing}>
                                {t('admin.mail_templates.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            {/* Edit Sheet */}
            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>
                            {String(t('admin.mail_templates.form.edit_title', { name: selectedTemplate?.name || '' }))}
                        </SheetTitle>
                        <SheetDescription>
                            {String(
                                t('admin.mail_templates.form.edit_description', { name: selectedTemplate?.name || '' }),
                            )}
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleUpdate} className='space-y-4 pt-6'>
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
                            <Textarea
                                id='edit-body'
                                className='min-h-[400px] font-mono text-xs'
                                value={formData.body}
                                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                required
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.mail_templates.form.html_help')}</p>
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={processing}>
                                {t('admin.mail_templates.form.submit_update')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            {/* Preview Sheet */}
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
                                <Label className='text-muted-foreground text-xs uppercase tracking-wider font-bold'>
                                    {t('admin.mail_templates.form.subject')}
                                </Label>
                                <p className='text-base font-semibold'>{selectedTemplate?.subject}</p>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs uppercase tracking-wider font-bold'>
                                    {t('admin.mail_templates.form.body')}
                                </Label>
                                <div className='rounded-xl border border-border/50 bg-white dark:bg-zinc-950 overflow-hidden min-h-[400px]'>
                                    <div
                                        className='p-6 prose prose-sm dark:prose-invert max-w-none'
                                        dangerouslySetInnerHTML={{ __html: selectedTemplate?.body || '' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <SheetFooter>
                            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                        </SheetFooter>
                    </div>
                </div>
            </Sheet>

            {/* Mass Email Sheet */}
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
                                <Textarea
                                    id='mass-body'
                                    className='min-h-[400px] font-mono text-xs'
                                    value={massEmailData.body}
                                    onChange={(e) => setMassEmailData({ ...massEmailData, body: e.target.value })}
                                    required
                                />
                                <p className='text-xs text-muted-foreground'>
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
        </div>
    );
}
