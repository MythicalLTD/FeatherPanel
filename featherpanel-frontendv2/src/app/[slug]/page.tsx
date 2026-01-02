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
import { useRouter, notFound } from 'next/navigation';
import { Button } from '@/components/featherui/Button';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface RedirectLink {
    name: string;
    url: string;
    slug: string;
}

export default function RedirectPage({ params }: { params: Promise<{ slug: string }> }) {
    const router = useRouter();
    const { t } = useTranslation();
    const [pageSlug, setPageSlug] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [redirectLink, setRedirectLink] = useState<RedirectLink | null>(null);
    const [countdown, setCountdown] = useState(5);

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
                    notFound();
                }
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 404) {
                    setError(true);
                    notFound();
                } else {
                    console.error('[REDIRECT] Error checking redirect:', err);
                    setError(true);
                    notFound();
                }
            } finally {
                setLoading(false);
            }
        };

        checkRedirect();
    }, [pageSlug]);

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

    if (error || !redirectLink) {
        return null;
    }

    return (
        <div className='min-h-screen bg-background flex flex-col items-center justify-center p-6'>
            <div className='max-w-md w-full mx-auto text-center space-y-6'>
                <div className='text-green-500'>
                    <CheckCircle className='h-12 w-12 mx-auto' />
                </div>

                <h1 className='text-2xl font-bold text-foreground'>
                    {t('public.redirect.target_title', { name: redirectLink.name })}
                </h1>

                <div className='space-y-2'>
                    <p className='text-muted-foreground'>
                        {t('public.redirect.countdown', { count: countdown.toString() })}
                    </p>
                    <div className='bg-muted p-3 rounded-lg border border-border/50'>
                        <p className='text-sm font-mono break-all text-primary'>{redirectLink.url}</p>
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
