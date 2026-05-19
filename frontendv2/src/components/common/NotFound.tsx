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
import { useTheme } from '@/contexts/ThemeContext';
import { backgroundFitToCssSize } from '@/lib/backgroundImageFit';
import { useTranslation } from '@/contexts/TranslationContext';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { PanelBrandingFooter } from '@/components/branding/PanelBrandingFooter';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    const router = useRouter();
    const { backgroundType, backgroundImage, backdropBlur, backdropDarken, backgroundImageFit } = useTheme();
    const { t } = useTranslation();

    const themeGradient =
        'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 50%, hsl(var(--primary) / 0.12) 100%)';

    const renderBackground = () => {
        switch (backgroundType) {
            case 'aurora':
            case 'gradient':
                return <div className='pointer-events-none absolute inset-0' style={{ background: themeGradient }} />;
            case 'solid':
                return null;
            case 'pattern':
                return (
                    <div
                        className='pointer-events-none absolute inset-0 opacity-[0.03]'
                        style={{
                            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                            backgroundSize: '24px 24px',
                        }}
                    />
                );
            case 'image':
                return backgroundImage ? (
                    <div
                        className='absolute inset-0 bg-center bg-no-repeat'
                        style={{
                            backgroundImage: `url(${backgroundImage})`,
                            backgroundSize: backgroundFitToCssSize(backgroundImageFit),
                        }}
                    />
                ) : null;
            default:
                return null;
        }
    };

    const hasOverlay = backdropBlur > 0 || backdropDarken > 0;
    const overlayStyle: React.CSSProperties = {
        backdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        WebkitBackdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        backgroundColor: backdropDarken > 0 ? `rgba(0,0,0,${backdropDarken / 100})` : undefined,
    };

    return (
        <div className='bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4'>
            {renderBackground()}
            {hasOverlay && (
                <div className='pointer-events-none absolute inset-0 z-[1]' style={overlayStyle} aria-hidden />
            )}

            <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                <ThemeCustomizer />
            </div>

            <div className='relative z-10 w-full max-w-2xl'>
                <div className='group relative'>
                    <div className='from-primary/50 to-primary/30 absolute -inset-0.5 rounded-3xl bg-linear-to-r opacity-20 blur transition duration-1000 group-hover:opacity-30' />

                    <div className='border-border/50 bg-card/95 relative rounded-3xl border p-8 backdrop-blur-xl md:p-12'>
                        <div className='space-y-6 text-center'>
                            <div className='relative'>
                                <h1 className='from-primary via-primary/80 to-primary/60 bg-linear-to-br bg-clip-text text-9xl leading-none font-black text-transparent md:text-[12rem]'>
                                    404
                                </h1>
                                <div className='absolute inset-0 flex items-center justify-center'>
                                    <div className='text-6xl opacity-10 md:text-7xl'>🔍</div>
                                </div>
                            </div>

                            <div className='space-y-3'>
                                <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
                                    {t('errors.404.title')}
                                </h2>
                                <p className='text-muted-foreground mx-auto max-w-md'>{t('errors.404.message')}</p>
                            </div>

                            <div className='flex flex-col justify-center gap-3 pt-4 sm:flex-row'>
                                <Button onClick={() => router.back()} variant='outline' className='group'>
                                    <ArrowLeft className='mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1' />
                                    {t('errors.404.go_back')}
                                </Button>
                                <Link href='/'>
                                    <Button className='group w-full sm:w-auto'>
                                        <Home className='mr-2 h-4 w-4' />
                                        {t('errors.404.go_home')}
                                    </Button>
                                </Link>
                            </div>

                            <div className='border-border/50 border-t pt-6'>
                                <p className='text-muted-foreground mb-3 text-sm'>{t('errors.404.looking_for')}</p>
                                <div className='flex flex-wrap justify-center gap-2'>
                                    <Link href='/auth/login'>
                                        <button className='bg-muted hover:bg-muted/80 rounded-lg px-4 py-2 text-sm transition-colors'>
                                            {t('errors.404.login')}
                                        </button>
                                    </Link>
                                    <Link href='/dashboard'>
                                        <button className='bg-muted hover:bg-muted/80 rounded-lg px-4 py-2 text-sm transition-colors'>
                                            {t('errors.404.dashboard')}
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PanelBrandingFooter className='relative z-10 mt-8' />
        </div>
    );
}
