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

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'featherpanel_demo_banner_dismissed';

export function DemoModeBanner() {
    const { settings } = useSettings();
    const { t } = useTranslation();
    const [dismissed, setDismissed] = useState(true); // hide until we read storage (avoid flash)

    const isDemo = settings?.app_demo_yes === 'true';

    useEffect(() => {
        if (!isDemo) {
            return;
        }
        try {
            setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
        } catch {
            setDismissed(false);
        }
    }, [isDemo]);

    if (!isDemo || dismissed) {
        return null;
    }

    const dismiss = () => {
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // ignore
        }
        setDismissed(true);
    };

    return (
        <div
            role='status'
            className={cn(
                'border-border/60 bg-muted/80 text-muted-foreground z-40 border-b px-3 py-1.5 backdrop-blur-sm',
            )}
        >
            <div className='mx-auto flex max-w-7xl items-center gap-2'>
                <p className='min-w-0 flex-1 truncate text-xs sm:text-sm'>
                    <span className='text-foreground/80 font-medium'>{t('demo.banner.title')}</span>
                    <span className='mx-1.5 opacity-40' aria-hidden>
                        ·
                    </span>
                    <span>{t('demo.banner.body')}</span>
                </p>
                <button
                    type='button'
                    onClick={dismiss}
                    className='text-muted-foreground hover:bg-background/60 hover:text-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors'
                    aria-label={t('demo.banner.dismiss')}
                >
                    <X className='h-3.5 w-3.5' aria-hidden />
                </button>
            </div>
        </div>
    );
}
