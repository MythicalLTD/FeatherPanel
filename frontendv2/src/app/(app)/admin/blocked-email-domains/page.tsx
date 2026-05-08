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

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import {
    Loader2,
    Plus,
    Trash2,
    RefreshCw,
    Upload,
    MailX,
    ShieldCheck,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface BlockedRow {
    id: number;
    domain: string;
    source: string;
    created_at: string | null;
}

interface ListResponse {
    domains: BlockedRow[];
    pagination: {
        current_page: number;
        per_page: number;
        total_records: number;
        total_pages: number;
    };
    blocking_enabled: string;
    preset_source_path: string;
}

type ImportResult = { inserted: number; skipped_lines: number };

const WIDGET_PAGE = 'admin-blocked-email-domains';
const SEARCH_DEBOUNCE_MS = 320;
const ROWS_PER_PAGE = 50;

function axiosApiMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && err.response.data) {
        const msg = (err.response.data as { message?: string }).message;
        if (typeof msg === 'string' && msg.trim()) {
            return msg;
        }
    }
    return fallback;
}

function formatAddedAt(iso: string | null): string {
    if (!iso) {
        return '—';
    }
    try {
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

export default function BlockedEmailDomainsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<BlockedRow[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searchPending, setSearchPending] = useState(false);
    const [blockingEnabled, setBlockingEnabled] = useState(false);
    const [toggleSaving, setToggleSaving] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [adding, setAdding] = useState(false);

    const [importOpen, setImportOpen] = useState(false);
    const [importTab, setImportTab] = useState('preset');
    const [importUrl, setImportUrl] = useState('');
    const [importPaste, setImportPaste] = useState('');
    const [importBusy, setImportBusy] = useState(false);

    const [presetFile, setPresetFile] = useState('');
    const { fetchWidgets, getWidgets } = usePluginWidgets(WIDGET_PAGE);

    const limit = ROWS_PER_PAGE;

    useEffect(() => {
        fetchWidgets(WIDGET_PAGE);
    }, [fetchWidgets]);

    useEffect(() => {
        setSearchPending(searchInput.trim() !== debouncedSearch);
    }, [searchInput, debouncedSearch]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(handle);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    const load = useCallback(
        async (opts?: { page?: number; search?: string }) => {
            const effectivePage = opts?.page ?? page;
            const effectiveSearch = opts?.search ?? debouncedSearch;
            setLoading(true);
            try {
                const res = await axios.get<{ success: boolean; data?: ListResponse; message?: string }>(
                    '/api/admin/blocked-email-domains',
                    { params: { page: effectivePage, limit, search: effectiveSearch } },
                );
                if (res.data.success && res.data.data) {
                    setRows(res.data.data.domains);
                    const tp = Math.max(1, res.data.data.pagination.total_pages || 1);
                    setTotalPages(tp);
                    setTotal(res.data.data.pagination.total_records);
                    setBlockingEnabled(res.data.data.blocking_enabled === 'true');
                    setPresetFile(res.data.data.preset_source_path || '');
                } else {
                    toast.error(res.data.message || t('admin.blocked_email_domains.messages.load_failed'));
                }
            } catch {
                toast.error(t('admin.blocked_email_domains.messages.load_failed'));
            } finally {
                setLoading(false);
            }
        },
        [page, debouncedSearch, limit, t],
    );

    useEffect(() => {
        load();
    }, [load]);

    const sourceLabel = (source: string) => {
        if (source === 'manual') {
            return t('admin.blocked_email_domains.source_manual');
        }
        if (source === 'preset') {
            return t('admin.blocked_email_domains.source_preset');
        }
        if (source === 'import') {
            return t('admin.blocked_email_domains.source_import');
        }
        return source;
    };

    const sourceBadgeClass = (source: string) => {
        if (source === 'manual') {
            return 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300';
        }
        if (source === 'preset') {
            return 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300';
        }
        if (source === 'import') {
            return 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200';
        }
        return 'border-border bg-muted text-muted-foreground';
    };

    const refreshAfterImport = async (result: ImportResult, closeDialog: boolean) => {
        toast.success(
            t('admin.blocked_email_domains.messages.import_done', {
                inserted: String(result.inserted),
                skipped: String(result.skipped_lines),
            }),
        );
        setPage(1);
        await load({ page: 1, search: debouncedSearch });
        if (closeDialog) {
            setImportOpen(false);
            setImportUrl('');
            setImportPaste('');
        }
    };

    const handleToggleBlocking = async () => {
        setToggleSaving(true);
        const next = !blockingEnabled;
        try {
            const res = await axios.patch<{ success: boolean; message?: string }>('/api/admin/settings', {
                email_domain_blocking_enabled: next ? 'true' : 'false',
            });
            if (res.data.success) {
                setBlockingEnabled(next);
                toast.success(
                    next
                        ? t('admin.blocked_email_domains.messages.blocking_on')
                        : t('admin.blocked_email_domains.messages.blocking_off'),
                );
            } else {
                toast.error(res.data.message || t('admin.blocked_email_domains.messages.toggle_failed'));
            }
        } catch {
            toast.error(t('admin.blocked_email_domains.messages.toggle_failed'));
        } finally {
            setToggleSaving(false);
        }
    };

    const handleAdd = async () => {
        const v = newDomain.trim();
        if (!v) {
            return;
        }
        setAdding(true);
        try {
            const res = await axios.put<{ success: boolean; message?: string }>('/api/admin/blocked-email-domains', {
                domain: v,
            });
            if (res.data.success) {
                toast.success(t('admin.blocked_email_domains.messages.added'));
                setNewDomain('');
                setPage(1);
                await load({ page: 1, search: debouncedSearch });
            } else {
                toast.error(res.data.message || t('admin.blocked_email_domains.messages.add_failed'));
            }
        } catch (e: unknown) {
            toast.error(axiosApiMessage(e, t('admin.blocked_email_domains.messages.add_failed')));
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: number, domain: string) => {
        if (!confirm(t('admin.blocked_email_domains.confirm_delete', { domain }))) {
            return;
        }
        try {
            const res = await axios.delete<{ success: boolean; message?: string }>(
                `/api/admin/blocked-email-domains/${id}`,
            );
            if (res.data.success) {
                toast.success(t('admin.blocked_email_domains.messages.deleted'));
                await load();
            } else {
                toast.error(res.data.message || t('admin.blocked_email_domains.messages.delete_failed'));
            }
        } catch {
            toast.error(t('admin.blocked_email_domains.messages.delete_failed'));
        }
    };

    const handleImportPreset = async () => {
        if (
            !confirm(
                t('admin.blocked_email_domains.import_confirm', {
                    file: presetFile || 'domains list',
                }),
            )
        ) {
            return;
        }
        setImportBusy(true);
        try {
            const res = await axios.post<{ success: boolean; message?: string; data?: ImportResult }>(
                '/api/admin/blocked-email-domains/import-preset',
            );
            if (res.data.success && res.data.data) {
                await refreshAfterImport(res.data.data, true);
            } else {
                toast.error(res.data.message || t('admin.blocked_email_domains.messages.import_failed'));
            }
        } catch (e: unknown) {
            toast.error(axiosApiMessage(e, t('admin.blocked_email_domains.messages.import_failed')));
        } finally {
            setImportBusy(false);
        }
    };

    const handleImportUrl = async () => {
        const u = importUrl.trim();
        if (!u) {
            toast.error(t('admin.blocked_email_domains.import_url_required'));
            return;
        }
        setImportBusy(true);
        try {
            const res = await axios.post<{ success: boolean; message?: string; data?: ImportResult }>(
                '/api/admin/blocked-email-domains/import-url',
                { url: u },
            );
            if (res.data.success && res.data.data) {
                await refreshAfterImport(res.data.data, true);
            } else {
                toast.error(res.data.message || t('admin.blocked_email_domains.messages.import_url_failed'));
            }
        } catch (e: unknown) {
            toast.error(axiosApiMessage(e, t('admin.blocked_email_domains.messages.import_url_failed')));
        } finally {
            setImportBusy(false);
        }
    };

    const handleImportPaste = async () => {
        const text = importPaste;
        if (!text.trim()) {
            toast.error(t('admin.blocked_email_domains.import_paste_required'));
            return;
        }
        setImportBusy(true);
        try {
            const res = await axios.post<{ success: boolean; message?: string; data?: ImportResult }>(
                '/api/admin/blocked-email-domains/import-text',
                { text },
            );
            if (res.data.success && res.data.data) {
                await refreshAfterImport(res.data.data, true);
            } else {
                toast.error(res.data.message || t('admin.blocked_email_domains.messages.import_text_failed'));
            }
        } catch (e: unknown) {
            toast.error(axiosApiMessage(e, t('admin.blocked_email_domains.messages.import_text_failed')));
        } finally {
            setImportBusy(false);
        }
    };

    const topWidgets = getWidgets(WIDGET_PAGE, 'top-of-page');
    const afterHeaderWidgets = getWidgets(WIDGET_PAGE, 'after-header');
    const beforeListWidgets = getWidgets(WIDGET_PAGE, 'before-list');
    const bottomWidgets = getWidgets(WIDGET_PAGE, 'bottom-of-page');

    const paginationBar = (
        <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 shadow-sm'>
            <Button
                variant='outline'
                size='sm'
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className='gap-1.5'
            >
                <ChevronLeft className='h-4 w-4' />
                {t('common.previous')}
            </Button>
            <span className='text-sm font-medium'>
                {t('admin.blocked_email_domains.pagination', {
                    total: String(total),
                    page: String(page),
                    pages: String(totalPages),
                })}
            </span>
            <Button
                variant='outline'
                size='sm'
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className='gap-1.5'
            >
                {t('common.next')}
                <ChevronRight className='h-4 w-4' />
            </Button>
        </div>
    );

    const isFilteredEmpty = !loading && rows.length === 0 && debouncedSearch.length > 0;
    const isTrulyEmpty = !loading && rows.length === 0 && debouncedSearch.length === 0;

    return (
        <div className='space-y-6'>
            {topWidgets.length > 0 ? <WidgetRenderer widgets={topWidgets} /> : null}

            <PageHeader
                title={t('admin.blocked_email_domains.title')}
                description={t('admin.blocked_email_domains.description')}
                icon={MailX}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button type='button' variant='outline' disabled={loading} onClick={() => load()}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {t('common.refresh')}
                        </Button>
                        <Button type='button' disabled={importBusy} onClick={() => setImportOpen(true)}>
                            <Upload className='mr-2 h-4 w-4' />
                            {t('admin.blocked_email_domains.import_bulk')}
                        </Button>
                    </div>
                }
            />

            {afterHeaderWidgets.length > 0 ? <WidgetRenderer widgets={afterHeaderWidgets} /> : null}

            <Dialog
                open={importOpen}
                onOpenChange={(open) => {
                    if (!open && importBusy) {
                        return;
                    }
                    setImportOpen(open);
                }}
                className='max-w-2xl'
            >
                <DialogHeader>
                    <DialogTitle>{t('admin.blocked_email_domains.import_dialog_title')}</DialogTitle>
                </DialogHeader>
                <DialogContent>
                    <p className='text-muted-foreground text-sm'>
                        {t('admin.blocked_email_domains.import_dialog_intro')}
                    </p>
                    <Tabs value={importTab} onValueChange={setImportTab} className='mt-4'>
                        <TabsList className='grid h-auto w-full grid-cols-3 gap-1'>
                            <TabsTrigger value='preset'>
                                {t('admin.blocked_email_domains.import_tab_preset')}
                            </TabsTrigger>
                            <TabsTrigger value='url'>{t('admin.blocked_email_domains.import_tab_url')}</TabsTrigger>
                            <TabsTrigger value='paste'>{t('admin.blocked_email_domains.import_tab_paste')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value='preset' className='mt-4 space-y-3'>
                            <p className='text-muted-foreground text-sm'>
                                {t('admin.blocked_email_domains.import_preset_body')}
                            </p>
                            <p className='text-muted-foreground border-border/60 bg-muted/20 rounded-lg border px-3 py-2 font-mono text-xs'>
                                {presetFile || '—'}
                            </p>
                        </TabsContent>
                        <TabsContent value='url' className='mt-4 space-y-3'>
                            <Label htmlFor='bulk-url'>{t('admin.blocked_email_domains.import_url_label')}</Label>
                            <Input
                                id='bulk-url'
                                type='url'
                                autoComplete='off'
                                placeholder={t('admin.blocked_email_domains.import_url_placeholder')}
                                value={importUrl}
                                disabled={importBusy}
                                onChange={(e) => setImportUrl(e.target.value)}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.blocked_email_domains.import_url_hint')}
                            </p>
                        </TabsContent>
                        <TabsContent value='paste' className='mt-4 space-y-3'>
                            <Label htmlFor='bulk-paste'>{t('admin.blocked_email_domains.import_paste_label')}</Label>
                            <Textarea
                                id='bulk-paste'
                                rows={14}
                                className='font-mono text-sm'
                                placeholder={t('admin.blocked_email_domains.import_paste_placeholder')}
                                value={importPaste}
                                disabled={importBusy}
                                onChange={(e) => setImportPaste(e.target.value)}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.blocked_email_domains.import_paste_hint')}
                            </p>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
                <DialogFooter className='mt-6 flex-wrap gap-2 sm:justify-end'>
                    <Button variant='outline' type='button' disabled={importBusy} onClick={() => setImportOpen(false)}>
                        {t('admin.blocked_email_domains.import_cancel')}
                    </Button>
                    {importTab === 'preset' && (
                        <Button type='button' disabled={importBusy} onClick={handleImportPreset}>
                            {importBusy ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                            {t('admin.blocked_email_domains.import_run_preset')}
                        </Button>
                    )}
                    {importTab === 'url' && (
                        <Button type='button' disabled={importBusy} onClick={handleImportUrl}>
                            {importBusy ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                            {t('admin.blocked_email_domains.import_run_url')}
                        </Button>
                    )}
                    {importTab === 'paste' && (
                        <Button type='button' disabled={importBusy} onClick={handleImportPaste}>
                            {importBusy ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                            {t('admin.blocked_email_domains.import_run_paste')}
                        </Button>
                    )}
                </DialogFooter>
            </Dialog>

            <PageCard
                title={t('admin.blocked_email_domains.section_enforcement_title')}
                description={t('admin.blocked_email_domains.section_enforcement_subtitle')}
                icon={ShieldCheck}
                className='p-6 sm:p-8'
            >
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-1'>
                        <Label htmlFor='blocking-switch' className='text-base font-semibold'>
                            {t('admin.blocked_email_domains.switch_label')}
                        </Label>
                        <p className='text-muted-foreground max-w-xl text-sm'>
                            {t('admin.blocked_email_domains.switch_help')}
                        </p>
                    </div>
                    <div className='flex shrink-0 items-center gap-3'>
                        {toggleSaving && <Loader2 className='text-muted-foreground h-5 w-5 animate-spin' />}
                        <Switch
                            id='blocking-switch'
                            checked={blockingEnabled}
                            disabled={toggleSaving}
                            onCheckedChange={() => handleToggleBlocking()}
                        />
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.blocked_email_domains.section_quick_add_title')}
                description={t('admin.blocked_email_domains.section_quick_add_subtitle')}
                icon={Plus}
                className='p-6 sm:p-8'
            >
                <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
                    <div className='grow space-y-2'>
                        <Label htmlFor='new-domain-input'>{t('admin.blocked_email_domains.add_label')}</Label>
                        <Input
                            id='new-domain-input'
                            placeholder={t('admin.blocked_email_domains.add_placeholder')}
                            value={newDomain}
                            className='h-11'
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <Button
                        className='h-11 shrink-0 sm:min-w-[120px]'
                        disabled={adding || !newDomain.trim()}
                        onClick={handleAdd}
                    >
                        {adding ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            <>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('admin.blocked_email_domains.add_button')}
                            </>
                        )}
                    </Button>
                </div>
            </PageCard>

            <div className='border-border bg-card/50 flex flex-col gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center'>
                <div className='group relative flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.blocked_email_domains.search_placeholder')}
                        className='h-11 w-full pl-10'
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setDebouncedSearch(searchInput.trim());
                            }
                        }}
                    />
                </div>
                <div className='flex flex-wrap items-center gap-3'>
                    <span className='text-muted-foreground text-xs font-medium whitespace-nowrap sm:text-sm'>
                        {searchPending
                            ? t('admin.blocked_email_domains.search_debouncing')
                            : t('admin.blocked_email_domains.domains_summary', { total: String(total) })}
                    </span>
                    {searchInput.trim() !== '' && (
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-9 shrink-0'
                            onClick={() => {
                                setSearchInput('');
                                setDebouncedSearch('');
                            }}
                        >
                            <X className='mr-1 h-4 w-4' />
                            {t('common.clear')}
                        </Button>
                    )}
                </div>
            </div>

            {beforeListWidgets.length > 0 ? <WidgetRenderer widgets={beforeListWidgets} /> : null}

            {totalPages > 1 && !loading ? paginationBar : null}

            {loading ? (
                <TableSkeleton count={6} />
            ) : isFilteredEmpty ? (
                <EmptyState
                    icon={Search}
                    title={t('admin.blocked_email_domains.empty_search_title')}
                    description={t('admin.blocked_email_domains.empty_search_hint')}
                    action={
                        <Button
                            variant='outline'
                            onClick={() => {
                                setSearchInput('');
                                setDebouncedSearch('');
                            }}
                        >
                            {t('common.clear')}
                        </Button>
                    }
                />
            ) : isTrulyEmpty ? (
                <EmptyState
                    icon={AlertCircle}
                    title={t('admin.blocked_email_domains.empty')}
                    description={t('admin.blocked_email_domains.empty_hint')}
                    action={
                        <Button onClick={() => setImportOpen(true)}>
                            <Upload className='mr-2 h-4 w-4' />
                            {t('admin.blocked_email_domains.import_bulk')}
                        </Button>
                    }
                />
            ) : (
                <div className='border-border/80 bg-card/40 overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm'>
                    <div className='overflow-x-auto'>
                        <table className='w-full min-w-[640px] text-sm'>
                            <thead>
                                <tr className='bg-muted/30 border-border/60 border-b'>
                                    <th
                                        scope='col'
                                        className='text-muted-foreground px-4 py-3 text-left align-middle text-[10px] font-bold tracking-wider uppercase'
                                    >
                                        {t('admin.blocked_email_domains.col_domain')}
                                    </th>
                                    <th
                                        scope='col'
                                        className='text-muted-foreground w-[140px] px-4 py-3 text-left align-middle text-[10px] font-bold tracking-wider uppercase'
                                    >
                                        {t('admin.blocked_email_domains.col_source')}
                                    </th>
                                    <th
                                        scope='col'
                                        className='text-muted-foreground w-[180px] px-4 py-3 text-left align-middle text-[10px] font-bold tracking-wider uppercase'
                                    >
                                        {t('admin.blocked_email_domains.col_added')}
                                    </th>
                                    <th
                                        scope='col'
                                        className='text-muted-foreground w-24 px-4 py-3 text-right align-middle text-[10px] font-bold tracking-wider uppercase'
                                    >
                                        {t('common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={r.id}
                                        className='border-border/40 hover:bg-muted/15 border-b transition-colors last:border-0'
                                    >
                                        <td className='px-4 py-3 align-middle'>
                                            <span className='font-mono text-[13px] tracking-tight'>{r.domain}</span>
                                        </td>
                                        <td className='text-muted-foreground px-4 py-3 align-middle'>
                                            <Badge
                                                variant='outline'
                                                className={cn('font-medium', sourceBadgeClass(r.source))}
                                            >
                                                {sourceLabel(r.source)}
                                            </Badge>
                                        </td>
                                        <td className='text-muted-foreground px-4 py-3 align-middle text-xs'>
                                            {formatAddedAt(r.created_at)}
                                        </td>
                                        <td className='px-4 py-3 text-right align-middle'>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                                                type='button'
                                                title={t('common.delete')}
                                                onClick={() => handleDelete(r.id, r.domain)}
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {bottomWidgets.length > 0 ? (
                <div className='mb-24'>
                    <WidgetRenderer widgets={bottomWidgets} />
                </div>
            ) : null}
        </div>
    );
}
