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
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ListPagination } from '@/components/featherui/ListPagination';
import { Loader2, Plus, Trash2, RefreshCw, ShieldBan, Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';

interface BlockedIpRow {
    id: number;
    ip: string;
    reason: string | null;
    expires_at: string | null;
    created_by_uuid: string | null;
    created_at: string | null;
    is_active: boolean;
    is_permanent: boolean;
}

interface ListResponse {
    ips: BlockedIpRow[];
    pagination: {
        current_page: number;
        per_page: number;
        total_records: number;
        total_pages: number;
    };
}

const WIDGET_PAGE = 'admin-blocked-ips';
const SEARCH_DEBOUNCE_MS = 320;
const ROWS_PER_PAGE = 50;

function formatWhen(iso: string | null): string {
    if (!iso) {
        return '-';
    }
    try {
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

export default function BlockedIpsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<BlockedIpRow[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [activeOnly, setActiveOnly] = useState(true);
    const [newIp, setNewIp] = useState('');
    const [newReason, setNewReason] = useState('');
    const [duration, setDuration] = useState('');
    const [adding, setAdding] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets(WIDGET_PAGE);
    const limit = ROWS_PER_PAGE;

    useEffect(() => {
        fetchWidgets(WIDGET_PAGE);
    }, [fetchWidgets]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(handle);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, activeOnly]);

    const load = useCallback(
        async (opts?: { page?: number; search?: string; activeOnly?: boolean }) => {
            const effectivePage = opts?.page ?? page;
            const effectiveSearch = opts?.search ?? debouncedSearch;
            const effectiveActiveOnly = opts?.activeOnly ?? activeOnly;
            setLoading(true);
            try {
                const res = await axios.get<{ success: boolean; data?: ListResponse; message?: string }>(
                    '/api/admin/blocked-ips',
                    {
                        params: {
                            page: effectivePage,
                            limit,
                            search: effectiveSearch,
                            active_only: effectiveActiveOnly ? 'true' : 'false',
                        },
                    },
                );
                if (res.data.success && res.data.data) {
                    setRows(res.data.data.ips);
                    const tp = Math.max(1, res.data.data.pagination.total_pages || 1);
                    setTotalPages(tp);
                    setTotal(res.data.data.pagination.total_records);
                } else {
                    toast.error(getApiErrorMessageFromPayload(res.data, t, 'admin.blocked_ips.messages.load_failed'));
                }
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'admin.blocked_ips.messages.load_failed'));
            } finally {
                setLoading(false);
            }
        },
        [page, debouncedSearch, activeOnly, limit, t],
    );

    useEffect(() => {
        load();
    }, [load]);

    const handleAdd = async () => {
        const v = newIp.trim();
        if (!v) {
            return;
        }
        setAdding(true);
        try {
            const res = await axios.put<{ success: boolean; message?: string }>('/api/admin/blocked-ips', {
                ip: v,
                reason: newReason.trim() || undefined,
                duration: duration.trim() || 'permanent',
            });
            if (res.data.success) {
                toast.success(t('admin.blocked_ips.messages.added'));
                setNewIp('');
                setNewReason('');
                setDuration('');
                setPage(1);
                await load({ page: 1, search: debouncedSearch });
            } else {
                toast.error(getApiErrorMessageFromPayload(res.data, t, 'admin.blocked_ips.messages.add_failed'));
            }
        } catch (e: unknown) {
            toast.error(getApiErrorMessage(e, t, 'admin.blocked_ips.messages.add_failed'));
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: number, ip: string) => {
        if (!confirm(t('admin.blocked_ips.confirm_delete', { ip }))) {
            return;
        }
        try {
            const res = await axios.delete<{ success: boolean; message?: string }>(`/api/admin/blocked-ips/${id}`);
            if (res.data.success) {
                toast.success(t('admin.blocked_ips.messages.deleted'));
                await load();
            } else {
                toast.error(getApiErrorMessageFromPayload(res.data, t, 'admin.blocked_ips.messages.delete_failed'));
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin.blocked_ips.messages.delete_failed'));
        }
    };

    const topWidgets = getWidgets(WIDGET_PAGE, 'top-of-page');
    const afterHeaderWidgets = getWidgets(WIDGET_PAGE, 'after-header');
    const beforeListWidgets = getWidgets(WIDGET_PAGE, 'before-list');
    const bottomWidgets = getWidgets(WIDGET_PAGE, 'bottom-of-page');

    const isFilteredEmpty = !loading && rows.length === 0 && debouncedSearch.length > 0;
    const isTrulyEmpty = !loading && rows.length === 0 && debouncedSearch.length === 0;

    return (
        <div className='space-y-6'>
            {topWidgets.length > 0 ? <WidgetRenderer widgets={topWidgets} /> : null}

            <PageHeader
                title={t('admin.blocked_ips.title')}
                description={t('admin.blocked_ips.description')}
                icon={ShieldBan}
                actions={
                    <Button type='button' variant='outline' disabled={loading} onClick={() => load()}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('common.refresh')}
                    </Button>
                }
            />

            {afterHeaderWidgets.length > 0 ? <WidgetRenderer widgets={afterHeaderWidgets} /> : null}

            <PageCard
                title={t('admin.blocked_ips.section_quick_add_title')}
                description={t('admin.blocked_ips.section_quick_add_subtitle')}
                icon={Plus}
            >
                <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                        <Label htmlFor='ban-ip'>{t('admin.blocked_ips.add_label')}</Label>
                        <Input
                            id='ban-ip'
                            autoComplete='off'
                            placeholder={t('admin.blocked_ips.add_placeholder')}
                            value={newIp}
                            onChange={(e) => setNewIp(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleAdd();
                                }
                            }}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='ban-duration'>{t('admin.blocked_ips.duration_label')}</Label>
                        <Input
                            id='ban-duration'
                            autoComplete='off'
                            placeholder={t('admin.blocked_ips.duration_placeholder')}
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        />
                        <p className='text-muted-foreground text-xs'>{t('admin.blocked_ips.duration_help')}</p>
                    </div>
                    <div className='space-y-2 md:col-span-2'>
                        <Label htmlFor='ban-reason'>{t('admin.blocked_ips.reason_label')}</Label>
                        <Textarea
                            id='ban-reason'
                            rows={2}
                            placeholder={t('admin.blocked_ips.reason_placeholder')}
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                        />
                    </div>
                </div>
                <div className='mt-4'>
                    <Button type='button' disabled={adding || !newIp.trim()} onClick={() => void handleAdd()}>
                        {adding ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Plus className='mr-2 h-4 w-4' />}
                        {t('admin.blocked_ips.add_button')}
                    </Button>
                </div>
            </PageCard>

            {beforeListWidgets.length > 0 ? <WidgetRenderer widgets={beforeListWidgets} /> : null}

            <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.blocked_ips.search_placeholder')}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className='h-11 w-full pl-10'
                    />
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                    <Switch id='active-only' checked={activeOnly} onCheckedChange={setActiveOnly} />
                    <Label htmlFor='active-only'>{t('admin.blocked_ips.active_only')}</Label>
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={4} />
            ) : isTrulyEmpty ? (
                <EmptyState
                    icon={ShieldBan}
                    title={t('admin.blocked_ips.empty')}
                    description={t('admin.blocked_ips.empty_hint')}
                />
            ) : isFilteredEmpty ? (
                <EmptyState
                    icon={Search}
                    title={t('admin.blocked_ips.empty_search_title')}
                    description={t('admin.blocked_ips.empty_search_hint')}
                />
            ) : (
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm'>
                        {t('admin.blocked_ips.list_summary', { total: String(total) })}
                    </p>
                    <div className='space-y-3'>
                        {rows.map((row) => {
                            const badges: ResourceBadge[] = [
                                {
                                    label: row.is_active
                                        ? t('admin.blocked_ips.status_active')
                                        : t('admin.blocked_ips.status_expired'),
                                    className: row.is_active
                                        ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300'
                                        : 'border-border bg-muted text-muted-foreground',
                                },
                                {
                                    label: row.is_permanent
                                        ? t('admin.blocked_ips.permanent')
                                        : t('admin.blocked_ips.expires_at', {
                                              date: formatWhen(row.expires_at),
                                          }),
                                    className: 'border-border bg-muted/40 text-muted-foreground',
                                },
                            ];

                            return (
                                <ResourceCard
                                    key={row.id}
                                    icon={ShieldBan}
                                    title={row.ip}
                                    titleClassName='font-mono'
                                    subtitle={row.reason || t('admin.blocked_ips.no_reason')}
                                    description={t('admin.blocked_ips.added_at', {
                                        date: formatWhen(row.created_at),
                                    })}
                                    badges={badges}
                                    actions={
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='sm'
                                            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                                            title={t('common.delete')}
                                            onClick={() => void handleDelete(row.id, row.ip)}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    }
                                />
                            );
                        })}
                    </div>
                    <ListPagination page={page} totalPages={totalPages} disabled={loading} onPageChange={setPage} />
                </div>
            )}

            {bottomWidgets.length > 0 ? <WidgetRenderer widgets={bottomWidgets} /> : null}
        </div>
    );
}
