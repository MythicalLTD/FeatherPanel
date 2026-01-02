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

import { useState, useEffect } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Link as LinkIcon,
    Plus,
    Search,
    Eye,
    Pencil,
    Copy,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Hash,
    ExternalLink,
    Calendar,
} from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

interface RedirectLink {
    id: number;
    name: string;
    slug: string;
    url: string;
    created_at: string;
    updated_at: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export default function RedirectLinksPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [redirectLinks, setRedirectLinks] = useState<RedirectLink[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Pagination
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Drawer states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);

    // Selected items
    const [selectedLink, setSelectedLink] = useState<RedirectLink | null>(null);
    const [editingLink, setEditingLink] = useState<RedirectLink | null>(null);

    // Form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newLink, setNewLink] = useState({ name: '', slug: '', url: '' });
    const [manualSlugEdit, setManualSlugEdit] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

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

    // Fetch links
    useEffect(() => {
        const fetchLinks = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/redirect-links', {
                    params: {
                        page: pagination.page,
                        limit: pagination.pageSize,
                        search: debouncedSearchQuery || undefined,
                    },
                });

                setRedirectLinks(data.data.redirect_links || []);
                const apiPagination = data.data.pagination;
                setPagination({
                    page: apiPagination.current_page,
                    pageSize: apiPagination.per_page,
                    total: apiPagination.total_records,
                    totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                });
            } catch (error) {
                console.error('Error fetching redirect links:', error);
                toast.error(t('admin.redirect_links.messages.fetch_failed'));
            } finally {
                setLoading(false);
            }
        };

        fetchLinks();
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, refreshKey, t]);

    // Auto-generate slug
    useEffect(() => {
        if (!manualSlugEdit && newLink.name) {
            const slug = newLink.name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');
            setNewLink((prev) => ({ ...prev, slug }));
        }
    }, [newLink.name, manualSlugEdit]);

    // CRUD Operations
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/api/admin/redirect-links', newLink);
            toast.success(t('admin.redirect_links.messages.created'));
            setCreateOpen(false);
            setNewLink({ name: '', slug: '', url: '' });
            setManualSlugEdit(false);
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error creating link:', error);
            let msg = t('admin.redirect_links.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLink) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/admin/redirect-links/${editingLink.id}`, editingLink);
            toast.success(t('admin.redirect_links.messages.updated'));
            setEditOpen(false);
            setEditingLink(null);
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error updating link:', error);
            let msg = t('admin.redirect_links.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (link: RedirectLink) => {
        if (!confirm(t('admin.redirect_links.messages.delete_confirm'))) return;
        try {
            await axios.delete(`/api/admin/redirect-links/${link.id}`);
            toast.success(t('admin.redirect_links.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting link:', error);
            toast.error(t('admin.redirect_links.messages.delete_failed'));
        }
    };

    const getShortUrl = (slug: string) => {
        if (typeof window === 'undefined') return '';
        return `${window.location.origin}/${slug}`;
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.redirect_links.title')}
                description={t('admin.redirect_links.subtitle')}
                icon={LinkIcon}
                actions={
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.redirect_links.create')}
                    </Button>
                }
            />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.redirect_links.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={5} />
            ) : redirectLinks.length === 0 ? (
                <EmptyState
                    icon={LinkIcon}
                    title={t('admin.redirect_links.no_results')}
                    description={t('admin.redirect_links.search_placeholder')}
                    action={<Button onClick={() => setCreateOpen(true)}>{t('admin.redirect_links.create')}</Button>}
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {redirectLinks.map((link) => (
                        <ResourceCard
                            key={link.id}
                            title={link.name}
                            subtitle={
                                <div className='flex items-center gap-2 text-xs'>
                                    <Calendar className='h-3 w-3' />
                                    {new Date(link.created_at).toLocaleDateString()}
                                </div>
                            }
                            icon={LinkIcon}
                            badges={[
                                {
                                    label: `/${link.slug}`,
                                    className:
                                        'bg-green-500/10 text-green-600 border-green-500/20 font-mono tracking-tight',
                                },
                                {
                                    label: new URL(link.url).hostname,
                                    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                },
                            ]}
                            description={
                                <div className='flex flex-col gap-1 mt-2 text-sm text-muted-foreground'>
                                    <div className='flex items-center gap-2 truncate'>
                                        <Hash className='h-3 w-3 shrink-0 opacity-50' />
                                        <a
                                            href={getShortUrl(link.slug)}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='hover:underline hover:text-foreground transition-colors truncate'
                                        >
                                            {getShortUrl(link.slug)}
                                        </a>
                                    </div>
                                    <div className='flex items-center gap-2 truncate'>
                                        <ExternalLink className='h-3 w-3 shrink-0 opacity-50' />
                                        <a
                                            href={link.url}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='hover:underline hover:text-foreground transition-colors truncate'
                                        >
                                            {link.url}
                                        </a>
                                    </div>
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => {
                                            setSelectedLink(link);
                                            setViewOpen(true);
                                        }}
                                    >
                                        <Eye className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => {
                                            setEditingLink({ ...link });
                                            setEditOpen(true);
                                        }}
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => copyToClipboard(getShortUrl(link.slug))}
                                    >
                                        <Copy className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => handleDelete(link)}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        />
                    ))}
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
                    <span className='text-sm font-medium'>
                        {pagination.page} / {pagination.totalPages}
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

            {/* Help Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-6'>
                <PageCard title={t('admin.redirect_links.help.what_is.title')} icon={LinkIcon}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.redirect_links.help.what_is.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.redirect_links.help.nice_pages.title')} icon={Hash}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.redirect_links.help.nice_pages.description')}
                    </p>
                </PageCard>
            </div>

            {/* Create Sheet */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.redirect_links.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.redirect_links.form.create_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.redirect_links.form.name')}</Label>
                            <Input
                                value={newLink.name}
                                onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.redirect_links.form.slug')}</Label>
                            <Input
                                value={newLink.slug}
                                onChange={(e) => {
                                    setNewLink({ ...newLink, slug: e.target.value });
                                    setManualSlugEdit(true);
                                }}
                                placeholder={t('admin.redirect_links.form.slug_placeholder')}
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.redirect_links.form.slug_help')}</p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.redirect_links.form.url')}</Label>
                            <Input
                                value={newLink.url}
                                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                                placeholder={t('admin.redirect_links.form.url_placeholder')}
                                required
                            />
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('admin.redirect_links.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            {/* Edit Sheet */}
            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.redirect_links.form.edit_title')}</SheetTitle>
                        <SheetDescription>{t('admin.redirect_links.form.edit_description')}</SheetDescription>
                    </SheetHeader>
                    {editingLink && (
                        <form onSubmit={handleUpdate} className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.redirect_links.form.name')}</Label>
                                <Input
                                    value={editingLink.name}
                                    onChange={(e) => setEditingLink({ ...editingLink, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.redirect_links.form.slug')}</Label>
                                <Input
                                    value={editingLink.slug}
                                    onChange={(e) => setEditingLink({ ...editingLink, slug: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.redirect_links.form.url')}</Label>
                                <Input
                                    value={editingLink.url}
                                    onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                                    required
                                />
                            </div>
                            <SheetFooter>
                                <Button type='submit' loading={isSubmitting}>
                                    {t('admin.redirect_links.form.submit_update')}
                                </Button>
                            </SheetFooter>
                        </form>
                    )}
                </div>
            </Sheet>

            {/* View Sheet */}
            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.redirect_links.form.view_title')}</SheetTitle>
                    </SheetHeader>
                    {selectedLink && (
                        <div className='space-y-6'>
                            <div className='space-y-1'>
                                <Label className='text-xs uppercase text-muted-foreground'>
                                    {t('admin.redirect_links.form.name')}
                                </Label>
                                <div className='font-medium'>{selectedLink.name}</div>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-xs uppercase text-muted-foreground'>
                                    {t('admin.redirect_links.form.slug')}
                                </Label>
                                <a
                                    href={getShortUrl(selectedLink.slug)}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='text-green-600 block break-all font-mono text-sm'
                                >
                                    {getShortUrl(selectedLink.slug)}
                                </a>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-xs uppercase text-muted-foreground'>
                                    {t('admin.redirect_links.form.url')}
                                </Label>
                                <a
                                    href={selectedLink.url}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='text-blue-600 block break-all text-sm'
                                >
                                    {selectedLink.url}
                                </a>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs uppercase text-muted-foreground'>
                                        {t('admin.redirect_links.table.created_at')}
                                    </Label>
                                    <div className='text-sm text-muted-foreground'>
                                        {new Date(selectedLink.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs uppercase text-muted-foreground'>Updated</Label>
                                    <div className='text-sm text-muted-foreground'>
                                        {new Date(selectedLink.updated_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Sheet>
        </div>
    );
}
