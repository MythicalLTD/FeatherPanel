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
import { Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { resolveAccentSwatchCss } from '@/lib/accent-colors';
import { cn } from '@/lib/utils';

export default function AppearanceMenuLink() {
    const { accentColor, mounted } = useTheme();
    const { t } = useTranslation();
    const pathname = usePathname();
    const active = pathname === '/dashboard/preferences' || pathname === '/preferences' || pathname === '/prefrences';
    const swatch = resolveAccentSwatchCss(accentColor);

    if (!mounted) {
        return <div className='bg-muted/25 size-9 animate-pulse rounded-lg sm:rounded-xl' />;
    }

    return (
        <Link
            href='/dashboard/preferences'
            title={t('appearance.settingsMenuTitle')}
            className={cn(
                'relative flex size-9 items-center justify-center rounded-lg transition-colors sm:rounded-xl',
                active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground',
            )}
        >
            <Palette className='h-[1.15rem] w-[1.15rem] shrink-0' aria-hidden />
            <span
                className='border-background pointer-events-none absolute right-0.5 bottom-0.5 box-content h-1.5 w-1.5 rounded-full border-2 shadow-sm'
                style={{ backgroundColor: swatch }}
                aria-hidden
            />
        </Link>
    );
}
