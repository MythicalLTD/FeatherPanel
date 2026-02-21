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

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Ticket, Search, Trash2, Eye, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { toast } from 'sonner';
import Link from 'next/link';
import { Select } from '@/components/ui/select-native';
import { PageCard } from '@/components/featherui/PageCard';
import { AlertCircle } from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

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

export default function TicketsPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-tickets');
    const [tickets, setTickets] = useState<ApiTicket[]>([]);
    const [categories, setCategories] = useState<Meta[]>([]);
    const [statuses, setStatuses] = useState<Meta[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
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
                setPagination((prev) => ({ ...prev, page: 1 }));
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

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
        const controller = new AbortController();
        const fetchTickets = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/tickets', {
                    params: {
                        page: pagination.page,
                        limit: pagination.pageSize,
                        search: debouncedSearchQuery || undefined,
                        status_id: statusFilter !== 'all' ? statusFilter : undefined,
                        category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
                    },
                    signal: controller.signal,
                });

                setTickets(data.data.tickets || []);
                const apiPagination = data.data.pagination;
                if (apiPagination) {
                    setPagination((prev) => ({
                        ...prev,
                        page: apiPagination.current_page,
                        pageSize: apiPagination.per_page,
                        total: apiPagination.total_records,
                        totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                        hasNext: apiPagination.has_next,
                        hasPrev: apiPagination.has_prev,
                    }));
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
    }, [
        pagination.page,
        pagination.pageSize,
        debouncedSearchQuery,
        statusFilter,
        categoryFilter,
        refreshKey,
        t,
        fetchWidgets,
    ]);

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

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.tickets.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
                <div className='flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto'>
                    <div className='flex items-center gap-2'>
                        <Filter className='h-4 w-4 text-muted-foreground' />
                        <Select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            className='w-[160px] h-11 rounded-xl bg-background/50 border-border/50'
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
                            setCategoryFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className='w-[160px] h-11 rounded-xl bg-background/50 border-border/50'
                    >
                        <option value='all'>{t('admin.tickets.filters.all_categories')}</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id.toString()}>
                                {category.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-tickets', 'after-header')} />

            {!loading && tickets.length > 0 && pagination.totalPages > 1 && (
                <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50 mb-4'>
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
                <TableSkeleton count={3} />
            ) : tickets.length === 0 ? (
                <EmptyState
                    icon={Ticket}
                    title={t('admin.tickets.no_results')}
                    description={t('admin.tickets.search_placeholder')}
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    <WidgetRenderer widgets={getWidgets('admin-tickets', 'before-list')} />
                    {tickets.map((ticket) => {
                        const badges: ResourceBadge[] = [
                            {
                                label: ticket.status?.name || t('common.unknown'),
                                style: {
                                    backgroundColor: `${ticket.status?.color}20`,
                                    color: ticket.status?.color,
                                    borderColor: `${ticket.status?.color}40`,
                                },
                            },
                            {
                                label: ticket.priority?.name || t('common.normal'),
                                style: {
                                    backgroundColor: `${ticket.priority?.color}20`,
                                    color: ticket.priority?.color,
                                    borderColor: `${ticket.priority?.color}40`,
                                },
                            },
                        ];

                        return (
                            <ResourceCard
                                key={ticket.id}
                                icon={Ticket}
                                title={ticket.title}
                                subtitle={
                                    <div className='flex items-center gap-2'>
                                        <span className='font-mono text-xs opacity-70'>#{ticket.id}</span>
                                        <span>•</span>
                                        <span className='font-medium text-primary/80'>{ticket.user?.username}</span>
                                        <span className='opacity-50'>({ticket.user?.email})</span>
                                    </div>
                                }
                                badges={badges}
                                iconClassName='text-primary'
                                description={
                                    <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground'>
                                        <div className='flex items-center gap-2'>
                                            <span className='font-semibold'>{t('admin.tickets.table.category')}:</span>
                                            <span>{ticket.category?.name}</span>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                            <span className='font-semibold'>{t('admin.tickets.table.created')}:</span>
                                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {ticket.server_id && (
                                            <div className='flex items-center gap-2'>
                                                <span className='font-semibold'>
                                                    {t('admin.tickets.table.server')}:
                                                </span>
                                                <span className='font-mono'>#{ticket.server_id}</span>
                                            </div>
                                        )}
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Link href={`/admin/tickets/${ticket.uuid}`}>
                                            <Button size='sm' variant='outline'>
                                                <Eye className='h-4 w-4 mr-2' />
                                                {t('common.view')}
                                            </Button>
                                        </Link>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(ticket.uuid, ticket.id)}
                                            disabled={isDeleting === ticket.id}
                                        >
                                            {isDeleting === ticket.id ? (
                                                <RefreshCw className='h-4 w-4 animate-spin' />
                                            ) : (
                                                <Trash2 className='h-4 w-4' />
                                            )}
                                        </Button>
                                    </div>
                                }
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
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10'>
                <PageCard title={t('admin.tickets.help.managing.title')} icon={Ticket}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.tickets.help.categories.title')} icon={Filter}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.help.categories.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.tickets.help.support.title')} icon={AlertCircle} variant='danger'>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.help.support.description')}
                    </p>
                </PageCard>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-tickets', 'bottom-of-page')} />
        </div>
    );
}
