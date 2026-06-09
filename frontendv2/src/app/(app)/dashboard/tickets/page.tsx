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
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Ticket as TicketIcon, Plus, Search, ChevronLeft, ChevronRight, Trash2, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { HeadlessModal } from '@/components/ui/headless-modal';
import {} from '@/components/ui/card';

import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';

interface Category {
    id: number;
    name: string;
}

interface Status {
    id: number;
    name: string;
}

interface ApiTicket {
    id: number;
    uuid: string;
    title: string;
    created_at: string;
    status?: {
        id: number;
        name: string;
        color?: string;
    };
    priority?: {
        id: number;
        name: string;
        color?: string;
    };
    category?: {
        id: number;
        name: string;
    };
    server?: {
        id: number;
        name: string;
    };
    user?: {
        uuid: string;
        username: string;
        email?: string;
    };
    unread_count?: number;
    has_unread_messages_since_last_reply?: boolean;
}

interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    from: number;
    to: number;
}

interface ApiPaginationResponse {
    success: boolean;
    data: {
        tickets: ApiTicket[];
        pagination: {
            total_records: number;
            has_next: boolean;
            has_prev: boolean;
            from: number;
            to: number;
            current_page: number;
        };
        is_admin_view?: boolean;
        scope?: string;
        open_tickets_count?: number;
    };
}

