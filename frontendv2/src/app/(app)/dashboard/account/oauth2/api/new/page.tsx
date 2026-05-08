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

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2, ExternalLink, Globe, KeyRound, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import Image from 'next/image';

type OAuthRequestPayload = {
    request_token: string;
    request: {
        name: string;
        description?: string | null;
        callbackurl: string;
        callback_origin: string;
        allowedips?: string | null;
        alertCors: boolean;
        appName?: string | null;
        appLogo?: string | null;
        mode: 'user' | 'server';
    };
};

export default function OAuth2ApiAuthorizePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [serverModeAuthorized, setServerModeAuthorized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<OAuthRequestPayload | null>(null);

    const queryString = useMemo(() => searchParams.toString(), [searchParams]);
    const hasRequestParams = queryString.length > 0;
    const requestQueryParams = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

    useEffect(() => {
        if (!queryString || payload || loading || error) return;
        setLoading(true);
        axios
            .get('/api/user/api-clients/oauth2/authorize', {
                params: Object.fromEntries(searchParams.entries()),
            })
            .then((response) => {
                if (response.data?.success) {
                    setPayload(response.data.data as OAuthRequestPayload);
                    return;
                }
                setError(response.data?.message || t('account.apiKeys.oauth2.initFailedDefault'));
            })
            .catch((err) => {
                if (axios.isAxiosError(err) && err.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                    const redirect = `/dashboard/account/oauth2/api/new${queryString ? `?${queryString}` : ''}`;
                    router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
                    return;
                }
                const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
                setError(message || t('account.apiKeys.oauth2.initFailedDefault'));
            })
            .finally(() => setLoading(false));
    }, [queryString, payload, loading, error, searchParams, router, t]);

    const redirectToTarget = (url: string) => {
        window.location.href = url;
    };

    const refreshRequestToken = async (): Promise<OAuthRequestPayload> => {
        const response = await axios.get('/api/user/api-clients/oauth2/authorize', {
            params: requestQueryParams,
        });
        if (!response.data?.success || !response.data?.data?.request_token) {
            throw new Error(response.data?.message || t('account.apiKeys.oauth2.initFailedDefault'));
        }
        const freshPayload = response.data.data as OAuthRequestPayload;
        setPayload(freshPayload);
        return freshPayload;
    };

    const handleApprove = async () => {
        if (!payload && !hasRequestParams) return;
        setSubmitting(true);
        try {
            // Always use a fresh token to avoid stale/prefetched request state.
            let activePayload = payload;
            if (hasRequestParams) {
                activePayload = await refreshRequestToken();
            }

            const response = await axios.post('/api/user/api-clients/oauth2/authorize/approve', {
                request_token: activePayload?.request_token,
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Approval failed');
            }
            if (response.data?.data?.mode === 'server') {
                setServerModeAuthorized(true);
                return;
            }
            if (!response.data?.data?.redirect_url) {
                throw new Error(response.data?.message || 'Approval failed');
            }
            redirectToTarget(String(response.data.data.redirect_url));
        } catch (err) {
            const isPendingStateError =
                axios.isAxiosError(err) && err.response?.data?.error_code === 'AUTHORIZATION_NOT_PENDING';

            // One automatic retry with a newly minted token.
            if (isPendingStateError && hasRequestParams) {
                try {
                    const freshPayload = await refreshRequestToken();
                    const retry = await axios.post('/api/user/api-clients/oauth2/authorize/approve', {
                        request_token: freshPayload.request_token,
                    });
                    if (retry.data?.success) {
                        if (retry.data?.data?.mode === 'server') {
                            setServerModeAuthorized(true);
                            return;
                        }
                        if (retry.data?.data?.redirect_url) {
                            redirectToTarget(String(retry.data.data.redirect_url));
                            return;
                        }
                    }
                } catch {
                    // Fall through to standard error toast below.
                }
            }

            const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
            toast.error(message || t('account.apiKeys.oauth2.approveFailed'));
            setSubmitting(false);
        }
    };

    const handleDeny = async () => {
        if (!payload && !hasRequestParams) return;
        setSubmitting(true);
        try {
            let activePayload = payload;
            if (hasRequestParams) {
                activePayload = await refreshRequestToken();
            }

            const response = await axios.post('/api/user/api-clients/oauth2/authorize/deny', {
                request_token: activePayload?.request_token,
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Deny failed');
            }
            if (response.data?.data?.mode === 'server') {
                toast.success(t('account.apiKeys.oauth2.serverDenied'));
                router.push('/dashboard/account?tab=api-keys');
                return;
            }
            if (!response.data?.data?.redirect_url) {
                throw new Error(response.data?.message || 'Deny failed');
            }
            redirectToTarget(String(response.data.data.redirect_url));
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
            toast.error(message || t('account.apiKeys.oauth2.denyFailed'));
            setSubmitting(false);
        }
    };

    if (serverModeAuthorized) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='bg-card/80 w-full max-w-2xl space-y-5 rounded-2xl border border-emerald-500/30 p-7 backdrop-blur-xl'>
                    <div className='flex items-start gap-3'>
                        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400'>
                            <ShieldCheck className='h-5 w-5' />
                        </div>
                        <div>
                            <h1 className='text-foreground text-xl font-semibold'>
                                {t('account.apiKeys.oauth2.serverAuthorizedTitle')}
                            </h1>
                            <p className='text-muted-foreground mt-1 text-sm'>
                                {t('account.apiKeys.oauth2.serverAuthorizedDescription')}
                            </p>
                        </div>
                    </div>
                    <div className='flex flex-wrap gap-3'>
                        <Button onClick={() => router.push('/dashboard/account?tab=api-keys')}>
                            {t('account.apiKeys.oauth2.returnToApiKeys')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='border-border/60 bg-card/60 text-muted-foreground flex items-center gap-3 rounded-xl border px-6 py-5 backdrop-blur-xl'>
                    <Loader2 className='text-primary h-5 w-5 animate-spin' />
                    <span>{t('account.apiKeys.oauth2.prepareLoading')}</span>
                </div>
            </div>
        );
    }

    if (!hasRequestParams) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='border-border/60 bg-card/70 w-full max-w-2xl space-y-5 rounded-2xl border p-7 backdrop-blur-xl'>
                    <div className='flex items-start gap-3'>
                        <div className='bg-primary/15 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                            <KeyRound className='h-5 w-5' />
                        </div>
                        <div>
                            <h1 className='text-foreground text-xl font-semibold'>
                                {t('account.apiKeys.oauth2.noRequestTitle')}
                            </h1>
                            <p className='text-muted-foreground mt-1 text-sm'>
                                {t('account.apiKeys.oauth2.noRequestDescription')}
                            </p>
                        </div>
                    </div>

                    <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100'>
                        <p className='font-medium'>{t('account.apiKeys.oauth2.noRequestWarningTitle')}</p>
                        <p className='mt-1 opacity-90'>{t('account.apiKeys.oauth2.noRequestWarningBody')}</p>
                    </div>

                    <div className='flex flex-wrap gap-3'>
                        <Button onClick={() => router.push('/dashboard/account?tab=api-keys')}>
                            {t('account.apiKeys.oauth2.returnToApiKeys')}
                        </Button>
                        <Button
                            variant='outline'
                            onClick={() => window.open('/icanhasfeatherpanel/api/oauth2-playground.html', '_blank')}
                        >
                            {t('account.apiKeys.oauth2.openPlayground')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !payload) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='bg-card/80 w-full max-w-xl space-y-4 rounded-2xl border border-red-500/30 p-6 backdrop-blur-xl'>
                    <div className='flex items-center gap-3 text-red-400'>
                        <TriangleAlert className='h-5 w-5' />
                        <h1 className='text-lg font-semibold'>{t('account.apiKeys.oauth2.initFailedTitle')}</h1>
                    </div>
                    <p className='text-muted-foreground text-sm'>
                        {error || t('account.apiKeys.oauth2.initFailedDefault')}
                    </p>
                    <div className='flex gap-3'>
                        <Button variant='outline' onClick={() => router.push('/dashboard/account?tab=api-keys')}>
                            {t('account.apiKeys.oauth2.returnToApiKeys')}
                        </Button>
                        <Button variant='ghost' onClick={() => window.location.reload()}>
                            {t('account.apiKeys.oauth2.retry')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const appTitle = payload.request.appName || payload.request.name;

    return (
        <div className='flex min-h-[70vh] items-center justify-center p-6'>
            <div className='border-border/60 bg-card/70 w-full max-w-3xl space-y-6 rounded-2xl border p-6 shadow-sm backdrop-blur-xl md:p-8'>
                <div className='flex items-center justify-between gap-4'>
                    <div className='flex min-w-0 items-center gap-4'>
                        {payload.request.appLogo ? (
                            <Image
                                src={payload.request.appLogo}
                                alt={appTitle}
                                width={56}
                                height={56}
                                className='h-14 w-14 shrink-0 rounded-xl border object-cover'
                            />
                        ) : (
                            <div className='bg-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border'>
                                <ShieldCheck className='text-muted-foreground h-6 w-6' />
                            </div>
                        )}
                        <div className='min-w-0'>
                            <h1 className='truncate text-xl font-semibold md:text-2xl'>
                                {t('account.apiKeys.oauth2.authorizeTitle', { app: appTitle })}
                            </h1>
                            <p className='text-muted-foreground truncate text-sm'>
                                {t('account.apiKeys.oauth2.authorizeSubtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
                    <p className='text-sm font-medium text-amber-900 dark:text-amber-100'>
                        {t('account.apiKeys.oauth2.warning')}
                    </p>
                </div>

                <div className='grid gap-3 text-sm md:grid-cols-2'>
                    <div className='border-border/60 bg-background/40 rounded-lg border p-3'>
                        <p className='text-muted-foreground'>{t('account.apiKeys.oauth2.requestName')}</p>
                        <p className='font-medium break-all'>{payload.request.name}</p>
                    </div>
                    {payload.request.description ? (
                        <div className='border-border/60 bg-background/40 rounded-lg border p-3'>
                            <p className='text-muted-foreground'>{t('account.apiKeys.oauth2.description')}</p>
                            <p className='font-medium break-all'>{payload.request.description}</p>
                        </div>
                    ) : null}
                    <div className='border-border/60 bg-background/40 rounded-lg border p-3 md:col-span-2'>
                        <p className='text-muted-foreground inline-flex items-center gap-2'>
                            <Globe className='h-3.5 w-3.5' />
                            {t('account.apiKeys.oauth2.callbackUrl')}
                        </p>
                        <a
                            href={payload.request.callbackurl}
                            target='_blank'
                            rel='noreferrer'
                            className='inline-flex items-center gap-2 font-medium break-all hover:underline'
                        >
                            {payload.request.callbackurl}
                            <ExternalLink className='h-3 w-3' />
                        </a>
                    </div>
                    <div className='border-border/60 bg-background/40 rounded-lg border p-3'>
                        <p className='text-muted-foreground'>{t('account.apiKeys.oauth2.allowedIps')}</p>
                        <p className='font-medium break-all whitespace-pre-wrap'>
                            {payload.request.allowedips || t('account.apiKeys.oauth2.allowedIpsAny')}
                        </p>
                    </div>
                    <div className='border-border/60 bg-background/40 rounded-lg border p-3'>
                        <p className='text-muted-foreground'>{t('account.apiKeys.oauth2.foreignIpAlert')}</p>
                        <p className='font-medium'>
                            {payload.request.alertCors
                                ? t('account.apiKeys.oauth2.enabled')
                                : t('account.apiKeys.oauth2.disabled')}
                        </p>
                    </div>
                </div>

                <div className='flex flex-col-reverse gap-3 pt-2 sm:flex-row'>
                    <Button variant='outline' className='sm:flex-1' disabled={submitting} onClick={handleDeny}>
                        {t('account.apiKeys.oauth2.deny')}
                    </Button>
                    <Button className='sm:flex-1' disabled={submitting} onClick={handleApprove}>
                        {submitting ? (
                            <span className='inline-flex items-center gap-2'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('account.apiKeys.oauth2.processing')}
                            </span>
                        ) : (
                            t('account.apiKeys.oauth2.authorize')
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
