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

import { cn } from '@/lib/utils';
import { flagCdnSrcSet, flagCdnUrl, localeToFlagCode } from '@/lib/locale-flags';

type LocaleFlagProps = {
    locale: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const SIZE_PX = {
    sm: 20,
    md: 24,
    lg: 32,
} as const;

export default function LocaleFlag({ locale, size = 'md', className }: LocaleFlagProps) {
    const flagCode = localeToFlagCode(locale);
    const px = SIZE_PX[size];

    return (
        <span
            className={cn(
                'border-border/60 bg-muted/30 relative inline-flex shrink-0 overflow-hidden rounded-md border shadow-sm',
                size === 'sm' && 'h-[15px] w-5',
                size === 'md' && 'h-[18px] w-6',
                size === 'lg' && 'h-6 w-8',
                className,
            )}
            aria-hidden
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={flagCdnUrl(flagCode, px)}
                srcSet={flagCdnSrcSet(flagCode, px)}
                alt=''
                className='h-full w-full object-cover'
                loading='lazy'
                decoding='async'
            />
        </span>
    );
}