export default function TicketsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { hasPermission } = useSession();
    const canViewAllTickets = hasPermission(Permissions.ADMIN_TICKETS_VIEW);

    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<ApiTicket[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [isAdminView, setIsAdminView] = useState(false);
    const [openTicketsCount, setOpenTicketsCount] = useState(0);
    const [ticketScope, setTicketScope] = useState<'all_open' | 'mine' | 'all'>('mine');

    const [filterStatus, setFilterStatus] = useState<string | number>('all');
    const [filterCategory, setFilterCategory] = useState<string | number>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        pageSize: 10,
        total: 0,
        hasNext: false,
        hasPrev: false,
        from: 0,
        to: 0,
    });

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState<ApiTicket | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-tickets-list');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [catsRes, statsRes] = await Promise.all([
                    axios.get('/api/user/tickets/categories').catch(() => ({ data: { data: { categories: [] } } })),
                    axios.get('/api/user/tickets/statuses').catch(() => ({ data: { data: { statuses: [] } } })),
                ]);

                const cats = (catsRes.data as { data: { categories: Category[] } })?.data?.categories || [];
                const stats = (statsRes.data as { data: { statuses: Status[] } })?.data?.statuses || [];

                setCategories(cats);
                setStatuses(stats);
            } catch (error: unknown) {
                console.error('Failed to fetch filters', error);
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        if (canViewAllTickets) {
            setTicketScope('all_open');
        }
    }, [canViewAllTickets]);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page: pagination.page,
                limit: pagination.pageSize,
            };
            if (searchQuery) params.search = searchQuery;
            if (filterStatus !== 'all') params.status_id = filterStatus;
            if (filterCategory !== 'all') params.category_id = filterCategory;
            if (canViewAllTickets) params.scope = ticketScope;

            const response = await axios.get<ApiPaginationResponse>('/api/user/tickets', { params });

            if (response.data.success) {
                setTickets(response.data.data.tickets || []);
                setIsAdminView(Boolean(response.data.data.is_admin_view));
                setOpenTicketsCount(response.data.data.open_tickets_count ?? 0);
                const meta = response.data.data.pagination;
                setPagination((prev) => ({
                    ...prev,
                    total: meta.total_records,
                    hasNext: meta.has_next,
                    hasPrev: meta.has_prev,
                    from: meta.from,
                    to: meta.to,
                    page: meta.current_page,
                }));
            }
        } catch (error: unknown) {
            console.error('Failed to fetch tickets', error);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    }, [
        pagination.page,
        pagination.pageSize,
        searchQuery,
        filterStatus,
        filterCategory,
        canViewAllTickets,
        ticketScope,
    ]);

    useEffect(() => {
        void fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        const onTicketReplied = () => {
            void fetchTickets();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('featherpanel:ticket-replied', onTicketReplied);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('featherpanel:ticket-replied', onTicketReplied);
            }
        };
    }, [fetchTickets]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchTickets();
    };

    const confirmDeleteTicket = async () => {
        if (!ticketToDelete) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/user/tickets/${ticketToDelete.uuid}`);
            setShowDeleteDialog(false);
            setTicketToDelete(null);
            fetchTickets();
        } catch (error: unknown) {
            console.error('Failed to delete ticket', error);
        } finally {
            setDeleting(false);
        }
    };

    const statusOptions = [
        { id: 'all', name: t('tickets.allStatuses') },
        ...statuses.map((s) => ({ id: s.id, name: s.name })),
    ];

    const categoryOptions = [
        { id: 'all', name: t('tickets.allCategories') },
        ...categories.map((c) => ({ id: c.id, name: c.name })),
    ];
    const unreadTicketsCount = tickets.filter((ticket) => ticket.has_unread_messages_since_last_reply).length;
    const unreadMessagesCount = tickets.reduce((sum, ticket) => sum + (ticket.unread_count ?? 0), 0);

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'top-of-page')} />
            <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
                <div>
                    <h1 className='text-3xl font-bold tracking-tight'>{t('tickets.title')}</h1>
                    <p className='text-muted-foreground'>
                        {isAdminView ? t('tickets.adminViewAndManage') : t('tickets.viewAndManage')}
                    </p>
                    {isAdminView && openTicketsCount > 0 && (
                        <div className='mt-2 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300'>
                            <span className='h-2 w-2 animate-pulse rounded-full bg-amber-500' />
                            {t('tickets.adminOpenTicketsInline').replace('{count}', String(openTicketsCount))}
                        </div>
                    )}
                    {unreadTicketsCount > 0 && (
                        <div className='mt-2 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300'>
                            <span className='h-2 w-2 animate-pulse rounded-full bg-red-500' />
                            {unreadTicketsCount} ticket{unreadTicketsCount > 1 ? 's' : ''} with new replies (
                            {unreadMessagesCount})
                        </div>
                    )}
                </div>
                <Link href='/dashboard/tickets/create'>
                    <Button>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('tickets.createTicket')}
                    </Button>
                </Link>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'after-header')} />

            {canViewAllTickets && (
                <div className='bg-card/50 border-border/50 flex flex-wrap gap-2 rounded-xl border p-2'>
                    {(
                        [
                            ['all_open', t('tickets.adminScopeOpen')],
                            ['all', t('tickets.adminScopeAll')],
                            ['mine', t('tickets.adminScopeMine')],
                        ] as const
                    ).map(([scope, label]) => (
                        <Button
                            key={scope}
                            type='button'
                            size='sm'
                            variant={ticketScope === scope ? 'default' : 'ghost'}
                            onClick={() => {
                                setTicketScope(scope);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            )}

            <div className='bg-card/50 border-border/50 rounded-xl border p-1 backdrop-blur-xl'>
                <div className='flex flex-col gap-4 p-4 md:flex-row'>
                    <div className='flex w-full flex-1 flex-col gap-4 md:flex-row'>
                        <div className='z-20 w-full md:w-56'>
                            <HeadlessSelect
                                value={filterStatus}
                                onChange={setFilterStatus}
                                options={statusOptions}
                                placeholder={t('tickets.allStatuses')}
                            />
                        </div>
                        <div className='z-10 w-full md:w-56'>
                            <HeadlessSelect
                                value={filterCategory}
                                onChange={setFilterCategory}
                                options={categoryOptions}
                                placeholder={t('tickets.allCategories')}
                            />
                        </div>
                    </div>
                    <form onSubmit={handleSearch} className='relative flex w-full gap-2 md:w-auto'>
                        <Input
                            placeholder={t('tickets.searchTickets')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='bg-background/50 border-border/50 focus:border-primary/50 w-full md:w-64'
                        />
                        <Button type='submit' variant='ghost' size='icon' className='absolute top-1 right-1'>
                            <Search className='text-muted-foreground h-4 w-4' />
                        </Button>
                    </form>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'after-filters')} />

            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'before-tickets-list')} />
            {!loading && tickets.length > 0 && (pagination.hasNext || pagination.hasPrev) && (
                <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize) || 1}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}
            {loading ? (
                <div className='space-y-4'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='bg-card/20 h-24 animate-pulse rounded-xl border border-white/5' />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className='border-border/50 bg-card/10 rounded-xl border border-dashed py-24 text-center'>
                    <div className='bg-primary/10 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full'>
                        <TicketIcon className='text-primary h-8 w-8' />
                    </div>
                    <h3 className='mb-2 text-xl font-medium'>{t('tickets.noTicketsFound')}</h3>
                    <p className='text-muted-foreground mx-auto mb-6 max-w-sm'>{t('tickets.createFirstTicket')}</p>
                    <Link href='/dashboard/tickets/create'>
                        <Button
                            variant='default'
                            className='bg-primary hover:bg-primary/90 text-primary-foreground h-auto px-6 py-6 text-base'
                        >
                            <Plus className='mr-2 h-5 w-5' />
                            {t('tickets.createTicket')}
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className='bg-card/50 border-border/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                    <div className='divide-border/50 divide-y'>
                        {tickets.map((ticket) => (
                            <div
                                key={ticket.uuid}
                                className={`group flex cursor-pointer flex-col justify-between gap-4 border-l-2 p-5 transition-all duration-200 hover:bg-white/2 sm:flex-row sm:items-center ${
                                    ticket.has_unread_messages_since_last_reply
                                        ? 'border-l-red-500 bg-red-500/5'
                                        : 'hover:border-l-primary border-l-transparent'
                                }`}
                                onClick={() =>
                                    router.push(
                                        isAdminView && ticket.user
                                            ? `/admin/tickets/${ticket.uuid}`
                                            : `/dashboard/tickets/${ticket.uuid}`,
                                    )
                                }
                            >
                                <div className='flex-1'>
                                    <div className='mb-2 flex items-center gap-3'>
                                        {ticket.has_unread_messages_since_last_reply && (
                                            <span className='inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500' />
                                        )}
                                        <h3 className='text-foreground group-hover:text-primary text-lg font-semibold transition-colors'>
                                            {ticket.title}
                                        </h3>
                                        <div className='flex gap-2'>
                                            {ticket.has_unread_messages_since_last_reply && (
                                                <Badge
                                                    variant='destructive'
                                                    className='inline-flex items-center gap-1 rounded-md border-0 px-2 py-0.5 font-medium'
                                                    title={
                                                        t('tickets.newMessages') || 'New messages since your last reply'
                                                    }
                                                >
                                                    <MessageCircle className='h-3 w-3' />
                                                    {ticket.unread_count && ticket.unread_count > 0
                                                        ? ticket.unread_count
                                                        : ''}
                                                </Badge>
                                            )}
                                            {ticket.status && (
                                                <Badge
                                                    className='rounded-md border-0 px-2 py-0.5 font-medium'
                                                    style={{
                                                        backgroundColor: ticket.status.color
                                                            ? `${ticket.status.color}20`
                                                            : 'hsl(var(--primary) / 0.1)',
                                                        color: ticket.status.color || 'hsl(var(--primary))',
                                                    }}
                                                >
                                                    {ticket.status.name}
                                                </Badge>
                                            )}
                                            {ticket.priority && (
                                                <Badge
                                                    variant='secondary'
                                                    className='bg-secondary/50 text-secondary-foreground/80 rounded-md border-0'
                                                >
                                                    {ticket.priority.name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-sm'>
                                        <span className='font-mono text-xs opacity-50'>#{ticket.id}</span>
                                        {isAdminView && ticket.user && (
                                            <>
                                                <span className='bg-muted-foreground/30 h-1 w-1 rounded-full' />
                                                <span className='font-medium'>{ticket.user.username}</span>
                                            </>
                                        )}
                                        {ticket.has_unread_messages_since_last_reply && (
                                            <>
                                                <span className='bg-muted-foreground/30 h-1 w-1 rounded-full' />
                                                <span className='font-medium text-red-600 dark:text-red-300'>
                                                    {ticket.unread_count ?? 0} new repl
                                                    {(ticket.unread_count ?? 0) === 1 ? 'y' : 'ies'}
                                                </span>
                                            </>
                                        )}
                                        {ticket.category && (
                                            <>
                                                <span className='bg-muted-foreground/30 h-1 w-1 rounded-full' />
                                                <span className='flex items-center gap-1.5'>
                                                    {ticket.category.name}
                                                </span>
                                            </>
                                        )}
                                        <span className='bg-muted-foreground/30 h-1 w-1 rounded-full' />
                                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2'>
                                    {ticket.has_unread_messages_since_last_reply && (
                                        <div className='mr-2 rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-300'>
                                            NEW
                                        </div>
                                    )}
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTicketToDelete(ticket);
                                            setShowDeleteDialog(true);
                                        }}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                    <div className='border-border/50 ml-2 border-l pl-4'>
                                        <ChevronRight className='text-muted-foreground/50 h-5 w-5' />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {pagination.total > 0 && (
                        <div className='border-border flex items-center justify-between border-t p-4'>
                            <p className='text-muted-foreground text-sm'>
                                {t('tickets.showingTickets')
                                    .replace('{from}', String(pagination.from))
                                    .replace('{to}', String(pagination.to))
                                    .replace('{total}', String(pagination.total))}
                            </p>
                            <div className='flex gap-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!pagination.hasPrev}
                                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    <ChevronLeft className='mr-1 h-4 w-4' />
                                    {t('tickets.previous')}
                                </Button>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!pagination.hasNext}
                                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    {t('tickets.next')}
                                    <ChevronRight className='ml-1 h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'after-tickets-list')} />

            <HeadlessModal
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                title={t('tickets.deleteTicketTitle')}
                description={t('tickets.deleteTicketWarning')}
            >
                <div>
                    <p className='text-muted-foreground mb-6 text-sm'>{t('tickets.deleteTicketConfirm')}</p>
                    <div className='flex justify-end gap-2'>
                        <Button variant='outline' onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant='destructive' onClick={confirmDeleteTicket} loading={deleting}>
                            {t('tickets.deleteTicket')}
                        </Button>
                    </div>
                </div>
            </HeadlessModal>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'bottom-of-page')} />
        </div>
    );
}
