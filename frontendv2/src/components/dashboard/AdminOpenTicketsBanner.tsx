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

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import Permissions from '@/lib/permissions';
import { Button } from '@/components/featherui/Button';
import { cn } from '@/lib/utils';

const DISMISS_STORAGE_KEY = 'featherpanel_dismiss_admin_open_tickets_dashboard';

function readDismissedCount(): number | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
        if (raw === null || raw === '') {
            return null;
        }
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function AdminOpenTicketsBanner({ className }: { className?: string }) {
    const { hasPermission, adminTicketStats } = useSession();
    const { t } = useTranslation();

    const [hydrated, setHydrated] = useState(false);
    const [shouldShow, setShouldShow] = useState(false);

    const openCount = adminTicketStats?.open_count ?? 0;

    // Only show the banner if it hasn't been dismissed for this openCount
    useEffect(() => {
        setHydrated(true);
        if (typeof window !== 'undefined') {
            const dismissedCount = readDismissedCount();
            if (
                openCount > 0 &&
                hasPermission(Permissions.ADMIN_TICKETS_VIEW) &&
                (dismissedCount === null || dismissedCount < openCount)
            ) {
                setShouldShow(true);
            } else {
                setShouldShow(false);
            }
        }
    }, [openCount, hasPermission]);

    const handleDismiss = () => {
        try {
            localStorage.setItem(DISMISS_STORAGE_KEY, String(openCount));
        } catch {
            // ignore storage failures
        }
        setShouldShow(false);
    };

    if (!hydrated) {
        return null;
    }

    if (!shouldShow) {
        return null;
    }

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 shadow-sm dark:text-amber-200',
                className,
            )}
        >
            <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
                <div className='flex items-start gap-3 pr-8 sm:pr-0'>
                    <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300' />
                    <div>
                        <h3 className='text-sm font-semibold tracking-wide uppercase'>
                            {t('tickets.adminOpenTicketsTitle')}
                        </h3>
                        <p className='mt-1 text-sm opacity-90'>
                            {t('tickets.adminOpenTicketsDescription').replace('{count}', String(openCount))}
                        </p>
                    </div>
                </div>
                <div className='flex shrink-0 flex-wrap gap-2'>
                    <Button asChild variant='outline' size='sm' className='bg-background/50 border-amber-500/30'>
                        <Link href='/dashboard/tickets'>{t('tickets.adminViewOpenTickets')}</Link>
                    </Button>
                    <Button asChild size='sm' className='bg-amber-600 text-white hover:bg-amber-600/90'>
                        <Link href='/admin/tickets'>{t('tickets.adminManageTickets')}</Link>
                    </Button>
                    <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='text-amber-800 hover:bg-amber-500/15 dark:text-amber-200'
                        onClick={handleDismiss}
                    >
                        {t('tickets.adminDismissOpenTicketsBanner')}
                    </Button>
                </div>
            </div>
            <button
                type='button'
                onClick={handleDismiss}
                className='absolute top-3 right-3 rounded-lg p-1 transition-colors hover:bg-amber-500/15 sm:hidden'
                aria-label={t('tickets.adminDismissOpenTicketsBanner')}
            >
                <X className='h-4 w-4 opacity-70' />
            </button>
        </div>
    );
}
