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

import { useState, useEffect } from 'react';
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
}

export function TicketList({ t }: TicketListProps) {
    const [tickets, setTickets] = useState<ApiTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchTickets = async () => {
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
        };

        fetchTickets();
    }, []);

    if (loading) {
        return (
            <div className='rounded-xl border border-border bg-card shadow-sm p-6 space-y-4'>
                <div className='flex items-center justify-between'>
                    <div className='h-6 w-32 bg-muted animate-pulse rounded' />
                    <div className='h-4 w-16 bg-muted animate-pulse rounded' />
                </div>
                <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='h-16 bg-muted/50 animate-pulse rounded-lg' />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return null;
    }

    return (
        <div className='rounded-xl border border-border bg-card shadow-sm'>
            <div className='flex items-center justify-between p-6 border-b border-border'>
                <div className='flex items-center gap-2'>
                    <Ticket className='h-5 w-5 text-muted-foreground' />
                    <h2 className='text-lg font-bold'>{t('dashboard.tickets.title')}</h2>
                </div>
                <Link
                    href='/dashboard/tickets'
                    className='text-sm font-medium text-primary hover:text-primary/80 transition-colors'
                >
                    {t('dashboard.tickets.view_all')} &rarr;
                </Link>
            </div>

            <div className='divide-y divide-border'>
                {tickets.length > 0 ? (
                    tickets.map((ticket) => (
                        <Link
                            key={ticket.uuid}
                            href={`/dashboard/tickets/${ticket.uuid}`}
                            className='block p-4 hover:bg-muted/50 transition-colors group'
                        >
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                                <div className='flex items-start gap-4'>
                                    <div className='p-2 rounded-full bg-primary/5 text-primary shrink-0 mt-1 sm:mt-0'>
                                        <MessageSquare className='h-5 w-5' />
                                    </div>
                                    <div>
                                        <h4 className='font-medium text-foreground group-hover:text-primary transition-colors text-sm sm:text-base'>
                                            {ticket.title}
                                        </h4>
                                        <div className='flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground'>
                                            <span className='font-mono'>#{ticket.id}</span>
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

                                <div className='flex items-center gap-2 pl-11 sm:pl-0'>
                                    {ticket.priority && (
                                        <Badge
                                            variant='secondary'
                                            className='text-[10px] px-1.5 py-0.5'
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
                                            className='text-[10px] px-1.5 py-0.5'
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
                    <div className='p-8 text-center text-muted-foreground'>
                        <Ticket className='h-8 w-8 mx-auto mb-2 opacity-50' />
                        <p>{t('dashboard.tickets.no_tickets')}</p>
                        <Link
                            href='/dashboard/tickets/create'
                            className='mt-4 inline-flex items-center text-sm text-primary hover:underline'
                        >
                            {t('dashboard.tickets.create_new')}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
