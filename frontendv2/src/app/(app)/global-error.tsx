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

// global-error.tsx is a special Next.js error boundary that wraps the entire application
import { useEffect, useState } from 'react';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { Home, RefreshCw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { backgroundType, backgroundImage } = useTheme();
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        // Safely read version from localStorage after mount
        try {
            const cached = localStorage.getItem('app_settings');
            if (cached) {
                const { data } = JSON.parse(cached);
                if (data?.core?.version) {
                    requestAnimationFrame(() => setVersion(data.core.version));
                }
            }
        } catch {
            // Ignore error
        }
    }, []);

    const renderBackground = () => {
        const gradientMap: Record<string, string> = {
            'purple-dream':
                'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 50%, rgba(147, 51, 234, 0.1) 100%)',
            'ocean-breeze':
                'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(6, 182, 212, 0.1) 100%)',
            'sunset-glow':
                'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(251, 146, 60, 0.1) 100%)',
            'forest-mist':
                'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(34, 197, 94, 0.1) 100%)',
            'rose-garden':
                'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 50%, rgba(236, 72, 153, 0.1) 100%)',
            'golden-hour':
                'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 50%, rgba(251, 191, 36, 0.1) 100%)',
        };

        switch (backgroundType) {
            case 'gradient':
                const gradient = gradientMap[backgroundImage] || gradientMap['purple-dream'];
                return <div className='pointer-events-none absolute inset-0' style={{ background: gradient }} />;
            case 'solid':
                // Check if backgroundImage is a hex color (starts with #)
                if (backgroundImage && backgroundImage.startsWith('#')) {
                    return (
                        <div
                            className='pointer-events-none absolute inset-0'
                            style={{ backgroundColor: backgroundImage }}
                        />
                    );
                }
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
                    <>
                        <div
                            className='absolute inset-0 bg-cover bg-center bg-no-repeat'
                            style={{ backgroundImage: `url(${backgroundImage})` }}
                        />
                        <div className='absolute inset-0 bg-background/80 backdrop-blur-sm' />
                    </>
                ) : null;
            default:
                return null;
        }
    };

    return (
        <html lang='en' suppressHydrationWarning>
            <body className='bg-background text-foreground'>
                <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4'>
                    {renderBackground()}

                    <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                        <ThemeCustomizer />
                    </div>

                    <div className='relative z-10 w-full max-w-2xl'>
                        <div className='relative group'>
                            <div className='absolute -inset-0.5 bg-linear-to-r from-destructive/50 to-destructive/30 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000' />

                            <div className='relative rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl p-8 md:p-12 shadow-2xl shadow-black/20'>
                                <div className='text-center space-y-6'>
                                    <div className='relative'>
                                        <h1 className='text-9xl md:text-[12rem] font-black bg-linear-to-br from-destructive via-destructive/80 to-destructive/60 bg-clip-text text-transparent leading-none'>
                                            500
                                        </h1>
                                        <div className='absolute inset-0 flex items-center justify-center'>
                                            <div className='text-6xl md:text-7xl opacity-10'>⚠️</div>
                                        </div>
                                    </div>

                                    <div className='space-y-3'>
                                        <h2 className='text-2xl md:text-3xl font-bold tracking-tight'>
                                            Critical Error
                                        </h2>
                                        <p className='text-muted-foreground max-w-md mx-auto'>
                                            A critical error occurred that prevented the application from loading.
                                            Please try refreshing the page.
                                        </p>
                                        {error.digest && (
                                            <p className='text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded-lg inline-block'>
                                                Error ID: {error.digest}
                                            </p>
                                        )}
                                    </div>

                                    <div className='flex flex-col sm:flex-row gap-3 justify-center pt-4'>
                                        <Button onClick={reset} variant='outline' className='group'>
                                            <RefreshCw className='h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-500' />
                                            Try Again
                                        </Button>
                                        <Link href='/'>
                                            <Button className='w-full sm:w-auto group'>
                                                <Home className='h-4 w-4 mr-2' />
                                                Go Home
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='relative z-10 mt-8 text-center text-xs text-muted-foreground'>
                        <p className='mb-2 font-medium'>Running on FeatherPanel {version ? `v${version}` : ''}</p>
                        <a
                            href='https://featherpanel.com'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-1.5 text-primary transition-all duration-200 hover:text-primary/80 hover:underline underline-offset-4 font-medium'
                        >
                            MythicalSystems
                            <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                                />
                            </svg>
                        </a>
                    </div>
                </div>
            </body>
        </html>
    );
}
