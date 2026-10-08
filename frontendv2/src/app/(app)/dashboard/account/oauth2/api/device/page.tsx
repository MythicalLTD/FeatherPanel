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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2, KeyRound, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { OAuthConsentCard } from '@/components/auth/OAuthConsentCard';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';

type OAuthDevicePayload = {
    request_token: string;
    request: {
        name: string;
        description?: string | null;
        callbackurl?: string | null;
        callback_origin?: string | null;
        allowedips?: string | null;
        alertCors: boolean;
        appName?: string | null;
        appLogo?: string | null;
        mode: 'device';
        user_code?: string;
    };
};

function formatUserCodeInput(value: string): string {
    const cleaned = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8);
    if (cleaned.length <= 4) {
        return cleaned;
    }
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

export default function OAuth2DeviceAuthorizePage() {
    const { t } = useTranslation();
    const { user } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialCode = formatUserCodeInput(searchParams.get('user_code') || '');

    const [userCode, setUserCode] = useState(initialCode);
    const [claiming, setClaiming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<OAuthDevicePayload | null>(null);
    const [denied, setDenied] = useState(false);

    const claimCode = useCallback(
        async (code: string) => {
            const formatted = formatUserCodeInput(code);
            if (formatted.replace(/-/g, '').length !== 8) {
                setError(t('account.apiKeys.oauth2.deviceInvalidCode'));
                return;
            }

            setClaiming(true);
            setError(null);
            try {
                const response = await axios.get('/api/user/api-clients/oauth2/device/claim', {
                    params: { user_code: formatted },
                });
                if (!response.data?.success) {
                    setError(
                        getApiErrorMessageFromPayload(response.data, t, 'account.apiKeys.oauth2.initFailedDefault'),
                    );
                    setPayload(null);
                    return;
                }
                setPayload(response.data.data as OAuthDevicePayload);
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                    const redirect = `/dashboard/account/oauth2/api/device?user_code=${encodeURIComponent(formatted)}`;
                    router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
                    return;
                }
                setError(getApiErrorMessage(err, t, 'account.apiKeys.oauth2.initFailedDefault'));
                setPayload(null);
            } finally {
                setClaiming(false);
            }
        },
        [router, t],
    );

    useEffect(() => {
        if (initialCode.replace(/-/g, '').length === 8 && !payload && !claiming && !error) {
            void claimCode(initialCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-claim once from URL
    }, []);

    const handleApprove = async () => {
        if (!payload) return;
        setSubmitting(true);
        try {
            const response = await axios.post('/api/user/api-clients/oauth2/authorize/approve', {
                request_token: payload.request_token,
            });
            if (!response.data?.success) {
                toast.error(getApiErrorMessageFromPayload(response.data, t, 'account.apiKeys.oauth2.approveFailed'));
                setSubmitting(false);
                return;
            }
            toast.success(t('account.apiKeys.oauth2.deviceAuthorizedTitle'));
            router.push('/dashboard/account?tab=api-keys');
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'account.apiKeys.oauth2.approveFailed'));
            setSubmitting(false);
        }
    };

    const handleDeny = async () => {
        if (!payload) return;
        setSubmitting(true);
        try {
            const response = await axios.post('/api/user/api-clients/oauth2/authorize/deny', {
                request_token: payload.request_token,
            });
            if (!response.data?.success) {
                toast.error(getApiErrorMessageFromPayload(response.data, t, 'account.apiKeys.oauth2.denyFailed'));
                setSubmitting(false);
                return;
            }
            setDenied(true);
            toast.success(t('account.apiKeys.oauth2.deviceDenied'));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'account.apiKeys.oauth2.denyFailed'));
            setSubmitting(false);
        }
    };

    if (denied) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='bg-card/80 w-full max-w-xl space-y-4 rounded-2xl border p-6 backdrop-blur-xl'>
                    <h1 className='text-foreground text-xl font-semibold'>
                        {t('account.apiKeys.oauth2.deviceDeniedTitle')}
                    </h1>
                    <p className='text-muted-foreground text-sm'>{t('account.apiKeys.oauth2.deviceDenied')}</p>
                </div>
            </div>
        );
    }

    if (claiming) {
        return (
            <div className='flex min-h-[50vh] items-center justify-center'>
                <div className='border-border/60 bg-card/60 text-muted-foreground flex items-center gap-3 rounded-2xl border px-6 py-5 backdrop-blur-xl'>
                    <Loader2 className='text-primary h-5 w-5 animate-spin' />
                    <span>{t('account.apiKeys.oauth2.deviceClaimLoading')}</span>
                </div>
            </div>
        );
    }

    if (!payload) {
        return (
            <div className='mx-auto w-full max-w-2xl space-y-5'>
                <div className='border-border/60 bg-card/70 rounded-2xl border p-6 backdrop-blur-xl sm:p-8'>
                    <div className='flex items-start gap-4'>
                        <div className='bg-primary/10 text-primary border-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border'>
                            <KeyRound className='h-6 w-6' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <h1 className='text-foreground text-xl font-bold sm:text-2xl'>
                                {t('account.apiKeys.oauth2.deviceEnterTitle')}
                            </h1>
                            <p className='text-muted-foreground mt-1 text-sm leading-6'>
                                {t('account.apiKeys.oauth2.deviceEnterDescription')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className='border-border/60 bg-card/60 overflow-hidden rounded-2xl border p-5 backdrop-blur-xl sm:p-6'>
                    <form data-fp-save-shortcut
                        className='space-y-5'
                        onSubmit={(event) => {
                            event.preventDefault();
                            void claimCode(userCode);
                        }}
                    >
                        <Input
                            id='device-user-code'
                            label={t('account.apiKeys.oauth2.deviceUserCode')}
                            value={userCode}
                            onChange={(e) => setUserCode(formatUserCodeInput(e.target.value))}
                            placeholder='ABCD-EFGH'
                            className='font-mono text-base tracking-widest'
                            autoComplete='one-time-code'
                            inputMode='text'
                            spellCheck={false}
                            autoFocus
                            error={error || undefined}
                        />

                        <Button
                            type='submit'
                            className='w-full sm:w-auto'
                            loading={claiming}
                            disabled={userCode.replace(/-/g, '').length !== 8}
                        >
                            <span className='truncate'>{t('account.apiKeys.oauth2.deviceContinue')}</span>
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    const appTitle = payload.request.appName || payload.request.name;

    return (
        <div className='flex min-h-[50vh] items-center justify-center'>
            <div className='w-full max-w-xl'>
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
                            icon: <KeyRound className='h-3.5 w-3.5' />,
                            text: (
                                <>
                                    {t('account.apiKeys.oauth2.deviceUserCode')}:{' '}
                                    <span className='text-foreground font-mono tracking-widest'>
                                        {payload.request.user_code || userCode}
                                    </span>
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
                    error={error}
                    cancelLabel={t('account.apiKeys.oauth2.deny')}
                    authorizeLabel={
                        submitting ? t('account.apiKeys.oauth2.processing') : t('account.apiKeys.oauth2.authorize')
                    }
                    submitting={submitting}
                    onCancel={() => void handleDeny()}
                    onAuthorize={() => void handleApprove()}
                />
            </div>
        </div>
    );
}
