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

import { useMemo, useState } from 'react';
import { Search, ServerOff } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from './FeatherOsContext';
import { serverState, stateColor } from './utils';
import { cn } from '@/lib/utils';

/** Shown inside server scoped apps until a server is chosen. */
export function ServerPicker({
    permission,
    onPick,
    title,
}: {
    permission?: string;
    onPick: (uuidShort: string) => void;
    title?: string;
}) {
    const { t } = useTranslation();
    const { serversWith, live, serversLoading } = useFeatherOs();
    const [query, setQuery] = useState('');
    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        return serversWith(permission).filter(
            (s) => !q || s.name.toLowerCase().includes(q) || s.uuidShort.toLowerCase().includes(q),
        );
    }, [serversWith, permission, query]);

    return (
        <div className='fos-picker'>
            <h2 className='fos-picker-title'>{title || t('featheros.picker.title')}</h2>
            <p className='fos-picker-subtitle'>{t('featheros.picker.subtitle')}</p>
            <div className='fos-picker-search'>
                <Search className='fos-picker-search-icon' aria-hidden />
                <input
                    autoFocus
                    type='search'
                    name='fos-picker-search'
                    autoComplete='off'
                    autoCorrect='off'
                    spellCheck={false}
                    data-1p-ignore
                    data-lpignore='true'
                    data-form-type='other'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('featheros.picker.search')}
                    className='fos-picker-search-input'
                />
            </div>
            <div className='fos-picker-list fos-scroll'>
                {list.length === 0 && !serversLoading && (
                    <div className='fos-picker-empty'>
                        <ServerOff className='h-6 w-6 opacity-50' />
                        {t('featheros.picker.empty')}
                    </div>
                )}
                {list.map((s) => {
                    const state = serverState(s, live[s.uuidShort]?.status);
                    return (
                        <button
                            key={s.uuidShort}
                            type='button'
                            onClick={() => onPick(s.uuidShort)}
                            className='fos-picker-row'
                        >
                            <span className={cn('fos-picker-dot', stateColor(state))} />
                            <span className='fos-picker-meta'>
                                <span className='fos-picker-name'>{s.name}</span>
                                <span className='fos-picker-detail'>
                                    {s.spell?.name ?? s.uuidShort} · {s.node?.name ?? ''}
                                </span>
                            </span>
                            <span className='fos-picker-state'>
                                {t(`featheros.state.${state}`, { defaultValue: state })}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
