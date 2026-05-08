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

import { useState, useEffect, useCallback } from 'react';
import { Ticket, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';

interface TicketListProps {
    t: (key: string) => string;
}

interface ApiTicket {
    id: number;
    uuid: string;
    title: string;
    created_at: string;
    status?: {
        name: string;
        color?: string;
    };
    category?: {
        name: string;
    };
    priority?: {
        name: string;
        color?: string;
    };
    unread_count?: number;
    has_unread_messages_since_last_reply?: boolean;
}

export function TicketList({ t }: TicketListProps) {
    const [tickets, setTickets] = useState<ApiTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchTickets = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/user/tickets', {
                params: {
                    limit: 5,
                    page: 1,
                },
            });
            setTickets(data.data?.tickets || []);
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchTickets();

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

    if (loading) {
        return (
            <div className='border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 backdrop-blur-xl'>
                <div className='flex items-center justify-between'>
                    <div className='bg-muted h-6 w-32 animate-pulse rounded' />
                    <div className='bg-muted h-4 w-16 animate-pulse rounded' />
                </div>
                <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='bg-muted/50 h-16 animate-pulse rounded-lg' />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return null;
    }

    return (
        <div className='border-border/50 bg-card/50 rounded-xl border backdrop-blur-xl'>
            <div className='border-border flex min-w-0 flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
                <div className='flex min-w-0 items-center gap-2'>
                    <Ticket className='text-muted-foreground h-5 w-5' />
                    <h2 className='truncate text-base font-bold sm:text-lg'>{t('dashboard.tickets.title')}</h2>
                </div>
                <Link
                    href='/dashboard/tickets'
                    className='text-primary hover:text-primary/80 self-start text-xs font-medium whitespace-nowrap transition-colors sm:self-auto sm:text-sm'
                >
                    {t('dashboard.tickets.view_all')} &rarr;
                </Link>
            </div>

            <div className='divide-border divide-y'>
                {tickets.length > 0 ? (
                    tickets.map((ticket) => (
                        <Link
                            key={ticket.uuid}
                            href={`/dashboard/tickets/${ticket.uuid}`}
                            className={`hover:bg-muted/50 group block border-l-2 p-4 transition-colors ${
                                ticket.has_unread_messages_since_last_reply
                                    ? 'border-l-red-500 bg-red-500/5'
                                    : 'border-l-transparent'
                            }`}
                        >
                            <div className='flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4'>
                                <div className='flex min-w-0 items-start gap-3 sm:gap-4'>
                                    <div
                                        className={`mt-1 shrink-0 rounded-full p-2 sm:mt-0 ${
                                            ticket.has_unread_messages_since_last_reply
                                                ? 'bg-red-500/15 text-red-500'
                                                : 'bg-primary/5 text-primary'
                                        }`}
                                    >
                                        <MessageSquare className='h-5 w-5' />
                                    </div>
                                    <div className='min-w-0'>
                                        <h4
                                            className='text-foreground group-hover:text-primary line-clamp-2 text-sm font-medium break-words transition-colors sm:text-base'
                                            title={ticket.title}
                                        >
                                            {ticket.title}
                                        </h4>
                                        <div className='text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs'>
                                            <span className='font-mono'>#{ticket.id}</span>
                                            {ticket.has_unread_messages_since_last_reply && (
                                                <>
                                                    <span className='hidden sm:inline'>•</span>
                                                    <span className='font-semibold text-red-600 dark:text-red-300'>
                                                        {ticket.unread_count ?? 0} new
                                                    </span>
                                                </>
                                            )}
                                            {ticket.category && (
                                                <>
                                                    <span className='hidden sm:inline'>•</span>
                                                    <span>{ticket.category.name}</span>
                                                </>
                                            )}
                                            <span className='hidden sm:inline'>•</span>
                                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className='flex min-w-0 flex-wrap items-center gap-1.5 pl-10 sm:gap-2 sm:pl-0'>
                                    {ticket.has_unread_messages_since_last_reply && (
                                        <Badge
                                            variant='destructive'
                                            className='max-w-[9rem] truncate px-1.5 py-0.5 text-[10px]'
                                        >
                                            NEW REPLY
                                        </Badge>
                                    )}
                                    {ticket.priority && (
                                        <Badge
                                            variant='secondary'
                                            className='max-w-[9rem] truncate px-1.5 py-0.5 text-[10px]'
                                            style={
                                                ticket.priority.color
                                                    ? { backgroundColor: ticket.priority.color, color: '#fff' }
                                                    : undefined
                                            }
                                        >
                                            {ticket.priority.name}
                                        </Badge>
                                    )}
                                    {ticket.status && (
                                        <Badge
                                            variant='outline'
                                            className='max-w-[9rem] truncate px-1.5 py-0.5 text-[10px]'
                                            style={
                                                ticket.status.color
                                                    ? { borderColor: ticket.status.color, color: ticket.status.color }
                                                    : undefined
                                            }
                                        >
                                            {ticket.status.name}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className='text-muted-foreground p-8 text-center'>
                        <Ticket className='mx-auto mb-2 h-8 w-8 opacity-50' />
                        <p>{t('dashboard.tickets.no_tickets')}</p>
                        <Link
                            href='/dashboard/tickets/create'
                            className='text-primary mt-4 inline-flex items-center text-sm hover:underline'
                        >
                            {t('dashboard.tickets.create_new')}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
