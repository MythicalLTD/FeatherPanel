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

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { APP_ICON_ART, SQUIRCLE_PATH, type IconIds } from './appIconArt';
import type { OsAppId } from './types';

/** Renders FeatherOS icon artwork. `bare` skips the squircle (desktop folders and documents). */
export function OsIcon({
    art,
    size = 48,
    bare = false,
    className,
}: {
    art: (u: IconIds) => ReactNode;
    size?: number;
    bare?: boolean;
    className?: string;
}) {
    const base = `fos-ic-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const u = (name: string) => `${base}-${name}`;
    const clip = `url(#${u('clip')})`;
    return (
        <svg
            viewBox='0 0 100 100'
            width={size}
            height={size}
            className={cn('fos-app-icon shrink-0', bare && 'is-bare', size < 28 && 'is-small', className)}
            aria-hidden
        >
            <defs>
                <clipPath id={u('clip')}>
                    <path d={SQUIRCLE_PATH} />
                </clipPath>
                <filter id={u('sh')} x='-20%' y='-20%' width='140%' height='150%'>
                    <feDropShadow dx='0' dy='1.6' stdDeviation='1.6' floodColor='#000' floodOpacity='0.3' />
                </filter>
                <linearGradient id={u('rim')} x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0' stopColor='#fff' stopOpacity='0.55' />
                    <stop offset='0.35' stopColor='#fff' stopOpacity='0.08' />
                    <stop offset='1' stopColor='#000' stopOpacity='0.18' />
                </linearGradient>
            </defs>
            {bare ? (
                art(u)
            ) : (
                <>
                    <g clipPath={clip}>{art(u)}</g>
                    <path d={SQUIRCLE_PATH} fill='none' stroke={`url(#${u('rim')})`} strokeWidth='1.4' clipPath={clip} />
                </>
            )}
        </svg>
    );
}

export function AppIcon({ app, size = 48, className }: { app: OsAppId; size?: number; className?: string }) {
    return <OsIcon art={APP_ICON_ART[app] ?? APP_ICON_ART.finder} size={size} className={className} />;
}
