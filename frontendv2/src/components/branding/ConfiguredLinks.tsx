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
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { getConfiguredLinks } from '@/lib/configured-links';
import { cn } from '@/lib/utils';

interface ConfiguredLinksProps {
    variant?: 'footer' | 'compact' | 'inline';
    className?: string;
}

function linkClassName(variant: NonNullable<ConfiguredLinksProps['variant']>) {
    return cn(
        'text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline',
        variant === 'footer' && 'text-xs font-medium',
        variant === 'compact' && 'text-[11px] font-medium',
        variant === 'inline' && 'text-[11px] font-medium',
    );
}

export function ConfiguredLinks({ variant = 'footer', className }: ConfiguredLinksProps) {
    const { settings } = useSettings();
    const { t } = useTranslation();
    const links = getConfiguredLinks(settings, t);

    if (links.length === 0) {
        return null;
    }

    return (
        <nav
            aria-label={t('links.aria_label')}
            className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-2',
                variant === 'inline' && 'justify-center',
                variant === 'compact' && 'justify-center',
                variant === 'footer' && 'md:justify-end',
                className,
            )}
        >
            {links.map((link) => {
                const classNames = linkClassName(variant);

                if (link.external) {
                    return (
                        <a
                            key={link.id}
                            href={link.href}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={classNames}
                        >
                            {link.label}
                        </a>
                    );
                }

                return (
                    <Link key={link.id} href={link.href} className={classNames}>
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
