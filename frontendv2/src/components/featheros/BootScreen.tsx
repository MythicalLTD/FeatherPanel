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

/** Boot / loading screen: panel logo, "<Panel name> OS" and a progress bar. */
export function BootScreen({
    logoUrl,
    osName,
    leaving,
    progress = 0.1,
    status,
}: {
    logoUrl: string;
    osName: string;
    leaving: boolean;
    progress?: number;
    status?: string;
}) {
    const pct = Math.max(0.04, Math.min(1, progress));
    return (
        <div
            className={cn(
                'fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-[#000000] text-white transition-opacity duration-500',
                leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
            )}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={osName} className='h-20 w-20 object-contain' />
            <div className='mt-7 text-[17px] font-medium tracking-tight text-white/90'>{osName}</div>
            <div className='mt-10 h-[3px] w-44 overflow-hidden rounded-full bg-white/12'>
                <div
                    className='fos-boot-bar-fill h-full rounded-full bg-white/85'
                    style={{ width: `${pct * 100}%` }}
                />
            </div>
            {status && (
                <div className='mt-3 text-[11px] tracking-wide text-white/45' aria-live='polite'>
                    {status}
                </div>
            )}
        </div>
    );
}
