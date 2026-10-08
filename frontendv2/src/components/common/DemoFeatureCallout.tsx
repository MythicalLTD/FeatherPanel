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

import { Info } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

/**
 * Compact callout listing which showcase features are on vs locked on demo panels.
 */
export function DemoFeatureCallout({ className }: { className?: string }) {
    const isDemo = useDemoMode();
    const { t } = useTranslation();

    if (!isDemo) {
        return null;
    }

    return (
        <div
            className={cn(
                'rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sky-950 shadow-sm dark:text-sky-50',
                className,
            )}
        >
            <div className='flex items-start gap-3'>
                <Info className='mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-300' />
                <div className='min-w-0 space-y-2 text-sm'>
                    <p className='font-semibold'>{t('demo.features.title')}</p>
                    <p className='text-sky-900/90 dark:text-sky-50/90'>{t('demo.features.intro')}</p>
                    <div className='grid gap-3 sm:grid-cols-2'>
                        <div>
                            <p className='mb-1 text-xs font-semibold tracking-wide uppercase opacity-80'>
                                {t('demo.features.enabled_title')}
                            </p>
                            <ul className='list-inside list-disc space-y-0.5 text-xs leading-relaxed opacity-90'>
                                <li>{t('demo.features.enabled.trash')}</li>
                                <li>{t('demo.features.enabled.chatbot')}</li>
                                <li>{t('demo.features.enabled.status')}</li>
                                <li>{t('demo.features.enabled.tickets')}</li>
                                <li>{t('demo.features.enabled.schedules')}</li>
                                <li>{t('demo.features.enabled.settings')}</li>
                                <li>{t('demo.features.enabled.databases')}</li>
                            </ul>
                        </div>
                        <div>
                            <p className='mb-1 text-xs font-semibold tracking-wide uppercase opacity-80'>
                                {t('demo.features.disabled_title')}
                            </p>
                            <ul className='list-inside list-disc space-y-0.5 text-xs leading-relaxed opacity-90'>
                                <li>{t('demo.features.disabled.cloud')}</li>
                                <li>{t('demo.features.disabled.plugins')}</li>
                                <li>{t('demo.features.disabled.console')}</li>
                                <li>{t('demo.features.disabled.snapshots')}</li>
                            </ul>
                        </div>
                    </div>
                    <p className='text-xs font-medium opacity-80'>{t('demo.features.not_production')}</p>
                </div>
            </div>
        </div>
    );
}
