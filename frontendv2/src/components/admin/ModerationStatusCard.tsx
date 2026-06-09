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

import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz } from '@/lib/dateUtils';
import { AlertTriangle } from 'lucide-react';

export interface ModerationStaffActor {
    uuid?: string | null;
    username?: string | null;
}

interface ModerationStatusCardProps {
    active: boolean;
    reason?: string | null;
    actedAt?: string | null;
    actedBy?: ModerationStaffActor | null;
    title: string;
    inactiveLabel: string;
}

export function ModerationStatusCard({
    active,
    reason,
    actedAt,
    actedBy,
    title,
    inactiveLabel,
}: ModerationStatusCardProps) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();

    if (!active) {
        return <p className='text-muted-foreground text-sm'>{inactiveLabel}</p>;
    }

    return (
        <div className='border-destructive/30 bg-destructive/5 space-y-3 rounded-xl border p-4'>
            <div className='text-destructive flex items-center gap-2 text-sm font-semibold'>
                <AlertTriangle className='h-4 w-4' />
                {title}
            </div>
            <div className='space-y-2 text-sm'>
                <div>
                    <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                        {t('admin.moderation.status_reason')}
                    </p>
                    <p className='mt-1 whitespace-pre-wrap'>
                        {reason?.trim() || t('admin.moderation.no_reason_recorded')}
                    </p>
                </div>
                <div className='grid gap-2 sm:grid-cols-2'>
                    <div>
                        <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                            {t('admin.moderation.status_by')}
                        </p>
                        <p className='mt-1'>
                            {actedBy?.username || actedBy?.uuid || t('admin.moderation.unknown_staff')}
                        </p>
                    </div>
                    <div>
                        <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                            {t('admin.moderation.status_at')}
                        </p>
                        <p className='mt-1'>
                            {actedAt ? formatDateTimeInTz(actedAt, dateOpts) : t('admin.moderation.unknown_time')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
