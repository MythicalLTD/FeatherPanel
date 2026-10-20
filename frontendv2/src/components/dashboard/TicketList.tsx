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

import { LifeBuoy, MessageSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { DashboardPanel } from './DashboardOverview';

export interface DashboardTicket {
    id: number;
    uuid: string;
    title: string;
    created_at: string;
    updated_at?: string;
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

interface TicketListProps {
    t: (key: string, params?: Record<string, string>) => string;
    tickets: DashboardTicket[];
    loading: boolean;
}

/** Support widget: the user's latest tickets, or a short way to open one. */
export function TicketList({ t, tickets, loading }: TicketListProps) {
    const dateOpts = useDateFormatOptions();

    if (loading) {
        return (
            <div className='fp-surface space-y-2 rounded-xl border p-4' aria-busy='true'>
                <div className='bg-muted h-4 w-28 animate-pulse rounded' />
                {[0, 1].map((i) => (
                    <div key={i} className='bg-muted/50 h-10 animate-pulse rounded-lg' />
                ))}
            </div>
        );
    }

    if (tickets.length === 0) {
        return (
            <DashboardPanel title={t('dashboard.home.support.title')} icon={LifeBuoy}>
                <p className='text-muted-foreground text-sm'>{t('dashboard.home.support.empty')}</p>
                <Link
                    href='/dashboard/tickets/create'
                    className='text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1 text-sm font-medium'
                >
                    <Plus className='h-4 w-4' />
                    {t('dashboard.tickets.create_new')}
                </Link>
            </DashboardPanel>
        );
    }

    return (
        <DashboardPanel
            title={t('dashboard.home.support.title')}
            icon={LifeBuoy}
            action={{ label: t('dashboard.tickets.view_all'), href: '/dashboard/tickets' }}
            flush
        >
            {tickets.map((ticket) => {
                const unread = Boolean(ticket.has_unread_messages_since_last_reply);
                return (
                    <Link
                        key={ticket.uuid}
                        href={`/dashboard/tickets/${ticket.uuid}`}
                        className={cn(
                            'hover:bg-muted/40 flex min-w-0 items-start gap-3 px-4 py-2.5 transition-colors',
                            unread && 'bg-primary/5',
                        )}
                    >
                        <span
                            className={cn(
                                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                unread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                            )}
                        >
                            <MessageSquare className='h-4 w-4' />
                        </span>
                        <span className='min-w-0 flex-1'>
                            <span className='block truncate text-sm font-medium' title={ticket.title}>
                                {ticket.title}
                            </span>
                            <span className='text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs'>
                                <span className='font-mono'>#{ticket.id}</span>
                                {ticket.status && (
                                    <>
                                        <span aria-hidden>·</span>
                                        <span
                                            className='truncate'
                                            style={ticket.status.color ? { color: ticket.status.color } : undefined}
                                        >
                                            {ticket.status.name}
                                        </span>
                                    </>
                                )}
                                <span aria-hidden>·</span>
                                <span className='shrink-0'>
                                    {formatRelativeTime(ticket.updated_at || ticket.created_at, dateOpts)}
                                </span>
                            </span>
                        </span>
                        {unread && (
                            <span className='bg-primary text-primary-foreground mt-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold'>
                                {t('dashboard.home.support.new_replies', {
                                    count: String(ticket.unread_count || 1),
                                })}
                            </span>
                        )}
                    </Link>
                );
            })}
        </DashboardPanel>
    );
}
