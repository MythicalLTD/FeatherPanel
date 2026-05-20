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
import { useSettings } from '@/contexts/SettingsContext';
import { FEATHERPANEL_MARKETING_URL, shouldShowPoweredBy } from '@/lib/branding';
import { cn } from '@/lib/utils';

type PoweredByVariant = 'menu' | 'footer' | 'inline' | 'sidebar' | 'badge';

interface PoweredByFeatherPanelProps {
    variant?: PoweredByVariant;
    className?: string;
}

export function PoweredByFeatherPanel({ variant = 'footer', className }: PoweredByFeatherPanelProps) {
    const { settings } = useSettings();
    const { t } = useTranslation();

    if (!shouldShowPoweredBy(settings)) {
        return null;
    }

    const label = variant === 'menu' ? t('navbar.poweredBy') : t('branding.powered_by');

    const linkClassName = cn(
        'transition-colors hover:underline underline-offset-4',
        variant === 'menu' &&
            'text-muted-foreground/80 hover:text-primary text-[10px] font-normal tracking-wide lowercase underline-offset-2',
        variant === 'footer' && 'text-muted-foreground hover:text-primary text-xs font-medium',
        variant === 'inline' && 'text-muted-foreground/70 hover:text-primary text-[11px] font-medium',
        variant === 'sidebar' &&
            'text-muted-foreground/60 hover:text-primary mx-auto block text-center text-[10px] font-normal tracking-wide lowercase',
        variant === 'badge' &&
            'border-primary/20 bg-primary/10 text-primary inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase hover:no-underline',
    );

    return (
        <p className={cn(variant === 'menu' && 'text-center', className)}>
            <a href={FEATHERPANEL_MARKETING_URL} target='_blank' rel='noopener noreferrer' className={linkClassName}>
                {label}
            </a>
        </p>
    );
}
