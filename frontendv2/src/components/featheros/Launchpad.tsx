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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS, OS_APP_IDS } from './registry';
import { AppIcon } from './AppIcon';
import type { OsAppId } from './types';

export function Launchpad() {
    const { t } = useTranslation();
    const { launchpadOpen, setLaunchpadOpen, openApp, windows } = useFeatherOs();
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!launchpadOpen) return;
        setQuery('');
        const tmr = window.setTimeout(() => inputRef.current?.focus(), 40);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setLaunchpadOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.clearTimeout(tmr);
            window.removeEventListener('keydown', onKey);
        };
    }, [launchpadOpen, setLaunchpadOpen]);

    const apps = useMemo(() => {
        const q = query.trim().toLowerCase();
        return OS_APP_IDS.map((id) => ({
            id,
            name: t(OS_APPS[id].nameKey),
            running: windows.some((w) => w.app === id && !w.minimized),
        }))
            .filter((a) => !q || a.name.toLowerCase().includes(q) || a.id.includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [query, t, windows]);

    if (!launchpadOpen) return null;

    const launch = (id: OsAppId) => {
        setLaunchpadOpen(false);
        openApp(id);
    };

    return (
        <div
            className='fos-launchpad fos-fade'
            role='dialog'
            aria-label={t('featheros.launchpad.title', { defaultValue: 'Launchpad' })}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) setLaunchpadOpen(false);
            }}
        >
            <div className='fos-launchpad-inner' onMouseDown={(e) => e.stopPropagation()}>
                <form
                    className='fos-launchpad-search'
                    autoComplete='off'
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (apps[0]) launch(apps[0].id);
                    }}
                >
                    <Search className='h-4 w-4 opacity-50' aria-hidden />
                    <input
                        ref={inputRef}
                        type='search'
                        name='fos-launchpad-query'
                        autoComplete='off'
                        autoCorrect='off'
                        spellCheck={false}
                        data-1p-ignore='true'
                        data-lpignore='true'
                        data-bwignore='true'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('featheros.launchpad.search', { defaultValue: 'Search apps' })}
                        className='fos-launchpad-input'
                    />
                </form>
                {apps.length === 0 ? (
                    <p className='fos-launchpad-empty'>{t('featheros.spotlight.no_results')}</p>
                ) : (
                    <div className='fos-launchpad-grid'>
                        {apps.map((app) => (
                            <button
                                key={app.id}
                                type='button'
                                className={cn('fos-launchpad-app', app.running && 'is-running')}
                                onClick={() => launch(app.id)}
                            >
                                <AppIcon app={app.id} size={64} />
                                <span className='fos-launchpad-app-name'>{app.name}</span>
                                {app.running && <span className='fos-launchpad-dot' aria-hidden />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
