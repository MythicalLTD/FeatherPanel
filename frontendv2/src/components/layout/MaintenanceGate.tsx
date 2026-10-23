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

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench, LogOut } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import Permissions from '@/lib/permissions';

/**
 * Maintenance mode: staff with admin dashboard access keep using the panel with a
 * banner on top, everyone else gets the maintenance notice. The API enforces the
 * same rule, this only keeps the UI honest.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
    const { settings } = useSettings();
    const { hasPermission } = useSession();
    const { t } = useTranslation();
    const pathname = usePathname();

    // The status page stays reachable so users can follow the maintenance there.
    if (settings?.maintenance_mode_enabled !== 'true' || pathname?.startsWith('/dashboard/status')) {
        return <>{children}</>;
    }

    const message = settings?.maintenance_mode_message?.trim() || t('maintenance.defaultMessage');

    if (hasPermission(Permissions.ADMIN_DASHBOARD_VIEW)) {
        return (
            <>
                <div className='mb-5 flex shrink-0 items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
                    <Wrench className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
                    <div className='min-w-0'>
                        <p className='font-semibold'>{t('maintenance.adminBanner')}</p>
                        <p className='text-muted-foreground'>{message}</p>
                    </div>
                </div>
                {children}
            </>
        );
    }

    const statusEnabled = settings?.status_page_enabled === 'true';

    return (
        <div className='flex min-h-[60vh] items-center justify-center px-4'>
            <div className='fp-surface w-full max-w-lg rounded-2xl border p-8 text-center'>
                <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15'>
                    <Wrench className='h-6 w-6 text-amber-500' />
                </div>
                <h1 className='text-xl font-bold'>{t('maintenance.title')}</h1>
                <p className='text-muted-foreground mt-2 text-sm whitespace-pre-line'>{message}</p>
                <div className='mt-6 flex flex-col justify-center gap-2 sm:flex-row'>
                    {statusEnabled && (
                        <Button asChild variant='outline'>
                            <Link href='/dashboard/status'>{t('maintenance.viewStatus')}</Link>
                        </Button>
                    )}
                    <Button asChild variant='ghost'>
                        <Link href='/auth/logout'>
                            <LogOut className='mr-2 h-4 w-4' />
                            {t('maintenance.logout')}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
