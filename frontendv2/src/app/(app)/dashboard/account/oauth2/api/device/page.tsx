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
import { ShieldCheck, Loader2, KeyRound, Copy, Check, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { copyToClipboard } from '@/lib/utils';
import { OAuthConsentCard, OAuthConsentShell } from '@/components/auth/OAuthConsentCard';

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

type DeviceCredentials = {
    public_key: string;
    private_key: string;
    authorization_code?: string | null;
    issued_at?: string;
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
    const [credentials, setCredentials] = useState<DeviceCredentials | null>(null);
    const [denied, setDenied] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

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
                    throw new Error(response.data?.message || t('account.apiKeys.oauth2.initFailedDefault'));
                }
                setPayload(response.data.data as OAuthDevicePayload);
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                    const redirect = `/dashboard/account/oauth2/api/device?user_code=${encodeURIComponent(formatted)}`;
                    router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
                    return;
                }
                const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
                setError(message || t('account.apiKeys.oauth2.initFailedDefault'));
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

    const handleCopy = async (field: string, value: string) => {
        await copyToClipboard(value, t);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleApprove = async () => {
        if (!payload) return;
        setSubmitting(true);
        try {
            const response = await axios.post('/api/user/api-clients/oauth2/authorize/approve', {
                request_token: payload.request_token,
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Approval failed');
            }
            const data = response.data.data;
            if (data?.mode === 'device' && data?.public_key && data?.private_key) {
                setCredentials({
                    public_key: String(data.public_key),
                    private_key: String(data.private_key),
                    authorization_code: data.authorization_code ? String(data.authorization_code) : null,
                    issued_at: data.issued_at ? String(data.issued_at) : undefined,
                });
                return;
            }
            throw new Error(response.data?.message || 'Approval failed');
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
            toast.error(message || t('account.apiKeys.oauth2.approveFailed'));
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
                throw new Error(response.data?.message || 'Deny failed');
            }
            setDenied(true);
            toast.success(t('account.apiKeys.oauth2.deviceDenied'));
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
            toast.error(message || t('account.apiKeys.oauth2.denyFailed'));
            setSubmitting(false);
        }
    };

    if (credentials) {
        const fields: { key: keyof DeviceCredentials; label: string }[] = [
            { key: 'public_key', label: t('account.apiKeys.oauth2.devicePublicKey') },
            { key: 'private_key', label: t('account.apiKeys.oauth2.devicePrivateKey') },
        ];
        if (credentials.authorization_code) {
            fields.push({ key: 'authorization_code', label: t('account.apiKeys.oauth2.deviceAuthCode') });
        }

        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='bg-card/80 w-full max-w-2xl space-y-5 rounded-2xl border border-emerald-500/30 p-7 backdrop-blur-xl'>
                    <div className='flex items-start gap-3'>
                        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400'>
                            <ShieldCheck className='h-5 w-5' />
                        </div>
                        <div>
                            <h1 className='text-foreground text-xl font-semibold'>
                                {t('account.apiKeys.oauth2.deviceAuthorizedTitle')}
                            </h1>
                            <p className='text-muted-foreground mt-1 text-sm'>
                                {t('account.apiKeys.oauth2.deviceAuthorizedDescription')}
                            </p>
                        </div>
                    </div>

                    <div className='space-y-3'>
                        {fields.map(({ key, label }) => {
                            const value = String(credentials[key] || '');
                            return (
                                <div key={key} className='border-border/60 bg-background/40 rounded-lg border p-3'>
                                    <div className='mb-2 flex items-center justify-between gap-2'>
                                        <p className='text-muted-foreground text-sm'>{label}</p>
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='sm'
                                            className='h-8 gap-1.5 px-2'
                                            onClick={() => void handleCopy(key, value)}
                                        >
                                            {copiedField === key ? (
                                                <Check className='h-3.5 w-3.5 text-emerald-400' />
                                            ) : (
                                                <Copy className='h-3.5 w-3.5' />
                                            )}
                                            {t('account.apiKeys.oauth2.copy')}
                                        </Button>
                                    </div>
                                    <code className='block font-mono text-xs break-all'>{value}</code>
                                </div>
                            );
                        })}
                    </div>

                    <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100'>
                        {t('account.apiKeys.oauth2.deviceCopyWarning')}
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

    if (denied) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='bg-card/80 w-full max-w-xl space-y-4 rounded-2xl border p-6 backdrop-blur-xl'>
                    <h1 className='text-foreground text-xl font-semibold'>
                        {t('account.apiKeys.oauth2.deviceDeniedTitle')}
                    </h1>
                    <p className='text-muted-foreground text-sm'>{t('account.apiKeys.oauth2.deviceDenied')}</p>
                    <Button onClick={() => router.push('/dashboard/account?tab=api-keys')}>
                        {t('account.apiKeys.oauth2.returnToApiKeys')}
                    </Button>
                </div>
            </div>
        );
    }

    if (claiming) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='border-border/60 bg-card/60 text-muted-foreground flex items-center gap-3 rounded-xl border px-6 py-5 backdrop-blur-xl'>
                    <Loader2 className='text-primary h-5 w-5 animate-spin' />
                    <span>{t('account.apiKeys.oauth2.deviceClaimLoading')}</span>
                </div>
            </div>
        );
    }

    if (!payload) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='border-border/60 bg-card/70 w-full max-w-xl space-y-5 rounded-2xl border p-7 backdrop-blur-xl'>
                    <div className='flex items-start gap-3'>
                        <div className='bg-primary/15 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                            <KeyRound className='h-5 w-5' />
                        </div>
                        <div>
                            <h1 className='text-foreground text-xl font-semibold'>
                                {t('account.apiKeys.oauth2.deviceEnterTitle')}
                            </h1>
                            <p className='text-muted-foreground mt-1 text-sm'>
                                {t('account.apiKeys.oauth2.deviceEnterDescription')}
                            </p>
                        </div>
                    </div>

                    {error ? (
                        <div className='rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200'>
                            {error}
                        </div>
                    ) : null}

                    <div className='space-y-2'>
                        <label className='text-muted-foreground text-sm' htmlFor='device-user-code'>
                            {t('account.apiKeys.oauth2.deviceUserCode')}
                        </label>
                        <Input
                            id='device-user-code'
                            value={userCode}
                            onChange={(e) => setUserCode(formatUserCodeInput(e.target.value))}
                            placeholder='ABCD-EFGH'
                            className='font-mono text-lg tracking-widest'
                            autoComplete='off'
                            spellCheck={false}
                        />
                    </div>

                    <div className='flex flex-wrap gap-3'>
                        <Button
                            disabled={claiming || userCode.replace(/-/g, '').length !== 8}
                            onClick={() => void claimCode(userCode)}
                        >
                            {t('account.apiKeys.oauth2.deviceContinue')}
                        </Button>
                        <Button variant='outline' onClick={() => router.push('/dashboard/account?tab=api-keys')}>
                            {t('account.apiKeys.oauth2.returnToApiKeys')}
                        </Button>
                    </div>
                </div>
            </div>
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
        </OAuthConsentShell>
    );
}
