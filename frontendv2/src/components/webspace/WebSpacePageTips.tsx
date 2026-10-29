/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

'use client';

import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import {
    Archive,
    CalendarClock,
    Database,
    FolderOpen,
    Globe,
    KeyRound,
    Lock,
    Mail,
    RotateCcw,
    Settings,
    ShieldCheck,
    Upload,
    Users,
    X,
} from 'lucide-react';
import { TipCard, TipGrid } from '@/components/featherui/TipCard';
import { useTranslation } from '@/contexts/TranslationContext';

type Tip = { icon: ComponentType<{ className?: string }>; key: string };

const PAGE_TIPS: Record<string, Tip[]> = {
    files: [
        { icon: Upload, key: 'files_t1' },
        { icon: FolderOpen, key: 'files_t2' },
    ],
    domains: [
        { icon: Globe, key: 'domains_t1' },
        { icon: Lock, key: 'domains_t2' },
    ],
    access: [
        { icon: KeyRound, key: 'access_t1' },
        { icon: ShieldCheck, key: 'access_t2' },
    ],
    backups: [
        { icon: Archive, key: 'backups_t1' },
        { icon: RotateCcw, key: 'backups_t2' },
    ],
    schedules: [
        { icon: CalendarClock, key: 'schedules_t1' },
        { icon: RotateCcw, key: 'schedules_t2' },
    ],
    databases: [
        { icon: Database, key: 'databases_t1' },
        { icon: KeyRound, key: 'databases_t2' },
    ],
    email: [
        { icon: Mail, key: 'email_t1' },
        { icon: ShieldCheck, key: 'email_t2' },
    ],
    users: [
        { icon: Users, key: 'users_t1' },
        { icon: ShieldCheck, key: 'users_t2' },
    ],
    settings: [
        { icon: Settings, key: 'settings_t1' },
        { icon: Lock, key: 'settings_t2' },
    ],
};

export type WebSpaceTipsPage = keyof typeof PAGE_TIPS;

/** Dismissible tip cards for WebSpace pages, same look as the server page tips. */
export function WebSpacePageTips({ page, className }: { page: WebSpaceTipsPage; className?: string }) {
    const { t } = useTranslation();
    const tips = PAGE_TIPS[page];
    const storageKey = `featherpanel.webspace-page-tips.${page}`;
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        setHidden(window.localStorage.getItem(storageKey) === 'hidden');
    }, [storageKey]);

    if (!tips?.length) return null;

    if (hidden) {
        return (
            <div className='flex justify-end'>
                <button
                    type='button'
                    className='text-muted-foreground hover:text-foreground text-xs transition-colors'
                    onClick={() => {
                        window.localStorage.removeItem(storageKey);
                        setHidden(false);
                    }}
                >
                    {t('server.tips.show')}
                </button>
            </div>
        );
    }

    return (
        <div className='clear-both space-y-3'>
            <div className='flex items-center justify-between gap-3'>
                <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                    {t('server.tips.title')}
                </p>
                <button
                    type='button'
                    className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors'
                    onClick={() => {
                        window.localStorage.setItem(storageKey, 'hidden');
                        setHidden(true);
                    }}
                >
                    <X className='h-3.5 w-3.5' />
                    {t('server.tips.hide')}
                </button>
            </div>
            <TipGrid className={className}>
                {tips.map((tip) => (
                    <TipCard key={tip.key} icon={tip.icon} title={t(`webSpaces.tips.${tip.key}_title`)}>
                        <p>{t(`webSpaces.tips.${tip.key}_body`)}</p>
                    </TipCard>
                ))}
            </TipGrid>
        </div>
    );
}
