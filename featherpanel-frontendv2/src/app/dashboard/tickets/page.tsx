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
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Ticket as TicketIcon, Plus, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { HeadlessModal } from '@/components/ui/headless-modal';
import {} from '@/components/ui/card';

import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

// Types
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
    };
}

export default function TicketsPage() {
    const { t } = useTranslation();
    const router = useRouter();

    // State
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<ApiTicket[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);

    // Filters - Use specific types for Select values
    const [filterStatus, setFilterStatus] = useState<string | number>('all');
    const [filterCategory, setFilterCategory] = useState<string | number>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        pageSize: 10,
        total: 0,
        hasNext: false,
        hasPrev: false,
        from: 0,
        to: 0,
    });

    // Delete Dialog
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState<ApiTicket | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-tickets-list');

    // Initial Fetch
    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    // Initial Fetch
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                // Using unknown cast for safety then verifying shape if needed, but for simple lists we trust API mostly
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

    // Fetch Tickets on changes
    useEffect(() => {
        fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, filterStatus, filterCategory]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page: pagination.page,
                limit: pagination.pageSize,
            };
            if (searchQuery) params.search = searchQuery;
            if (filterStatus !== 'all') params.status_id = filterStatus;
            if (filterCategory !== 'all') params.category_id = filterCategory;

            const response = await axios.get<ApiPaginationResponse>('/api/user/tickets', { params });

            if (response.data.success) {
                setTickets(response.data.data.tickets || []);
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
    };

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

    // Format options for HeadlessSelect
    const statusOptions = [
        { id: 'all', name: t('tickets.allStatuses') },
        ...statuses.map((s) => ({ id: s.id, name: s.name })),
    ];

    const categoryOptions = [
        { id: 'all', name: t('tickets.allCategories') },
        ...categories.map((c) => ({ id: c.id, name: c.name })),
    ];

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'top-of-page')} />
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold tracking-tight'>{t('tickets.title')}</h1>
                    <p className='text-muted-foreground'>{t('tickets.viewAndManage')}</p>
                </div>
                <Link href='/dashboard/tickets/create'>
                    <Button>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('tickets.createTicket')}
                    </Button>
                </Link>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'after-header')} />

            {/* Filters */}
            <div className='bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-1'>
                <div className='flex flex-col md:flex-row gap-4 p-4'>
                    <div className='flex-1 flex flex-col md:flex-row gap-4 w-full'>
                        <div className='w-full md:w-56 z-20'>
                            <HeadlessSelect
                                value={filterStatus}
                                onChange={setFilterStatus}
                                options={statusOptions}
                                placeholder={t('tickets.allStatuses')}
                            />
                        </div>
                        <div className='w-full md:w-56 z-10'>
                            <HeadlessSelect
                                value={filterCategory}
                                onChange={setFilterCategory}
                                options={categoryOptions}
                                placeholder={t('tickets.allCategories')}
                            />
                        </div>
                    </div>
                    <form onSubmit={handleSearch} className='flex gap-2 w-full md:w-auto relative'>
                        <Input
                            placeholder={t('tickets.searchTickets')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='w-full md:w-64 bg-background/50 border-border/50 focus:border-primary/50'
                        />
                        <Button type='submit' variant='ghost' size='icon' className='absolute right-1 top-1'>
                            <Search className='h-4 w-4 text-muted-foreground' />
                        </Button>
                    </form>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'after-filters')} />

            {/* List */}
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'before-tickets-list')} />
            {loading ? (
                <div className='space-y-4'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='h-24 bg-card/20 animate-pulse rounded-xl border border-white/5' />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className='text-center py-24 rounded-xl border border-dashed border-border/50 bg-card/10'>
                    <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6'>
                        <TicketIcon className='h-8 w-8 text-primary' />
                    </div>
                    <h3 className='text-xl font-medium mb-2'>{t('tickets.noTicketsFound')}</h3>
                    <p className='text-muted-foreground mb-6 max-w-sm mx-auto'>{t('tickets.createFirstTicket')}</p>
                    <Link href='/dashboard/tickets/create'>
                        <Button
                            variant='default'
                            className='bg-primary hover:bg-primary/90 text-primary-foreground text-base px-6 py-6 h-auto shadow-lg shadow-primary/20'
                        >
                            <Plus className='w-5 h-5 mr-2' />
                            {t('tickets.createTicket')}
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className='bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden'>
                    <div className='divide-y divide-border/50'>
                        {tickets.map((ticket) => (
                            <div
                                key={ticket.uuid}
                                className='p-5 hover:bg-white/2 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer border-l-2 border-l-transparent hover:border-l-primary'
                                onClick={() => router.push(`/dashboard/tickets/${ticket.uuid}`)}
                            >
                                <div className='flex-1'>
                                    <div className='flex items-center gap-3 mb-2'>
                                        <h3 className='font-semibold text-lg text-foreground group-hover:text-primary transition-colors'>
                                            {ticket.title}
                                        </h3>
                                        <div className='flex gap-2'>
                                            {ticket.status && (
                                                <Badge
                                                    className='rounded-md px-2 py-0.5 font-medium border-0'
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
                                                    className='bg-secondary/50 text-secondary-foreground/80 border-0 rounded-md'
                                                >
                                                    {ticket.priority.name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-3 text-sm text-muted-foreground'>
                                        <span className='font-mono text-xs opacity-50'>#{ticket.id}</span>
                                        {ticket.category && (
                                            <>
                                                <span className='w-1 h-1 rounded-full bg-muted-foreground/30' />
                                                <span className='flex items-center gap-1.5'>
                                                    {ticket.category.name}
                                                </span>
                                            </>
                                        )}
                                        <span className='w-1 h-1 rounded-full bg-muted-foreground/30' />
                                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0'>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTicketToDelete(ticket);
                                            setShowDeleteDialog(true);
                                        }}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                    <div className='ml-2 pl-4 border-l border-border/50'>
                                        <ChevronRight className='h-5 w-5 text-muted-foreground/50' />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Pagination */}
                    {pagination.total > 0 && (
                        <div className='p-4 border-t border-border flex items-center justify-between'>
                            <p className='text-sm text-muted-foreground'>
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
                                    <ChevronLeft className='h-4 w-4 mr-1' />
                                    {t('tickets.previous')}
                                </Button>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!pagination.hasNext}
                                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    {t('tickets.next')}
                                    <ChevronRight className='h-4 w-4 ml-1' />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-tickets', 'after-tickets-list')} />

            {/* Headless UI Modal for Delete */}
            <HeadlessModal
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                title={t('tickets.deleteTicketTitle')}
                description={t('tickets.deleteTicketWarning')}
            >
                <div>
                    <p className='text-sm text-muted-foreground mb-6'>{t('tickets.deleteTicketConfirm')}</p>
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
