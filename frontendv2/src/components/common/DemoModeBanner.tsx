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

import { AlertTriangle } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';

export function DemoModeBanner() {
    const { settings } = useSettings();
    const { t } = useTranslation();

    if (settings?.app_demo_yes !== 'true') {
        return null;
    }

    return (
        <div
            role='status'
            className='sticky top-0 z-[100] border-b border-amber-600/50 bg-amber-500 px-3 py-2.5 text-amber-950 shadow-sm dark:border-amber-400/40 dark:bg-amber-500 dark:text-amber-950'
        >
            <div className='mx-auto flex max-w-7xl items-start gap-2.5 sm:items-center'>
                <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 sm:mt-0' aria-hidden />
                <div className='min-w-0 text-xs leading-relaxed sm:text-sm'>
                    <span className='font-semibold tracking-wide uppercase'>{t('demo.banner.title')}</span>
                    <span className='mx-1.5 hidden text-amber-900/70 sm:inline' aria-hidden>
                        —
                    </span>
                    <span className='mt-0.5 block font-medium sm:mt-0 sm:inline'>{t('demo.banner.body')}</span>
                </div>
            </div>
        </div>
    );
}
