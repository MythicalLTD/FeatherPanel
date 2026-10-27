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

import { AdminListToolbar } from '@/components/admin/AdminListToolbar';
import { AdminPageTips } from '@/components/admin/AdminPageTips';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateInTz } from '@/lib/dateUtils';
import { Ticket, Trash2, Eye, RefreshCw, Filter } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { DataTable, ColorPill } from '@/components/featherui/DataTable';
import { useRouter } from 'next/navigation';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Button } from '@/components/featherui/Button';
import { toast } from 'sonner';
import Link from 'next/link';
import { Select } from '@/components/ui/select-native';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Sensitive } from '@/components/common/Sensitive';
import { ListPagination } from '@/components/featherui/ListPagination';

interface User {
    id: number;
    username: string;
    email: string;
}

interface Meta {
    id: number;
    name: string;
    color: string;
}

interface ApiTicket {
    id: number;
    uuid: string;
    title: string;
    user_id: number;
    category_id: number;
    priority_id: number;
    status_id: number;
    server_id: number | null;
    created_at: string;
    updated_at: string;
    user: User;
    category: Meta;
    priority: Meta;
    status: Meta;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

const TICKETS_LIST_FILTERS_KEY = 'featherpanel_admin_tickets_filters_v1';
const TICKETS_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    statusFilter: 'all',
    categoryFilter: 'all',
    page: 1,
    pageSize: 10,
};

