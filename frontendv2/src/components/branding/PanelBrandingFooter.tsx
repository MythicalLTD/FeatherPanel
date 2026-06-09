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

import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { FEATHERPANEL_MARKETING_URL, shouldShowPoweredBy } from '@/lib/branding';
import { cn } from '@/lib/utils';
import { PoweredByFeatherPanel } from '@/components/branding/PoweredByFeatherPanel';
import { ConfiguredLinks } from '@/components/branding/ConfiguredLinks';
import { getConfiguredLinks } from '@/lib/configured-links';

interface PanelBrandingFooterProps {
    appName?: string;
    className?: string;
}

export function PanelBrandingFooter({ appName, className }: PanelBrandingFooterProps) {
    const { settings, core } = useSettings();
    const { t } = useTranslation();
    const showBranding = shouldShowPoweredBy(settings);
    const configuredLinks = getConfiguredLinks(settings, t);

    if (!showBranding && configuredLinks.length === 0) {
        return null;
    }

    const displayName = appName ?? settings?.app_name ?? 'FeatherPanel';
    const version = core?.version?.replace(/^v/i, '') ?? '';

    return (
        <div className={cn('text-muted-foreground text-center text-xs transition-all duration-200', className)}>
            <ConfiguredLinks variant='inline' className='mb-4 justify-center' />
            {showBranding ? (
                <>
                    <p className='mb-2 font-medium'>
                        {t('branding.running_on', { name: displayName, version }).trim()}
                    </p>
                    <PoweredByFeatherPanel variant='inline' className='mb-2' />
                    <a
                        href={FEATHERPANEL_MARKETING_URL}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary hover:text-primary/80 inline-flex items-center gap-1.5 font-medium underline-offset-4 transition-all duration-200 hover:underline'
                    >
                        {t('branding.copyright', { company: 'MythicalSystems' })}
                        <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor' aria-hidden>
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                            />
                        </svg>
                    </a>
                </>
            ) : null}
        </div>
    );
}
