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

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useFeatherOs } from './FeatherOsContext';
import { Minus, X } from 'lucide-react';

export function AboutDialog() {
    const { t } = useTranslation();
    const { user } = useSession();
    const { aboutOpen, setAboutOpen, osName, panelName, logoUrl, version, servers, windows } = useFeatherOs();
    const panelRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!aboutOpen) return;
        setOffset({ x: 0, y: 0 });
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAboutOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [aboutOpen, setAboutOpen]);

    if (!aboutOpen) return null;

    const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('button, a, input')) return;
        const panel = panelRef.current;
        if (!panel) return;
        e.preventDefault();
        const rect = panel.getBoundingClientRect();
        const start = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        const minTop = 28 - rect.top;
        const onMove = (ev: PointerEvent) => {
            const dx = Math.max(-rect.left - rect.width + 80, Math.min(window.innerWidth - rect.left - 80, ev.clientX - start.x));
            const dy = Math.max(minTop, Math.min(window.innerHeight - rect.top - 44, ev.clientY - start.y));
            setOffset({ x: start.ox + dx, y: start.oy + dy });
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };
    const rows: [string, string][] = [
        [t('featheros.about.version_label'), version || '-'],
        [t('featheros.about.panel'), panelName],
        [t('featheros.about.user'), user?.username ?? '-'],
        [t('featheros.about.servers'), String(servers.length)],
        [t('featheros.about.windows'), String(windows.length)],
    ];
    return (
        <div className='pointer-events-none fixed inset-0 z-[9600] flex items-center justify-center'>
            <div
                ref={panelRef}
                role='dialog'
                aria-label={osName}
                className='fos-sheet fos-pop fos-about pointer-events-auto w-[320px] cursor-default overflow-hidden rounded-[var(--fos-radius,14px)] text-center select-none'
                style={{ translate: `${offset.x}px ${offset.y}px` }}
                onPointerDown={startDrag}
            >
                <div className='flex h-11 items-center px-4'>
                    <div className='fos-traffic-lights group flex items-center'>
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
                </div>
                <div className='px-7 pt-1 pb-7'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt={osName} className='mx-auto h-20 w-20 object-contain' />
                    <h2 className='mt-3 text-xl font-semibold'>{osName}</h2>
                    <p className='mt-0.5 text-xs opacity-60'>{t('featheros.about.tagline')}</p>
                    <dl className='fos-about-rows mt-5 text-left text-xs'>
                        {rows.map(([k, v]) => (
                            <div key={k} className='flex justify-between gap-4 px-3 py-1.5'>
                                <dt className='opacity-60'>{k}</dt>
                                <dd className='truncate font-medium'>{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className='mt-4 text-[10px] opacity-50'>{t('featheros.about.built_on')}</p>
                </div>
            </div>
        </div>
    );
}