export default function TicketsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-tickets');
    const [tickets, setTickets] = useState<ApiTicket[]>([]);
    const [categories, setCategories] = useState<Meta[]>([]);
    const [statuses, setStatuses] = useState<Meta[]>([]);
    const [loading, setLoading] = useState(true);
    const { filters, patchFilters, hydrated, resetFilters, isFiltered } = usePersistedListFilters(
        TICKETS_LIST_FILTERS_KEY,
        TICKETS_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, statusFilter, categoryFilter, page, pageSize } = filters;

    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                patchFilters({ page: 1 });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery, patchFilters]);

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [catRes, statusRes] = await Promise.all([
                    axios.get('/api/admin/tickets/categories'),
                    axios.get('/api/admin/tickets/statuses'),
                ]);
                setCategories(catRes.data.data.categories || []);
                setStatuses(statusRes.data.data.statuses || []);
            } catch (error) {
                console.error('Error fetching ticket dependencies:', error);
            }
        };
        fetchDependencies();
    }, []);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const controller = new AbortController();
        const fetchTickets = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/tickets', {
                    params: {
                        page,
                        limit: pageSize,
                        search: debouncedSearchQuery || undefined,
                        status_id: statusFilter !== 'all' ? statusFilter : undefined,
                        category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
                    },
                    signal: controller.signal,
                });

                setTickets(data.data.tickets || []);
                const apiPagination = data.data.pagination;
                if (apiPagination) {
                    setPagination({
                        total: apiPagination.total_records,
                        totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                        hasNext: apiPagination.has_next,
                        hasPrev: apiPagination.has_prev,
                    });
                }
            } catch (error) {
                if (!axios.isCancel(error)) {
                    console.error('Error fetching tickets:', error);
                    toast.error(t('admin.tickets.messages.fetch_failed'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchTickets();
        fetchWidgets();
        return () => {
            controller.abort();
        };
    }, [page, pageSize, debouncedSearchQuery, statusFilter, categoryFilter, refreshKey, t, fetchWidgets, hydrated]);

    const handleDelete = async (uuid: string, id: number) => {
        if (!confirm(t('admin.tickets.messages.delete_confirm'))) return;

        setIsDeleting(id);
        try {
            await axios.delete(`/api/admin/tickets/${uuid}`);
            toast.success(t('admin.tickets.messages.delete_success'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting ticket:', error);
            toast.error(t('admin.tickets.messages.delete_failed'));
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-tickets', 'top-of-page')} />
            <PageHeader title={t('admin.tickets.title')} description={t('admin.tickets.viewAndManage')} icon={Ticket} />

            <AdminListToolbar
                searchPlaceholder={t('admin.tickets.search_placeholder')}
                searchValue={searchQuery}
                onSearchChange={(value) => patchFilters({ searchQuery: value })}
            >
                <div className='flex w-full items-center gap-2 overflow-x-auto pb-2 sm:w-auto sm:pb-0'>
                    <div className='flex items-center gap-2'>
                        <Filter className='text-muted-foreground h-4 w-4' />
                        <Select
                            value={statusFilter}
                            onChange={(e) => {
                                patchFilters({ statusFilter: e.target.value, page: 1 });
                            }}
                            className='bg-background/50 border-border/50 h-11 w-[160px] rounded-xl'
                        >
                            <option value='all'>{t('admin.tickets.filters.all_statuses')}</option>
                            {statuses.map((status) => (
                                <option key={status.id} value={status.id.toString()}>
                                    {status.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <Select
                        value={categoryFilter}
                        onChange={(e) => {
                            patchFilters({ categoryFilter: e.target.value, page: 1 });
                        }}
                        className='bg-background/50 border-border/50 h-11 w-[160px] rounded-xl'
                    >
                        <option value='all'>{t('admin.tickets.filters.all_categories')}</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id.toString()}>
                                {category.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </AdminListToolbar>

            <WidgetRenderer widgets={getWidgets('admin-tickets', 'after-header')} />

            {loading ? (
                <TableSkeleton count={3} />
            ) : tickets.length === 0 ? (
                <ListEmptyState
                    icon={Ticket}
                    title={t('emptyStates.tickets.title')}
                    description={t('emptyStates.tickets.description')}
                    filtered={isFiltered}
                    onClearFilters={resetFilters}
                />
            ) : (
                <div className='space-y-4'>
                    <WidgetRenderer widgets={getWidgets('admin-tickets', 'before-list')} />
                    <DataTable
                        rows={tickets}
                        rowKey={(ticket) => ticket.id}
                        onRowClick={(ticket) => router.push(`/admin/tickets/${ticket.uuid}`)}
                        columns={[
                            {
                                key: 'subject',
                                header: t('admin.tickets.table.subject'),
                                className: 'w-[36%]',
                                cell: (ticket) => (
                                    <div className='min-w-0'>
                                        <p className='truncate font-medium'>{ticket.title}</p>
                                        <p className='text-muted-foreground font-mono text-xs'>#{ticket.id}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'user',
                                header: t('admin.tickets.table.user'),
                                cell: (ticket) => (
                                    <div className='min-w-0'>
                                        <p className='truncate'>{ticket.user?.username ?? t('common.unknown')}</p>
                                        <p className='text-muted-foreground truncate text-xs'>
                                            <Sensitive>{ticket.user?.email}</Sensitive>
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: 'status',
                                header: t('admin.tickets.table.status'),
                                cell: (ticket) => (
                                    <ColorPill color={ticket.status?.color}>
                                        {ticket.status?.name || t('common.unknown')}
                                    </ColorPill>
                                ),
                            },
                            {
                                key: 'priority',
                                header: t('admin.tickets.table.priority'),
                                cell: (ticket) => (
                                    <ColorPill color={ticket.priority?.color}>
                                        {ticket.priority?.name || t('common.normal')}
                                    </ColorPill>
                                ),
                            },
                            {
                                key: 'category',
                                header: t('admin.tickets.table.category'),
                                className: 'text-muted-foreground',
                                cell: (ticket) => ticket.category?.name ?? t('common.unknown'),
                            },
                            {
                                key: 'created',
                                header: t('admin.tickets.table.created'),
                                className: 'text-muted-foreground whitespace-nowrap',
                                cell: (ticket) => formatDateInTz(ticket.created_at, dateOpts),
                            },
                        ]}
                        mobileCard={(ticket) => (
                            <div className='min-w-0 space-y-2'>
                                <div className='flex items-start justify-between gap-2'>
                                    <p className='min-w-0 font-medium'>{ticket.title}</p>
                                    <span className='text-muted-foreground shrink-0 font-mono text-xs'>
                                        #{ticket.id}
                                    </span>
                                </div>
                                <div className='flex flex-wrap items-center gap-1.5'>
                                    <ColorPill color={ticket.status?.color}>
                                        {ticket.status?.name || t('common.unknown')}
                                    </ColorPill>
                                    <ColorPill color={ticket.priority?.color}>
                                        {ticket.priority?.name || t('common.normal')}
                                    </ColorPill>
                                </div>
                                <p className='text-muted-foreground text-xs'>
                                    {ticket.user?.username} · {ticket.category?.name} ·{' '}
                                    {formatDateInTz(ticket.created_at, dateOpts)}
                                </p>
                            </div>
                        )}
                        actions={(ticket) => (
                            <>
                                <Button asChild size='sm' variant='ghost' className='gap-1.5'>
                                    <Link href={`/admin/tickets/${ticket.uuid}`}>
                                        <Eye className='h-4 w-4' />
                                        {t('common.view')}
                                    </Link>
                                </Button>
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                    onClick={() => handleDelete(ticket.uuid, ticket.id)}
                                    disabled={isDeleting === ticket.id}
                                    aria-label={t('common.delete')}
                                >
                                    {isDeleting === ticket.id ? (
                                        <RefreshCw className='h-4 w-4 animate-spin' />
                                    ) : (
                                        <Trash2 className='h-4 w-4' />
                                    )}
                                </Button>
                            </>
                        )}
                    />
                </div>
            )}

            {!loading && tickets.length > 0 && pagination.totalPages > 1 && (
                <ListPagination
                    page={page}
                    totalPages={pagination.totalPages}
                    onPageChange={(nextPage) => patchFilters({ page: nextPage })}
                />
            )}
            <AdminPageTips page='tickets' />

            <WidgetRenderer widgets={getWidgets('admin-tickets', 'bottom-of-page')} />
        </div>
    );
}
