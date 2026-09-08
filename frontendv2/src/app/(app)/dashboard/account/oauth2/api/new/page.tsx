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
import { ShieldCheck, KeyRound, TriangleAlert, Globe, Lock, Link2 } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { OAuthConsentCard, OAuthConsentShell } from '@/components/auth/OAuthConsentCard';

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
    const { user } = useSession();
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
            if (response.data?.data?.mode === 'device' && response.data?.data?.public_key) {
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
            <OAuthConsentShell>
                <div className='border-border bg-card/95 space-y-4 rounded-3xl border p-7 text-center shadow-[0_24px_48px_hsl(var(--background)/0.35)]'>
                    <ShieldCheck className='mx-auto h-10 w-10 text-emerald-500' />
                    <h1 className='text-foreground text-[1.0625rem] font-semibold'>
                        {t('account.apiKeys.oauth2.serverAuthorizedTitle')}
                    </h1>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('account.apiKeys.oauth2.serverAuthorizedDescription')}
                    </p>
                    <Button className='rounded-xl' onClick={() => router.push('/dashboard/account?tab=api-keys')}>
                        {t('account.apiKeys.oauth2.returnToApiKeys')}
                    </Button>
                </div>
            </OAuthConsentShell>
        );
    }

    if (loading || (hasRequestParams && !payload && !error)) {
        return (
            <OAuthConsentShell>
                <div className='border-border bg-card/95 space-y-4 rounded-3xl border p-8 text-center shadow-[0_24px_48px_hsl(var(--background)/0.35)]'>
                    <div
                        className='border-border border-t-primary mx-auto h-11 w-11 animate-spin rounded-full border-2'
                        role='status'
                        aria-label={t('account.apiKeys.oauth2.prepareLoading')}
                    />
                    <h2 className='text-foreground text-[1.0625rem] font-semibold'>
                        {t('account.apiKeys.oauth2.prepareLoading')}
                    </h2>
                    <p className='text-muted-foreground text-sm'>Preparing your authorization request…</p>
                </div>
            </OAuthConsentShell>
        );
    }

    if (!hasRequestParams) {
        return (
            <OAuthConsentShell>
                <div className='border-border bg-card/95 space-y-4 rounded-3xl border p-7 text-center shadow-[0_24px_48px_hsl(var(--background)/0.35)]'>
                    <KeyRound className='text-primary mx-auto h-10 w-10' />
                    <h1 className='text-foreground text-[1.0625rem] font-semibold'>
                        {t('account.apiKeys.oauth2.noRequestTitle')}
                    </h1>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('account.apiKeys.oauth2.noRequestDescription')}
                    </p>
                    <div className='border-border bg-muted/30 rounded-2xl border p-3 text-left text-sm'>
                        <p className='font-medium'>{t('account.apiKeys.oauth2.noRequestWarningTitle')}</p>
                        <p className='text-muted-foreground mt-1'>{t('account.apiKeys.oauth2.noRequestWarningBody')}</p>
                    </div>
                    <div className='flex flex-wrap justify-center gap-3'>
                        <Button className='rounded-xl' onClick={() => router.push('/dashboard/account?tab=api-keys')}>
                            {t('account.apiKeys.oauth2.returnToApiKeys')}
                        </Button>
                        <Button
                            variant='outline'
                            className='rounded-xl'
                            onClick={() => window.open('/icanhasfeatherpanel/api/oauth2-playground.html', '_blank')}
                        >
                            {t('account.apiKeys.oauth2.openPlayground')}
                        </Button>
                    </div>
                </div>
            </OAuthConsentShell>
        );
    }

    if (error || !payload) {
        return (
            <OAuthConsentShell>
                <div className='border-border bg-card/95 space-y-4 rounded-3xl border p-7 text-center shadow-[0_24px_48px_hsl(var(--background)/0.35)]'>
                    <TriangleAlert className='text-destructive mx-auto h-10 w-10' />
                    <h1 className='text-destructive text-[1.0625rem] font-semibold'>
                        {t('account.apiKeys.oauth2.initFailedTitle')}
                    </h1>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {error || t('account.apiKeys.oauth2.initFailedDefault')}
                    </p>
                    <div className='flex flex-wrap justify-center gap-3'>
                        <Button
                            variant='outline'
                            className='rounded-xl'
                            onClick={() => router.push('/dashboard/account?tab=api-keys')}
                        >
                            {t('account.apiKeys.oauth2.returnToApiKeys')}
                        </Button>
                        <Button variant='ghost' className='rounded-xl' onClick={() => window.location.reload()}>
                            {t('account.apiKeys.oauth2.retry')}
                        </Button>
                    </div>
                </div>
            </OAuthConsentShell>
        );
    }

    const appTitle = payload.request.appName || payload.request.name;

    return (
        <OAuthConsentShell>
            <OAuthConsentCard
                appName={appTitle}
                appLogo={payload.request.appLogo}
                subtitle={t('account.apiKeys.oauth2.authorizeSubtitle')}
                signedInAs={user?.username}
                permissions={[
                    { label: t('account.apiKeys.oauth2.permissionAccount') },
                    { label: t('account.apiKeys.oauth2.permissionServers') },
                    { label: t('account.apiKeys.oauth2.permissionApi') },
                ]}
                meta={[
                    {
                        icon: <Link2 className='h-3.5 w-3.5' />,
                        text: (
                            <>
                                {t('account.apiKeys.oauth2.callbackUrl')}:{' '}
                                <span className='text-foreground/80 break-all'>{payload.request.callbackurl}</span>
                            </>
                        ),
                    },
                    {
                        icon: <Globe className='h-3.5 w-3.5' />,
                        text: (
                            <>
                                {t('account.apiKeys.oauth2.allowedIps')}:{' '}
                                {payload.request.allowedips || t('account.apiKeys.oauth2.allowedIpsAny')}
                            </>
                        ),
                    },
                    {
                        icon: <Lock className='h-3.5 w-3.5' />,
                        text: t('account.apiKeys.oauth2.cannotReadMessages'),
                    },
                    {
                        icon: <ShieldCheck className='h-3.5 w-3.5' />,
                        text: t('account.apiKeys.oauth2.privacyNote'),
                    },
                ]}
                cancelLabel={t('account.apiKeys.oauth2.deny')}
                authorizeLabel={
                    submitting ? t('account.apiKeys.oauth2.processing') : t('account.apiKeys.oauth2.authorize')
                }
                submitting={submitting}
                onCancel={() => void handleDeny()}
                onAuthorize={() => void handleApprove()}
            />
        </OAuthConsentShell>
    );
}
