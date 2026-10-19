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
import { useSession } from '@/contexts/SessionContext';
import { useFeatherOs } from './FeatherOsContext';
import { Minus, X } from 'lucide-react';

export function AboutDialog() {
    const { t } = useTranslation();
    const { user } = useSession();
    const { aboutOpen, setAboutOpen, osName, panelName, logoUrl, version, servers, windows } = useFeatherOs();
    if (!aboutOpen) return null;
    const rows: [string, string][] = [
        [t('featheros.about.version_label'), version || '-'],
        [t('featheros.about.panel'), panelName],
        [t('featheros.about.user'), user?.username ?? '-'],
        [t('featheros.about.servers'), String(servers.length)],
        [t('featheros.about.windows'), String(windows.length)],
    ];
    return (
        <div
            className='fos-fade fixed inset-0 z-[9600] flex items-center justify-center'
            onMouseDown={(e) => e.target === e.currentTarget && setAboutOpen(false)}
        >
            <div className='fos-sheet fos-pop w-[320px] overflow-hidden rounded-[14px] text-center'>
                <div className='fos-traffic-lights group flex h-10 items-center gap-2 px-3.5'>
                    <button
                        type='button'
                        aria-label={t('featheros.window.close')}
                        onClick={() => setAboutOpen(false)}
                        className='fos-traffic-light flex items-center justify-center text-black/55'
                    >
                        <span className='flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57] ring-1 ring-black/10 ring-inset'>
                            <X className='h-2 w-2 opacity-0 group-hover:opacity-100' strokeWidth={3} />
                        </span>
                    </button>
                    <span className='fos-traffic-light flex items-center justify-center'>
                        <span className='flex h-3 w-3 items-center justify-center rounded-full bg-[#febc2e] ring-1 ring-black/10 ring-inset'>
                            <Minus className='h-2 w-2 opacity-0' />
                        </span>
                    </span>
                    <span className='fos-traffic-light flex items-center justify-center'>
                        <span className='h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-black/10 ring-inset' />
                    </span>
                </div>
                <div className='px-6 pb-6'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt={osName} className='mx-auto h-20 w-20 object-contain' />
                    <h2 className='mt-3 text-xl font-semibold'>{osName}</h2>
                    <p className='mt-0.5 text-xs opacity-60'>{t('featheros.about.tagline')}</p>
                    <dl className='mt-4 space-y-1 text-left text-xs'>
                        {rows.map(([k, v]) => (
                            <div key={k} className='flex justify-between gap-4'>
                                <dt className='opacity-60'>{k}</dt>
                                <dd className='truncate font-medium'>{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className='mt-5 text-[10px] opacity-50'>{t('featheros.about.built_on')}</p>
                </div>
            </div>
        </div>
    );
}
