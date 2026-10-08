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

import { AdminWidgetLoading } from './AdminWidgetLoading';

import { useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Lock, Ticket } from 'lucide-react';
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
            className='space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
            action={
                state !== 'forbidden' ? (
                    <Link
                        href='/admin/tickets'
                        className='text-muted-foreground hover:text-foreground hover:bg-accent inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium transition-colors'
                    >
                        {t('admin.support_tickets.view_all')}
                    </Link>
                ) : undefined
            }
        >
            {state === 'loading' && <AdminWidgetLoading label={t('admin.support_tickets.title')} />}

            {state === 'forbidden' && (
                <div className='flex flex-col items-center gap-3 py-3 text-center'>
                    <Lock className='text-muted-foreground h-5 w-5' />
                    <p className='text-sm font-bold'>{t('admin.support_tickets.no_permission')}</p>
                    <p className='text-muted-foreground max-w-xs text-xs font-medium'>
                        {t('admin.support_tickets.no_permission_desc')}
                    </p>
                </div>
            )}

            {(state === 'empty' || state === 'error') && (
                <div className='flex flex-col items-center gap-3 py-3 text-center'>
                    <p className='text-sm font-bold'>
                        {state === 'error' ? t('admin.support_tickets.error') : t('admin.support_tickets.empty')}
                    </p>
                    {state === 'error' && (
                        <button
                            type='button'
                            onClick={retryFetchTickets}
                            className='bg-secondary min-h-11 rounded-lg px-4 py-2 text-sm font-medium'
                        >
                            {t('admin.support_tickets.retry')}
                        </button>
                    )}
                </div>
            )}

            {state === 'ready' && (
                <div className='divide-border divide-y'>
                    {tickets.map((ticket) => (
                        <Link
                            key={ticket.uuid}
                            href={`/admin/tickets/${ticket.uuid}`}
                            className='group hover:bg-accent flex min-h-11 flex-wrap items-start gap-3 rounded-md py-3.5 transition-colors'
                        >
                            <div className='min-w-0 flex-1 space-y-1'>
                                <p className='text-sm font-medium wrap-break-word'>{ticket.title}</p>
                                <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed'>
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
                                <span className='bg-muted text-foreground max-w-full rounded-md px-2 py-1 text-xs font-medium'>
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
