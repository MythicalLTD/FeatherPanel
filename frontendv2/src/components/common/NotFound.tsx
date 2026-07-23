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

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/TranslationContext';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import BackgroundWrapper from '@/components/theme/BackgroundWrapper';
import { PanelBrandingFooter } from '@/components/branding/PanelBrandingFooter';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
    const router = useRouter();
    const { t } = useTranslation();

    return (
        <BackgroundWrapper>
            <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6'>
                <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                    <ThemeCustomizer />
                </div>

                <div className='relative z-10 w-full max-w-md'>
                    <div className='bg-card/90 rounded-3xl border border-white/15 p-8 backdrop-blur-2xl sm:p-10'>
                        <div className='flex flex-col items-center text-center'>
                            <div className='bg-muted/40 text-muted-foreground border-border/50 mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border'>
                                <FileQuestion className='h-7 w-7' strokeWidth={1.5} />
                            </div>

                            <p className='text-muted-foreground mb-2 font-mono text-xs tracking-[0.25em] uppercase'>
                                404
                            </p>
                            <h1 className='text-foreground mb-3 text-2xl font-bold tracking-tight sm:text-3xl'>
                                {t('errors.404.title')}
                            </h1>
                            <p className='text-muted-foreground mb-8 max-w-sm text-sm leading-relaxed'>
                                {t('errors.404.message')}
                            </p>

                            <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center'>
                                <Button onClick={() => router.back()} variant='outline' className='w-full sm:w-auto'>
                                    <ArrowLeft className='mr-2 h-4 w-4' />
                                    {t('errors.404.go_back')}
                                </Button>
                                <Link href='/' className='w-full sm:w-auto'>
                                    <Button className='w-full'>
                                        <Home className='mr-2 h-4 w-4' />
                                        {t('errors.404.go_home')}
                                    </Button>
                                </Link>
                            </div>

                            <div className='border-border/40 mt-8 w-full border-t pt-6'>
                                <p className='text-muted-foreground mb-3 text-xs'>{t('errors.404.looking_for')}</p>
                                <div className='flex flex-wrap justify-center gap-1'>
                                    <Link
                                        href='/auth/login'
                                        className='text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-1.5 text-sm transition-colors'
                                    >
                                        {t('errors.404.login')}
                                    </Link>
                                    <Link
                                        href='/dashboard'
                                        className='text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-1.5 text-sm transition-colors'
                                    >
                                        {t('errors.404.dashboard')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    <PanelBrandingFooter className='mt-8' />
                </div>
            </div>
        </BackgroundWrapper>
    );
}
