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

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';

export default function MaintenancePage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const panelName = settings?.app_name || 'Panel';

    return (
        <div className='bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center'>
            <div className='relative z-10 mx-auto w-full max-w-lg space-y-8 p-6'>
                <div className='bg-muted/40 border-border relative mx-auto flex h-32 w-32 items-center justify-center rounded-3xl border'>
                    <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='text-primary relative h-16 w-16'
                    >
                        <path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' />
                    </svg>
                </div>

                <div className='space-y-4'>
                    <h1 className='text-foreground text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl'>
                        {t('maintenance.title')}
                    </h1>
                    <p className='text-muted-foreground mx-auto max-w-[400px] text-lg leading-relaxed'>
                        {t('maintenance.message')}
                    </p>
                </div>

                <div className='border-border bg-muted/30 inline-flex items-center gap-2 rounded-full border px-4 py-1.5'>
                    <span className='bg-primary inline-flex h-2.5 w-2.5 rounded-full' />
                    <span className='text-foreground text-sm font-semibold'>{t('maintenance.status')}</span>
                </div>

                <div className='pt-4'>
                    <Button variant='outline' size='lg' onClick={() => router.push('/')}>
                        <span className='flex items-center gap-2'>
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            >
                                <path d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
                                <path d='M3 3v5h5' />
                                <path d='M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' />
                                <path d='M16 16l5 5v-5' />
                            </svg>
                            {t('maintenance.check_again')}
                        </span>
                    </Button>
                </div>
            </div>

            <div className='absolute right-0 bottom-6 left-0 text-center'>
                <p className='text-muted-foreground text-sm'>
                    &copy; {new Date().getFullYear()} {panelName}
                </p>
            </div>
        </div>
    );
}
