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

import { useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ArrowUpRight, Lock, Ticket } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { useAdminWidgetList } from '@/hooks/useAdminWidgetList';

interface TicketItem {
    id: number;
    uuid: string;
    title: string;
    created_at: string;
    user?: { username?: string };
    status?: { name?: string; color?: string };
    priority?: { name?: string; color?: string };
}

export function SupportTicketsWidget() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();

    const fetchTickets = useCallback(
        () =>
            axios.get('/api/admin/tickets', {
                params: { page: 1, limit: 6 },
                withCredentials: true,
            }),
        [],
    );
    const extractTickets = useCallback(
        (data: unknown) => (data as { tickets?: TicketItem[] } | undefined)?.tickets || [],
        [],
    );
    const { items: tickets, state, retry: retryFetchTickets } = useAdminWidgetList(fetchTickets, extractTickets);

    return (
        <PageCard
            title={t('admin.support_tickets.title')}
            description={t('admin.support_tickets.description')}
            icon={Ticket}
            className='h-full'
            action={
                state !== 'forbidden' ? (
                    <Link
                        href='/admin/tickets'
                        className='text-muted-foreground hover:text-primary flex items-center gap-1 text-[9px] font-black tracking-widest uppercase transition-colors md:text-[10px]'
                    >
                        {t('admin.support_tickets.view_all')}
                        <ArrowUpRight className='h-3.5 w-3.5' />
                    </Link>
                ) : undefined
            }
        >
            {state === 'loading' && (
                <div className='space-y-3'>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className='bg-muted/20 h-14 animate-pulse rounded-2xl' />
                    ))}
                </div>
            )}

            {state === 'forbidden' && (
                <div className='flex flex-col items-center gap-3 py-10 text-center'>
                    <Lock className='text-muted-foreground h-5 w-5' />
                    <p className='text-sm font-bold'>{t('admin.support_tickets.no_permission')}</p>
                    <p className='text-muted-foreground max-w-xs text-xs font-medium'>
                        {t('admin.support_tickets.no_permission_desc')}
                    </p>
                </div>
            )}

            {(state === 'empty' || state === 'error') && (
                <div className='flex flex-col items-center gap-3 py-10 text-center'>
                    <p className='text-sm font-bold'>
                        {state === 'error' ? t('admin.support_tickets.error') : t('admin.support_tickets.empty')}
                    </p>
                    {state === 'error' && (
                        <button
                            type='button'
                            onClick={retryFetchTickets}
                            className='bg-secondary border-border/50 rounded-xl border px-4 py-2 text-[10px] font-black tracking-widest uppercase'
                        >
                            {t('admin.support_tickets.retry')}
                        </button>
                    )}
                </div>
            )}

            {state === 'ready' && (
                <div className='space-y-2'>
                    {tickets.map((ticket) => (
                        <Link
                            key={ticket.uuid}
                            href={`/admin/tickets/${ticket.uuid}`}
                            className='bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20 group flex items-start gap-3 rounded-2xl border p-3 transition-all'
                        >
                            <div className='bg-primary/10 text-primary border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border'>
                                <Ticket className='h-4 w-4' />
                            </div>
                            <div className='min-w-0 flex-1 space-y-1'>
                                <p className='truncate text-sm font-bold'>{ticket.title}</p>
                                <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium'>
                                    <span>{ticket.user?.username || t('admin.support_tickets.unknown_user')}</span>
                                    <span aria-hidden>·</span>
                                    <span>
                                        {formatRelativeTime(ticket.created_at, {
                                            ...dateOpts,
                                            relativeStyle: 'long',
                                        })}
                                    </span>
                                </div>
                            </div>
                            {ticket.status?.name && (
                                <span
                                    className='shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black tracking-wider uppercase'
                                    style={{
                                        color: ticket.status.color || undefined,
                                        backgroundColor: ticket.status.color
                                            ? `${ticket.status.color}22`
                                            : 'hsl(var(--muted))',
                                    }}
                                >
                                    {ticket.status.name}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </PageCard>
    );
}
