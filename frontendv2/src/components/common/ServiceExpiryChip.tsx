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

import { CalendarClock } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';
import { daysUntilExpiry, formatExpiryAbsolute, getExpiryTone, type ExpiryTone } from '@/lib/service-expiry';

const toneClass: Record<ExpiryTone, string> = {
    expired: 'border-destructive/40 bg-destructive/10 text-destructive',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    normal: 'border-border/50 bg-muted/40 text-foreground',
};

interface ServiceExpiryChipProps {
    expiresAt?: string | null;
    className?: string;
    /** Compact chips omit the calendar icon (e.g. dense list rows). */
    compact?: boolean;
}

/**
 * Read-only badge for service `expires_at`. Renders nothing when unset.
 */
export function ServiceExpiryChip({ expiresAt, className, compact = false }: ServiceExpiryChipProps) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const days = daysUntilExpiry(expiresAt);
    const tone = getExpiryTone(days);
    const absolute = formatExpiryAbsolute(expiresAt, dateOpts);

    if (days === null || tone === null || !absolute) return null;

    const label =
        tone === 'expired'
            ? t('service_expiry.expired')
            : days === 0
              ? t('service_expiry.expires_today')
              : days <= 7
                ? t('service_expiry.expires_in_days', { days: String(days) })
                : t('service_expiry.expires_on', { date: absolute });

    const title =
        tone === 'expired'
            ? t('service_expiry.expired_hint', { date: absolute })
            : t('service_expiry.hint', { date: absolute });

    return (
        <span
            className={cn(
                'inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium',
                toneClass[tone],
                className,
            )}
            title={title}
        >
            {!compact ? <CalendarClock className='h-3.5 w-3.5 shrink-0 opacity-80' aria-hidden /> : null}
            <span className='truncate tabular-nums'>{label}</span>
        </span>
    );
}
