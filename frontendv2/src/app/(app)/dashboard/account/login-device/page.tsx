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

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { authApi } from '@/lib/api/auth';
import {
    isQrChallengeGoneError,
    qrErrorMessage,
    QrApprovePrompt,
    QrResultScreen,
} from '@/components/auth/QrApprovePrompt';

type ChallengeDetails = {
    challenge_id: string;
    status: string;
    user_code?: string | null;
    desktop_ip?: string | null;
    desktop_ua?: string | null;
    expires_in?: number;
};

type Outcome = 'approved' | 'denied' | 'expired';

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

function LoginDeviceContent() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isSessionChecked, isLoading } = useSession();

    const initialCode = formatUserCodeInput(searchParams.get('user_code') || searchParams.get('code') || '');

    const [userCode, setUserCode] = useState(initialCode);
    const [claiming, setClaiming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<ChallengeDetails | null>(null);
    const [outcome, setOutcome] = useState<Outcome | null>(null);

    const markExpired = useCallback(() => {
        setPayload(null);
        setOutcome('expired');
        setSubmitting(false);
    }, []);

    const refreshChallenge = useCallback(async () => {
        if (!payload?.challenge_id || outcome) return;
        try {
            const response = await authApi.qrGet(payload.challenge_id);
            if (!response.success || !response.data) {
                markExpired();
                return;
            }
            setPayload(response.data as ChallengeDetails);
        } catch (err: unknown) {
            if (isQrChallengeGoneError(err)) {
                markExpired();
            }
        }
    }, [markExpired, outcome, payload?.challenge_id]);

    const claimCode = useCallback(
        async (code: string) => {
            const formatted = formatUserCodeInput(code);
            if (formatted.replace(/-/g, '').length !== 8) {
                setError(t('account.loginDevice.invalidCode'));
                return;
            }

            setClaiming(true);
            setError(null);
            setOutcome(null);
            try {
                const response = await authApi.qrGetByCode(formatted);
                if (!response.success || !response.data) {
                    throw new Error(response.message || t('account.loginDevice.lookupFailed'));
                }
                setPayload(response.data as ChallengeDetails);
            } catch (err: unknown) {
                if (axios.isAxiosError(err)) {
                    if (err.response?.status === 401 || err.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                        const redirect = `/dashboard/account/login-device?user_code=${encodeURIComponent(formatted)}`;
                        router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
                        return;
                    }
                    if (isQrChallengeGoneError(err)) {
                        setError(t('auth.qr.expiredDescription'));
                    } else {
                        setError(err.response?.data?.message || t('account.loginDevice.lookupFailed'));
                    }
                } else {
                    setError(err instanceof Error ? err.message : t('account.loginDevice.lookupFailed'));
                }
                setPayload(null);
            } finally {
                setClaiming(false);
            }
        },
        [router, t],
    );

    useEffect(() => {
        if (!isSessionChecked || isLoading) return;
        if (!user) {
            const redirect = initialCode
                ? `/dashboard/account/login-device?user_code=${encodeURIComponent(initialCode)}`
                : '/dashboard/account/login-device';
            router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
            return;
        }
        if (initialCode.replace(/-/g, '').length === 8 && !payload && !claiming && !error && !outcome) {
            void claimCode(initialCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-claim once from URL
    }, [isSessionChecked, isLoading, user]);

    useEffect(() => {
        if (!payload || outcome) return;
        const id = window.setInterval(() => {
            void refreshChallenge();
        }, 4000);
        return () => window.clearInterval(id);
    }, [outcome, payload, refreshChallenge]);

    const handleApprove = async () => {
        if (!payload?.challenge_id || outcome === 'expired') return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await authApi.qrApprove(payload.challenge_id);
            if (!response.success) {
                if (
                    response.error_code === 'QR_CHALLENGE_EXPIRED' ||
                    response.error_code === 'QR_CHALLENGE_UNAVAILABLE'
                ) {
                    markExpired();
                    return;
                }
                throw new Error(response.message || t('account.loginDevice.actionFailed'));
            }
            setOutcome('approved');
        } catch (err: unknown) {
            if (isQrChallengeGoneError(err)) {
                markExpired();
                return;
            }
            setError(qrErrorMessage(err, t('account.loginDevice.actionFailed')));
            setSubmitting(false);
        }
    };

    const handleDeny = async () => {
        if (!payload?.challenge_id || outcome === 'expired') return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await authApi.qrDeny(payload.challenge_id);
            if (!response.success) {
                if (
                    response.error_code === 'QR_CHALLENGE_EXPIRED' ||
                    response.error_code === 'QR_CHALLENGE_UNAVAILABLE'
                ) {
                    markExpired();
                    return;
                }
                throw new Error(response.message || t('account.loginDevice.actionFailed'));
            }
            setOutcome('denied');
        } catch (err: unknown) {
            if (isQrChallengeGoneError(err)) {
                markExpired();
                return;
            }
            setError(qrErrorMessage(err, t('account.loginDevice.actionFailed')));
            setSubmitting(false);
        }
    };

    if (!isSessionChecked || isLoading) {
        return (
            <div className='text-muted-foreground flex items-center justify-center py-16 text-sm'>
                {t('common.loading')}
            </div>
        );
    }

    if (outcome === 'approved') {
        return (
            <QrResultScreen
                variant='approved'
                title={t('account.loginDevice.approvedTitle')}
                description={t('account.loginDevice.approvedDescription')}
                primaryLabel={t('account.loginDevice.goDashboard')}
                onPrimary={() => router.push('/dashboard')}
            />
        );
    }

    if (outcome === 'denied') {
        return (
            <QrResultScreen
                variant='denied'
                title={t('account.loginDevice.deniedTitle')}
                description={t('account.loginDevice.deniedDescription')}
                primaryLabel={t('account.loginDevice.goDashboard')}
                onPrimary={() => router.push('/dashboard')}
            />
        );
    }

    if (outcome === 'expired') {
        return (
            <QrResultScreen
                variant='expired'
                title={t('auth.qr.expiredTitle')}
                description={t('auth.qr.expiredDescription')}
                primaryLabel={t('account.loginDevice.enterNewCode')}
                onPrimary={() => {
                    setOutcome(null);
                    setPayload(null);
                    setError(null);
                    setUserCode('');
                }}
                secondaryLabel={t('account.loginDevice.goDashboard')}
                onSecondary={() => router.push('/dashboard')}
            />
        );
    }

    if (payload) {
        return (
            <div className='space-y-4'>
                <button
                    type='button'
                    onClick={() => {
                        setPayload(null);
                        setError(null);
                        setSubmitting(false);
                    }}
                    className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm'
                >
                    <ArrowLeft className='h-4 w-4' />
                    {t('common.back')}
                </button>
                <QrApprovePrompt
                    title={t('auth.qr.approveTitle')}
                    subtitle={t('auth.qr.approveSubtitle')}
                    userCode={payload.user_code || userCode}
                    desktopIp={payload.desktop_ip}
                    desktopUa={payload.desktop_ua}
                    accountName={user?.username}
                    accountAvatar={user?.avatar}
                    expiresIn={payload.expires_in}
                    onExpired={markExpired}
                    error={error}
                    submitting={submitting}
                    approveLabel={t('account.loginDevice.approve')}
                    denyLabel={t('account.loginDevice.deny')}
                    onApprove={() => void handleApprove()}
                    onDeny={() => void handleDeny()}
                />
            </div>
        );
    }

    return (
        <div className='animate-fade-in-up mx-auto max-w-sm space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))]'>
            <button
                type='button'
                onClick={() => router.push('/dashboard/account')}
                className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm'
            >
                <ArrowLeft className='h-4 w-4' />
                {t('account.loginDevice.backToAccount')}
            </button>

            <div className='space-y-2 text-center'>
                <div className='bg-primary/12 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-2xl'>
                    <Smartphone className='h-6 w-6' />
                </div>
                <h1 className='text-foreground text-2xl font-semibold tracking-tight'>
                    {t('account.loginDevice.title')}
                </h1>
                <p className='text-muted-foreground text-sm'>{t('account.loginDevice.subtitle')}</p>
            </div>

            <form
                className='border-border bg-card space-y-4 rounded-2xl border p-5 shadow-xl'
                onSubmit={(e) => {
                    e.preventDefault();
                    void claimCode(userCode);
                }}
            >
                <Input
                    label={t('account.loginDevice.codeLabel')}
                    value={userCode}
                    onChange={(e) => setUserCode(formatUserCodeInput(e.target.value))}
                    placeholder='XXXX-XXXX'
                    autoComplete='one-time-code'
                    inputMode='text'
                    className='text-center font-mono text-xl tracking-[0.2em]'
                    autoFocus
                />
                {error ? (
                    <p className='text-destructive text-center text-sm' role='alert'>
                        {error}
                    </p>
                ) : null}
                <Button type='submit' className='h-12 w-full' loading={claiming}>
                    {t('account.loginDevice.continue')}
                </Button>
            </form>
        </div>
    );
}

export default function LoginDevicePage() {
    return (
        <Suspense
            fallback={<div className='text-muted-foreground flex items-center justify-center py-16 text-sm'>…</div>}
        >
            <LoginDeviceContent />
        </Suspense>
    );
}
