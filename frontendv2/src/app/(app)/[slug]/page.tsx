/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/featherui/Button';
import { Button as UIButton } from '@/components/ui/button';
import axios from 'axios';
import { CheckCircle, Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';

interface RedirectLink {
    name: string;
    url: string;
    slug: string;
}

export default function RedirectPage({ params }: { params: Promise<{ slug: string }> }) {
    const router = useRouter();
    const { t } = useTranslation();
    const { backgroundType, backgroundImage } = useTheme();
    const { core } = useSettings();
    const [pageSlug, setPageSlug] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [redirectLink, setRedirectLink] = useState<RedirectLink | null>(null);
    const [countdown, setCountdown] = useState(5);

    const startCountdown = (url: string) => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.href = url;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        params.then((unwrappedParams) => {
            setPageSlug(unwrappedParams.slug);
        });
    }, [params]);

    useEffect(() => {
        if (!pageSlug) return;

        const checkRedirect = async () => {
            try {
                // Fixed: Use public endpoint instead of admin endpoint
                const { data } = await axios.get(`/api/redirect-links/${pageSlug}`);
                if (data.success && data.data) {
                    // Check if data.data has redirect_link wrapper or is the object itself
                    // Vue code uses data.data.redirect_link. Let's handle both just in case or match Vue exactly.
                    // Vue: data.data.redirect_link
                    const link = data.data.redirect_link || data.data;
                    setRedirectLink(link);
                    startCountdown(link.url);
                } else {
                    setError(true);
                    setLoading(false);
                }
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 404) {
                    setError(true);
                    setLoading(false);
                } else {
                    console.error('[REDIRECT] Error checking redirect:', err);
                    setError(true);
                    setLoading(false);
                }
            }
        };

        checkRedirect();
    }, [pageSlug]);

    const redirectNow = () => {
        if (redirectLink) {
            window.location.href = redirectLink.url;
        }
    };

    const goHome = () => {
        router.push('/');
    };

    if (loading) {
        return (
            <div className='min-h-screen bg-background flex flex-col items-center justify-center space-y-4'>
                <div className='animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent'></div>
                <h1 className='text-2xl font-bold text-foreground'>{t('public.redirect.title')}</h1>
                <p className='text-muted-foreground'>{t('public.redirect.subtitle')}</p>
            </div>
        );
    }

    // Render 404 page if error or no redirect link found
    if (error || (!loading && !redirectLink)) {
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
            <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4'>
                {/* Dynamic background */}
                {renderBackground()}

                {/* Theme customizer */}
                <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                    <ThemeCustomizer />
                </div>

                {/* Error content */}
                <div className='relative z-10 w-full max-w-2xl'>
                    <div className='relative group'>
                        {/* Glow effect */}
                        <div className='absolute -inset-0.5 bg-linear-to-r from-primary/50 to-primary/30 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000' />

                        <div className='relative rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl p-8 md:p-12 shadow-2xl shadow-black/20'>
                            <div className='text-center space-y-6'>
                                {/* 404 Number */}
                                <div className='relative'>
                                    <h1 className='text-9xl md:text-[12rem] font-black bg-linear-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-none'>
                                        404
                                    </h1>
                                    <div className='absolute inset-0 flex items-center justify-center'>
                                        <div className='text-6xl md:text-7xl opacity-10'>🔍</div>
                                    </div>
                                </div>

                                {/* Message */}
                                <div className='space-y-3'>
                                    <h2 className='text-2xl md:text-3xl font-bold tracking-tight'>
                                        {t('errors.404.title')}
                                    </h2>
                                    <p className='text-muted-foreground max-w-md mx-auto'>{t('errors.404.message')}</p>
                                </div>

                                {/* Actions */}
                                <div className='flex flex-col sm:flex-row gap-3 justify-center pt-4'>
                                    <UIButton onClick={() => router.back()} variant='outline' className='group'>
                                        <ArrowLeft className='h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform' />
                                        {t('errors.404.go_back')}
                                    </UIButton>
                                    <Link href='/'>
                                        <UIButton className='w-full sm:w-auto group'>
                                            <Home className='h-4 w-4 mr-2' />
                                            {t('errors.404.go_home')}
                                        </UIButton>
                                    </Link>
                                </div>

                                {/* Helpful links */}
                                <div className='pt-6 border-t border-border/50'>
                                    <p className='text-sm text-muted-foreground mb-3'>{t('errors.404.looking_for')}</p>
                                    <div className='flex flex-wrap gap-2 justify-center'>
                                        <Link href='/auth/login'>
                                            <button className='text-sm px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors'>
                                                {t('errors.404.login')}
                                            </button>
                                        </Link>
                                        <Link href='/dashboard'>
                                            <button className='text-sm px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors'>
                                                {t('errors.404.dashboard')}
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className='relative z-10 mt-8 text-center text-xs text-muted-foreground'>
                    <p className='mb-2 font-medium'>
                        {t('branding.running_on', { name: 'FeatherPanel', version: core?.version || '' }).trim()}
                    </p>
                    <a
                        href='https://featherpanel.com'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1.5 text-primary transition-all duration-200 hover:text-primary/80 hover:underline underline-offset-4 font-medium'
                    >
                        {t('branding.copyright', { company: 'MythicalSystems' })}
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
        );
    }

    return (
        <div className='min-h-screen bg-background flex flex-col items-center justify-center p-6'>
            <div className='max-w-md w-full mx-auto text-center space-y-6'>
                <div className='text-green-500'>
                    <CheckCircle className='h-12 w-12 mx-auto' />
                </div>

                <h1 className='text-2xl font-bold text-foreground'>
                    {t('public.redirect.target_title', { name: redirectLink?.name ?? '' })}
                </h1>

                <div className='space-y-2'>
                    <p className='text-muted-foreground'>
                        {t('public.redirect.countdown', { count: countdown.toString() })}
                    </p>
                    <div className='bg-muted p-3 rounded-lg border border-border/50'>
                        <p className='text-sm font-mono break-all text-primary'>{redirectLink?.url ?? ''}</p>
                    </div>
                </div>

                <div className='space-y-3 pt-4'>
                    <Button className='w-full' onClick={redirectNow}>
                        {t('public.redirect.continue')}
                    </Button>
                    <Button variant='outline' className='w-full' onClick={goHome}>
                        {t('public.redirect.go_home')}
                    </Button>
                </div>

                <p className='text-xs text-muted-foreground pt-4'>{t('public.redirect.auto_redirect_help')}</p>
            </div>
        </div>
    );
}
